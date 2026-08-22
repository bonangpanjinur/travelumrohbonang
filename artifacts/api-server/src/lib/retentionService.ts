import crypto from "node:crypto";
import { db, logRetentionPolicies, logRetentionRuns, retentionPurgeAudit, eq, and, lt, sql } from "@workspace/db";

const TABLES: Record<string, string> = {
  request: "request_log",
  application_error: "error_logs",
  security_audit: "audit_logs",
  proof_access: "pilgrim_doc_access_logs",
};

function tableFor(logType: string): string | null {
  return TABLES[logType] ?? null;
}

export async function runRetention(options: { dryRun: boolean; batchSize?: number; correlationId?: string }) {
  const batchSize = Math.min(Math.max(options.batchSize ?? 500, 1), 2000);
  const correlationId = options.correlationId ?? crypto.randomUUID();
  const policies = await db.select().from(logRetentionPolicies).where(eq(logRetentionPolicies.enabled, true));
  const results: Array<Record<string, unknown>> = [];

  for (const policy of policies) {
    const table = tableFor(policy.logType);
    if (!table) {
      results.push({ logType: policy.logType, supported: false, candidates: 0 });
      continue;
    }
    const cutoff = new Date(Date.now() - policy.retentionDays * 86_400_000);
    const countResult = await db.execute(sql.raw(`
      SELECT COUNT(*)::int AS candidates FROM ${table} l
      WHERE l.created_at < '${cutoff.toISOString()}'
        AND NOT EXISTS (
          SELECT 1 FROM log_retention_holds h
          WHERE h.status = 'active' AND h.log_type = '${policy.logType.replace(/'/g, "''")}'
            AND (h.entity_id IS NULL OR h.entity_id = l.id)
            AND (h.expires_at IS NULL OR h.expires_at > now())
        )
    `));
    const candidateCount = Number(((countResult as any).rows ?? countResult)[0]?.candidates ?? 0);
    if (options.dryRun || candidateCount === 0) {
      results.push({ logType: policy.logType, supported: true, retentionDays: policy.retentionDays, cutoff, candidates: candidateCount, deleted: 0 });
      continue;
    }

    const runId = crypto.randomUUID();
    const [run] = await db.insert(logRetentionRuns).values({
      id: runId,
      logType: policy.logType,
      policyVersion: policy.policyVersion,
      cutoffAt: cutoff,
      status: "running",
      correlationId,
      createdAt: new Date(),
    }).returning();

    try {
      const idsResult = await db.execute(sql.raw(`
        SELECT l.id FROM ${table} l
        WHERE l.created_at < '${cutoff.toISOString()}'
          AND NOT EXISTS (
            SELECT 1 FROM log_retention_holds h
            WHERE h.status = 'active' AND h.log_type = '${policy.logType.replace(/'/g, "''")}'
              AND (h.entity_id IS NULL OR h.entity_id = l.id)
              AND (h.expires_at IS NULL OR h.expires_at > now())
          )
        ORDER BY l.created_at ASC, l.id ASC
        LIMIT ${batchSize}
      `));
      const ids = (((idsResult as any).rows ?? idsResult) as Array<{ id: string }>).map((row) => row.id);
      let deleted = 0;
      if (ids.length) {
        const escapedIds = ids.map((id) => `'${String(id).replace(/'/g, "''")}'`).join(",");
        const deleteResult = await db.execute(sql.raw(`DELETE FROM ${table} WHERE id IN (${escapedIds}) RETURNING id`));
        deleted = (((deleteResult as any).rows ?? deleteResult) as unknown[]).length;
        await db.insert(retentionPurgeAudit).values({
          id: crypto.randomUUID(),
          runId,
          logType: policy.logType,
          rowCount: deleted,
          contentHash: crypto.createHash("sha256").update(ids.join("\n")).digest("hex"),
          executedBy: "system",
          correlationId,
          deletedAt: new Date(),
        });
      }
      await db.update(logRetentionRuns).set({
        status: "completed",
        finishedAt: new Date(),
        scannedCount: ids.length,
        deletedCount: deleted,
      }).where(eq(logRetentionRuns.id, runId));
      results.push({ logType: policy.logType, supported: true, retentionDays: policy.retentionDays, candidates: candidateCount, deleted, runId });
    } catch (error) {
      await db.update(logRetentionRuns).set({ status: "failed", finishedAt: new Date(), errorCount: 1, errorMessage: String((error as any)?.message ?? error).slice(0, 1000) }).where(eq(logRetentionRuns.id, runId));
      throw error;
    }
  }
  return { dryRun: options.dryRun, correlationId, results };
}

import { Router } from "express";
import { db, auditLogs, errorLogs, logRetentionPolicies, desc, eq, and, or, ilike, gte, lte, sql } from "@workspace/db";
import { FULL_ADMIN_ROLES } from "../../lib/roleConstants";
import diagLogsRouter from "./diagLogs";

const router = Router();

router.use("/", diagLogsRouter);

// Both log tables can grow unbounded; always cap the result set so the admin
// panel never triggers an unbounded table scan / multi-MB response.
const DEFAULT_LOG_LIMIT = 200;
const MAX_LOG_LIMIT = 1000;

function parseLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LOG_LIMIT;
  return Math.min(Math.floor(n), MAX_LOG_LIMIT);
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function userLogFilter(req: import("express").Request, column: any) {
  const user = (req as any).user as { id?: string; role?: string } | undefined;
  if (user?.role && FULL_ADMIN_ROLES.has(user.role)) return undefined;
  return user?.id ? eq(column, user.id) : eq(column, "__unauthenticated__");
}

const RETENTION_TABLES: Record<string, string> = {
  request: "request_log",
  application_error: "error_logs",
  security_audit: "audit_logs",
  proof_access: "pilgrim_doc_access_logs",
};

router.post("/retention/dry-run", async (req, res) => {
  const role = (req.user as any)?.role;
  if (role !== "super_admin") return res.status(403).json({ error: "Retention dry-run membutuhkan Super Admin" });
  try {
    const policies = await db.select().from(logRetentionPolicies).where(eq(logRetentionPolicies.enabled, true));
    const results = await Promise.all(policies.map(async (policy) => {
      const table = RETENTION_TABLES[policy.logType];
      if (!table) return { logType: policy.logType, retentionDays: policy.retentionDays, supported: false, candidates: 0 };
      const cutoff = new Date(Date.now() - policy.retentionDays * 86_400_000);
      const result = await db.execute(sql.raw(`
        SELECT COUNT(*)::int AS candidates
        FROM ${table} l
        WHERE l.created_at < '${cutoff.toISOString()}'
          AND NOT EXISTS (
            SELECT 1 FROM log_retention_holds h
            WHERE h.status = 'active'
              AND h.log_type = '${policy.logType.replace(/'/g, "''")}'
              AND (h.entity_id IS NULL OR h.entity_id = l.id)
              AND (h.expires_at IS NULL OR h.expires_at > now())
          )
      `));
      const rows = (result as any).rows ?? result;
      return { logType: policy.logType, retentionDays: policy.retentionDays, cutoff, supported: true, candidates: Number(rows[0]?.candidates ?? 0) };
    }));
    res.json({ ok: true, dryRun: true, correlationId: (req as any).correlationId ?? null, results });
  } catch (err) {
    res.status(500).json({ error: "Retention dry-run gagal", correlationId: (req as any).correlationId ?? null });
  }
});

router.get("/audit", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const conditions: any[] = [];
    const scope = userLogFilter(req, auditLogs.userId);
    if (scope) conditions.push(scope);
    if (typeof req.query.action === "string" && req.query.action.trim()) conditions.push(eq(auditLogs.action, req.query.action.trim()));
    if (typeof req.query.q === "string" && req.query.q.trim()) {
      const q = `%${req.query.q.trim()}%`;
      conditions.push(or(ilike(auditLogs.action, q), ilike(auditLogs.entityType, q), ilike(auditLogs.entityId, q)));
    }
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    if (from) conditions.push(gte(auditLogs.createdAt, from));
    if (to) conditions.push(lte(auditLogs.createdAt, to));
    const data = await db
      .select()
      .from(auditLogs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

router.get("/error", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const conditions: any[] = [];
    const scope = userLogFilter(req, errorLogs.userId);
    if (scope) conditions.push(scope);
    if (typeof req.query.level === "string" && req.query.level.trim()) conditions.push(eq(errorLogs.level, req.query.level.trim()));
    if (typeof req.query.q === "string" && req.query.q.trim()) {
      const q = `%${req.query.q.trim()}%`;
      conditions.push(or(ilike(errorLogs.message, q), ilike(errorLogs.url, q), ilike(errorLogs.level, q)));
    }
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    if (from) conditions.push(gte(errorLogs.createdAt, from));
    if (to) conditions.push(lte(errorLogs.createdAt, to));
    const data = await db
      .select()
      .from(errorLogs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(errorLogs.createdAt))
      .limit(limit)
      .offset(offset);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch error logs" });
  }
});

export default router;

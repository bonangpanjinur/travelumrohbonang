import type { Request } from "express";
import { auditLogs, db } from "@workspace/db";

export type SecurityAuditAction =
  | "admin.impersonation"
  | "admin.test_email"
  | "admin.test_whatsapp"
  | "admin.template_upgrade.submit"
  | "admin.template_upgrade.update";

function redactTarget(value: string): string {
  if (value.includes("@")) {
    const [local, domain] = value.split("@", 2);
    return `${(local?.slice(0, 1) ?? "*")}***@${domain ?? "***"}`;
  }
  const digits = value.replace(/\D/g, "");
  return digits.length > 4 ? `***${digits.slice(-4)}` : "***";
}

export async function logSecurityAudit(
  req: Request,
  action: SecurityAuditAction,
  result: "success" | "failure" | "blocked",
  options: {
    entityType?: string;
    entityId?: string | null;
    reason?: string;
    target?: string;
    provider?: string;
    metadata?: Record<string, unknown>;
  } = {},
): Promise<void> {
  const metadata = {
    ...Object.fromEntries(
      Object.entries({
        result,
        reason: options.reason,
        target: options.target ? redactTarget(options.target) : undefined,
        provider: options.provider,
        ip: req.ip,
      }).filter(([, value]) => value !== undefined && value !== null && value !== ""),
    ),
    ...(options.metadata ?? {}),
  };

  try {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: req.user?.id ?? null,
      action,
      entityType: options.entityType ?? "security_action",
      entityId: options.entityId ?? null,
      metadata,
      userAgent: req.get("user-agent")?.slice(0, 500) ?? null,
      createdAt: new Date(),
    });
  } catch (error) {
    // Security logging must never break the protected operation.
    console.error("[securityAudit] failed to persist event", { action, result, error });
  }
}

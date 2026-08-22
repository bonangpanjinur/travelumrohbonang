import { Router } from "express";
import { db, requestLog, errorLogs, auditLogs } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { getCorrelationId, sanitizeLogPayload } from "../middlewares/observability";

const router = Router();

function stringField(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.slice(0, max) : null;
}

router.post("/request", async (req, res) => {
  try {
    const body = sanitizeLogPayload(req.body) as Record<string, unknown>;
    await db.insert(requestLog).values({
      id: crypto.randomUUID(),
      endpoint: stringField(body.endpoint, 500) ?? "unknown",
      userId: stringField(body.userId, 160),
      ip: req.ip,
      createdAt: new Date(),
    });
    res.json({ success: true, correlationId: getCorrelationId(req) });
  } catch {
    res.status(500).json({ error: "Failed to log request", correlationId: getCorrelationId(req) });
  }
});

router.post("/error", async (req, res) => {
  try {
    const body = sanitizeLogPayload(req.body) as Record<string, unknown>;
    await db.insert(errorLogs).values({
      id: crypto.randomUUID(),
      userId: stringField(body.userId, 160),
      level: stringField(body.level, 32) ?? "error",
      message: stringField(body.message, 2000) ?? "Client error",
      stack: stringField(body.stack, 8000),
      url: stringField(body.url, 1000),
      userAgent: req.get("user-agent")?.slice(0, 500) ?? null,
      context: body.context && typeof body.context === "object" ? body.context : null,
      createdAt: new Date(),
    });
    res.json({ success: true, correlationId: getCorrelationId(req) });
  } catch {
    res.status(500).json({ error: "Failed to log error", correlationId: getCorrelationId(req) });
  }
});

router.post("/audit", requireAuth, async (req, res) => {
  try {
    const body = sanitizeLogPayload(req.body) as Record<string, unknown>;
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: req.user?.id ?? null,
      action: stringField(body.action, 160) ?? "unknown_action",
      entityType: stringField(body.entityType, 100),
      entityId: stringField(body.entityId, 160),
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : null,
      userAgent: req.get("user-agent")?.slice(0, 500) ?? null,
      createdAt: new Date(),
    });
    res.json({ success: true, correlationId: getCorrelationId(req) });
  } catch {
    res.status(500).json({ error: "Failed to log audit", correlationId: getCorrelationId(req) });
  }
});

export default router;

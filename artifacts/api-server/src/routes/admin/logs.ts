import { Router } from "express";
import { db, auditLogs, errorLogs, desc, eq } from "@workspace/db";
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

function userLogFilter(req: import("express").Request, column: any) {
  const user = (req as any).user as { id?: string; role?: string } | undefined;
  if (user?.role && FULL_ADMIN_ROLES.has(user.role)) return undefined;
  return user?.id ? eq(column, user.id) : eq(column, "__unauthenticated__");
}

router.get("/audit", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const scope = userLogFilter(req, auditLogs.userId);
    const data = await db
      .select()
      .from(auditLogs)
      .where(scope)
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
    const scope = userLogFilter(req, errorLogs.userId);
    const data = await db
      .select()
      .from(errorLogs)
      .where(scope)
      .orderBy(desc(errorLogs.createdAt))
      .limit(limit)
      .offset(offset);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch error logs" });
  }
});

export default router;

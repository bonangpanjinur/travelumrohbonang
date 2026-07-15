/**
 * TEMPORARY DIAGNOSTIC LOGGING — added solely to trace the exact point where
 * the GET /api/admin/menu-permissions/my request path produces a 500 in
 * production (Vercel). Does NOT alter any request/response behavior — it
 * only prints observations.
 *
 * Safe to delete this file and all its call sites (search for "TEMP DIAG")
 * once the root cause is confirmed from the logs.
 */
import type { Request } from "express";

export function logDiag(point: string, req: Request): void {
  const user = (req as any).user;
  console.log("[TEMP DIAG]", {
    point,
    method: req.method,
    originalUrl: req.originalUrl,
    ip: req.ip,
    xForwardedFor: req.headers["x-forwarded-for"],
    userId: user?.id,
    userRole: user?.role,
  });
}

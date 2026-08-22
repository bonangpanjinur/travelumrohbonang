import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { logSecurityAudit, type SecurityAuditAction } from "../lib/securityAudit";

const isDev = process.env.NODE_ENV === "development";

export function sensitiveActionLimiter(action: SecurityAuditAction, limit: number) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => isDev,
    keyGenerator: (req) => `${req.user?.id ?? "anonymous"}:${ipKeyGenerator(req.ip ?? "unknown", 64)}`,
    handler: (req, res) => {
      void logSecurityAudit(req, action, "blocked", { reason: "rate_limit" });
      res.status(429).json({ error: "Terlalu banyak percobaan. Silakan coba lagi nanti." });
    },
  });
}

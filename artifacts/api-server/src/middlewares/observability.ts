import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const SECRET_KEYS = new Set([
  "authorization", "cookie", "set-cookie", "password", "passwd", "token",
  "access_token", "refresh_token", "secret", "otp", "otp_secret",
  "service_role_key", "supabase_service_role_key", "api_key", "apikey",
]);

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1));
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && value.length > 2000) return `${value.slice(0, 2000)}…[truncated]`;
    return value;
  }
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEYS.has(key.toLowerCase()) || /pass(word)?|secret|token|cookie|authorization|api[-_]?key/i.test(key)) {
      result[key] = "[redacted]";
    } else {
      result[key] = sanitizeValue(child, depth + 1);
    }
  }
  return result;
}

export function sanitizeLogPayload(value: unknown): unknown {
  return sanitizeValue(value);
}

export function getCorrelationId(req: Request): string {
  const current = (req as Request & { correlationId?: string }).correlationId;
  return current ?? "unknown";
}

export function observabilityMiddleware(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.header("x-correlation-id") || req.header("x-request-id");
  const correlationId = inbound && /^[A-Za-z0-9._:-]{8,128}$/.test(inbound)
    ? inbound
    : crypto.randomUUID();
  (req as Request & { correlationId?: string }).correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId);
  next();
}

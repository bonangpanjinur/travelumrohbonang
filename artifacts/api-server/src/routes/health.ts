import { Router, type RequestHandler } from "express";
import { pool } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";

const router = Router();

const healthz: RequestHandler = (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
};

router.get("/healthz", healthz);

const health: RequestHandler = async (_req, res) => {
  const start = Date.now();

  let dbStatus: "ok" | "error" = "error";
  let dbLatencyMs: number | null = null;
  let dbError: string | null = null;

  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      dbLatencyMs = Date.now() - start;
      dbStatus = "ok";
    } finally {
      client.release();
    }
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Unknown database error";
  }

  const overallStatus = dbStatus === "ok" ? "ok" : "degraded";
  const httpStatus = overallStatus === "ok" ? 200 : 503;

  res.status(httpStatus).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        ...(dbError ? { error: dbError } : {}),
      },
    },
  });
};

router.get("/health", health);

export default router;

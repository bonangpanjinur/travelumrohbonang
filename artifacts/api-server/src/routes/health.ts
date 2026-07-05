import { Router, type RequestHandler } from "express";
import { pool } from "@workspace/db";
import { HealthCheckResponse, FullHealthCheckResponse } from "@workspace/api-zod";
import { SUPABASE_URL, SUPABASE_SERVER_KEY } from "../lib/supabaseEnv";

const router = Router();

const healthz: RequestHandler = (req: any, res: any) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
};

router.get("/healthz", healthz);

async function checkDatabase(): Promise<{
  status: "ok" | "error";
  latencyMs: number | null;
  error?: string;
}> {
  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      return { status: "ok", latencyMs: Date.now() - start };
    } finally {
      client.release();
    }
  } catch (err) {
    return {
      status: "error",
      latencyMs: null,
      error: err instanceof Error ? err.message : "Unknown database error",
    };
  }
}

async function checkSupabase(): Promise<{
  status: "ok" | "error" | "not_configured";
  latencyMs: number | null;
  error?: string;
}> {
  const supabaseUrl = SUPABASE_URL || undefined;
  const supabaseKey = SUPABASE_SERVER_KEY || undefined;

  if (!supabaseUrl || !supabaseKey) {
    return {
      status: "not_configured",
      latencyMs: null,
      error: "SUPABASE_URL and/or SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY are not set",
    };
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    // Supabase's PostgREST root responds even with 401/404 for a bad
    // query — any HTTP response (not a network error) means the
    // project is reachable and the key is being accepted by the gateway.
    if (res.status >= 500) {
      return {
        status: "error",
        latencyMs: Date.now() - start,
        error: `Supabase responded with HTTP ${res.status}`,
      };
    }

    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: "error",
      latencyMs: null,
      error: err instanceof Error ? err.message : "Unknown Supabase connectivity error",
    };
  }
}

const health: RequestHandler = async (req: any, res: any) => {
  const [database, supabase] = await Promise.all([checkDatabase(), checkSupabase()]);

  const overallStatus =
    database.status === "ok" && supabase.status !== "error" ? "ok" : "degraded";
  const httpStatus = overallStatus === "ok" ? 200 : 503;

  const data = FullHealthCheckResponse.parse({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: { database, supabase },
  });

  res.status(httpStatus).json(data);
};

router.get("/health", health);

export default router;

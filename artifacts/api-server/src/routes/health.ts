import { Router, type RequestHandler } from "express";
import { pool } from "@workspace/db";
import { HealthCheckResponse, FullHealthCheckResponse } from "@workspace/api-zod";
import {
  SUPABASE_URL,
  SUPABASE_SERVER_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY,
} from "../lib/supabaseEnv";

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

// ── GET /health/detail ─────────────────────────────────────────────────────
// Extended diagnostic endpoint. Checks every layer that caused the
// refresh-token-400 / auth-500 / notifications-500 incident:
//   1. Environment variables (which critical keys are set/missing)
//   2. Replit Postgres connectivity + latency
//   3. Critical table existence (user_roles, notifications)
//   4. Supabase PostgREST reachability
//   5. Supabase Auth service reachability (the layer refresh_token hits)

async function checkEnvVars(): Promise<{
  status: "ok" | "warning";
  vars: Record<string, "set" | "missing">;
  warnings: string[];
}> {
  const required: Record<string, string | undefined> = {
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY,
  };
  const optional: Record<string, string | undefined> = {
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    NODE_ENV: process.env.NODE_ENV,
  };

  const vars: Record<string, "set" | "missing"> = {};
  const warnings: string[] = [];

  for (const [key, val] of Object.entries(required)) {
    vars[key] = val ? "set" : "missing";
    if (!val) warnings.push(`${key} is missing — this will cause auth/role lookup failures`);
  }
  for (const [key, val] of Object.entries(optional)) {
    vars[key] = val ? "set" : "missing";
  }

  return { status: warnings.length === 0 ? "ok" : "warning", vars, warnings };
}

async function checkCriticalTables(): Promise<{
  status: "ok" | "error";
  tables: Record<string, "exists" | "missing">;
  error?: string;
}> {
  const criticalTables = ["user_roles", "notifications", "profiles", "bookings"];
  const tables: Record<string, "exists" | "missing"> = {};

  try {
    const client = await pool.connect();
    try {
      const res = await client.query<{ tablename: string }>(
        `SELECT tablename FROM pg_tables
         WHERE schemaname = 'public'
           AND tablename = ANY($1)`,
        [criticalTables],
      );
      const found = new Set(res.rows.map((r) => r.tablename));
      for (const t of criticalTables) {
        tables[t] = found.has(t) ? "exists" : "missing";
      }
      const missing = criticalTables.filter((t) => !found.has(t));
      if (missing.length > 0) {
        return {
          status: "error",
          tables,
          error: `Tables missing (run db:push): ${missing.join(", ")}`,
        };
      }
      return { status: "ok", tables };
    } finally {
      client.release();
    }
  } catch (err) {
    return {
      status: "error",
      tables,
      error: err instanceof Error ? err.message : "Table check failed",
    };
  }
}

async function checkSupabaseAuth(): Promise<{
  status: "ok" | "error" | "not_configured";
  latencyMs: number | null;
  httpStatus?: number;
  error?: string;
}> {
  if (!SUPABASE_URL) {
    return { status: "not_configured", latencyMs: null, error: "SUPABASE_URL not set" };
  }

  const start = Date.now();
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      signal: AbortSignal.timeout(5_000),
      headers: { apikey: SUPABASE_ANON_KEY },
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return {
        status: "error",
        latencyMs,
        httpStatus: res.status,
        error: `Supabase Auth responded HTTP ${res.status}`,
      };
    }
    return { status: "ok", latencyMs, httpStatus: res.status };
  } catch (err) {
    return {
      status: "error",
      latencyMs: null,
      error: err instanceof Error ? err.message : "Supabase Auth unreachable",
    };
  }
}

const healthDetail: RequestHandler = async (_req, res) => {
  const [envVars, database, tables, supabasePostgrest, supabaseAuth] = await Promise.all([
    checkEnvVars(),
    checkDatabase(),
    checkCriticalTables(),
    checkSupabase(),
    checkSupabaseAuth(),
  ]);

  const allOk =
    envVars.status === "ok" &&
    database.status === "ok" &&
    tables.status === "ok" &&
    supabasePostgrest.status !== "error" &&
    supabaseAuth.status !== "error";

  const overallStatus = allOk ? "ok" : "degraded";

  res.status(allOk ? 200 : 503).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks: {
      envVars,
      database,
      tables,
      supabasePostgrest,
      supabaseAuth,
    },
  });
};

router.get("/health/detail", healthDetail);

export default router;

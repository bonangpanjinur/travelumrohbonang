import { Router, type RequestHandler } from "express";
import { pool } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";
import {
  SUPABASE_URL,
  SUPABASE_SERVER_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY,
} from "../lib/supabaseEnv";

/**
 * Decodes the configured SUPABASE_SERVICE_ROLE_KEY's JWT claims WITHOUT
 * verifying the signature — purely to prove which role/project the key
 * actually carries. Exposed here (not just startup logs) because Vercel
 * cold-start logs are easy to miss; this makes the proof available on
 * every /health/detail call. Never returns the raw key.
 */
function inspectServiceRoleKey(): {
  present: boolean;
  length: number;
  prefix: string | null;
  decoded: { role?: string; ref?: string; exp?: string } | null;
  decodeError: string | null;
} {
  const key = SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    return { present: false, length: 0, prefix: null, decoded: null, decodeError: "SUPABASE_SERVICE_ROLE_KEY is not set" };
  }
  const parts = key.split(".");
  if (parts.length !== 3) {
    return {
      present: true,
      length: key.length,
      prefix: key.slice(0, 8),
      decoded: null,
      decodeError: "Not a valid JWT structure (expected 3 dot-separated segments) — key may be truncated or wrong value pasted",
    };
  }
  try {
    const payloadJson = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const payload = JSON.parse(payloadJson);
    return {
      present: true,
      length: key.length,
      prefix: key.slice(0, 8),
      decoded: {
        role: payload.role,
        ref: payload.ref,
        exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : undefined,
      },
      decodeError: null,
    };
  } catch (err) {
    return {
      present: true,
      length: key.length,
      prefix: key.slice(0, 8),
      decoded: null,
      decodeError: err instanceof Error ? err.message : "base64/JSON decode failed",
    };
  }
}

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

const health: RequestHandler = async (_req, res: any) => {
  const [database, supabase] = await Promise.all([checkDatabase(), checkSupabase()]);

  const dbOk      = database.status === "ok";
  const supabaseOk = supabase.status !== "error";
  const allOk     = dbOk && supabaseOk;

  const httpStatus = allOk ? 200 : 503;

  if (allOk) {
    // Simple format requested by the client
    res.status(200).json({
      status:   "ok",
      database: "connected",
      server:   "running",
    });
  } else {
    // Surface the first failure reason
    const reason = !dbOk
      ? (database.error ?? "Database unreachable")
      : (supabase.error ?? "Supabase unreachable");

    res.status(httpStatus).json({
      status:   "error",
      database: dbOk ? "connected" : "failed",
      server:   "running",
      reason,
    });
  }
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
      const found = new Set(res.rows.map((r: { tablename: string }) => r.tablename));
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

  const serviceRoleKey = inspectServiceRoleKey();
  const keyLooksOk =
    serviceRoleKey.present &&
    !serviceRoleKey.decodeError &&
    serviceRoleKey.decoded?.role === "service_role";

  const allOk =
    envVars.status === "ok" &&
    database.status === "ok" &&
    tables.status === "ok" &&
    supabasePostgrest.status !== "error" &&
    supabaseAuth.status !== "error" &&
    keyLooksOk;

  const overallStatus = allOk ? "ok" : "degraded";

  res.status(allOk ? 200 : 503).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    nodeEnv: process.env.NODE_ENV ?? "development",
    uptimeSeconds: process.uptime(),
    isVercel: process.env.VERCEL === "1",
    allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean),
    checks: {
      envVars,
      database,
      tables,
      supabasePostgrest,
      supabaseAuth,
      serviceRoleKey: {
        ...serviceRoleKey,
        status: keyLooksOk ? "ok" : serviceRoleKey.present ? "wrong_role_or_malformed" : "missing",
      },
    },
  });
};

// Restricted: returns 404 in production to avoid exposing infra metadata publicly.
router.get("/health/detail", (req, res, next) => {
  if (process.env["NODE_ENV"] === "production") return res.status(404).json({ error: "Not found" });
  return next();
}, healthDetail);

// ── GET /health/schema ──────────────────────────────────────────────────────
// Checks every table defined in the Drizzle schema against what actually
// exists in the connected PostgreSQL database. Useful for diagnosing
// "menu fails to load" issues caused by missing tables after a fresh
// Supabase project setup.
//
// Also verifies:
//   - custom_access_token_hook function (JWT role embedding)
//   - Key columns in tables known to have schema drift

const DRIZZLE_TABLES = [
  "advantages",
  "affiliate_clicks",
  "agent_commissions",
  "agents",
  "agent_withdrawals",
  "airlines",
  "airports",
  "audit_logs",
  "blog_posts",
  "booking_payments",
  "booking_pilgrims",
  "booking_rooms",
  "bookings",
  "branches",
  "chat_messages",
  "contracts",
  "coupons",
  "currencies",
  "departure_gallery",
  "departure_prices",
  "error_logs",
  "faqs",
  "financial_transactions",
  "floating_buttons",
  "gallery",
  "guide_steps",
  "hotels",
  "integration_secrets",
  "itineraries",
  "itinerary_days",
  "lead_follow_ups",
  "leads",
  "loyalty_balances",
  "loyalty_points",
  "manasik_materials",
  "muthawifs",
  "navigation_items",
  "notifications",
  "package_categories",
  "package_commissions",
  "package_costs",
  "package_departures",
  "package_hotels",
  "package_reviews",
  "packages",
  "pages",
  "payment_gateway_transactions",
  "payment_proof_access_logs",
  "payments",
  "pilgrim_doc_access_logs",
  "pilgrim_documents",
  "pilgrim_testimonials",
  "profiles",
  "refund_requests",
  "request_log",
  "role_menu_permissions",
  "seo_overrides",
  "services",
  "site_settings",
  "slug_redirects",
  "template_upgrade_orders",
  "tenant_site_packages",
  "tenant_sites",
  "testimonials",
  "user_roles",
  "wishlists",
] as const;

// Critical columns that are known to sometimes be missing in existing tables
const CRITICAL_COLUMNS: Record<string, string[]> = {
  payment_gateway_transactions: [
    "order_id",
    "gateway",
    "gateway_transaction_id",
    "payment_method",
    "bank_code",
    "va_number",
    "customer_name",
    "customer_email",
    "raw_response",
  ],
  bookings: ["agent_id", "pic_id", "pic_type", "payment_scheme"],
  packages: ["minimum_dp"],
  package_departures: ["hotel_makkah_id", "hotel_madinah_id"],
  profiles: ["phone", "avatar_url", "branch_id", "totp_enabled"],
  contracts: ["html_content", "signature_data_url", "signed_at"],
  refund_requests: ["admin_notes", "processed_by", "bank_name", "bank_account"],
  payments: ["payment_type", "proof_url"],
};

type TableStatus = "exists" | "missing";
type ColumnStatus = "exists" | "missing";

interface SchemaHealthResult {
  status: "ok" | "degraded" | "error";
  summary: {
    total_expected: number;
    existing: number;
    missing: number;
    migration_needed: boolean;
    jwt_hook_installed: boolean;
  };
  tables: {
    existing: string[];
    missing: string[];
  };
  column_drift: Record<string, Record<string, ColumnStatus>>;
  jwt_hook: {
    function_exists: boolean;
    grant_ok: boolean | null;
  };
  migration_sql_path: string;
  error?: string;
}

async function checkSchemaHealth(): Promise<SchemaHealthResult> {
  let client;
  try {
    client = await pool.connect();

    // 1. Check which tables exist
    const tableRes = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public'
         AND tablename = ANY($1)`,
      [DRIZZLE_TABLES as unknown as string[]],
    );
    const existingSet = new Set(tableRes.rows.map((r: { tablename: string }) => r.tablename));
    const existingTables = DRIZZLE_TABLES.filter((t) => existingSet.has(t));
    const missingTables = DRIZZLE_TABLES.filter((t) => !existingSet.has(t));

    // 2. Check critical columns in existing tables
    const columnDrift: Record<string, Record<string, ColumnStatus>> = {};
    const tablesToCheck = Object.keys(CRITICAL_COLUMNS).filter((t) => existingSet.has(t));

    if (tablesToCheck.length > 0) {
      const colRes = await client.query<{ table_name: string; column_name: string }>(
        `SELECT table_name, column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = ANY($1)`,
        [tablesToCheck],
      );
      const colMap: Record<string, Set<string>> = {};
      for (const row of colRes.rows) {
        if (!colMap[row.table_name]) colMap[row.table_name] = new Set();
        colMap[row.table_name].add(row.column_name);
      }
      for (const [table, cols] of Object.entries(CRITICAL_COLUMNS)) {
        if (!existingSet.has(table)) continue;
        columnDrift[table] = {};
        for (const col of cols) {
          columnDrift[table][col] = colMap[table]?.has(col) ? "exists" : "missing";
        }
      }
    }

    // 3. Check JWT hook function
    const hookRes = await client.query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND p.proname = 'custom_access_token_hook'
       ) AS exists`,
    );
    const hookExists = hookRes.rows[0]?.exists ?? false;

    // 4. Check grant to supabase_auth_admin
    let grantOk: boolean | null = null;
    if (hookExists) {
      try {
        const grantRes = await client.query<{ has_priv: boolean }>(
          `SELECT has_function_privilege('supabase_auth_admin',
             'public.custom_access_token_hook(jsonb)', 'EXECUTE') AS has_priv`,
        );
        grantOk = grantRes.rows[0]?.has_priv ?? false;
      } catch {
        grantOk = null; // role may not exist in non-Supabase DBs
      }
    }

    const anyColumnMissing = Object.values(columnDrift).some((cols) =>
      Object.values(cols).some((s) => s === "missing"),
    );
    const migrationNeeded = missingTables.length > 0 || anyColumnMissing;
    const overallOk = missingTables.length === 0 && !anyColumnMissing && hookExists;

    return {
      status: overallOk ? "ok" : migrationNeeded ? "degraded" : "ok",
      summary: {
        total_expected: DRIZZLE_TABLES.length,
        existing: existingTables.length,
        missing: missingTables.length,
        migration_needed: migrationNeeded,
        jwt_hook_installed: hookExists,
      },
      tables: {
        existing: existingTables,
        missing: missingTables,
      },
      column_drift: columnDrift,
      jwt_hook: {
        function_exists: hookExists,
        grant_ok: grantOk,
      },
      migration_sql_path: "sql/migrations/fix_all_tables.sql",
    };
  } catch (err) {
    return {
      status: "error",
      summary: {
        total_expected: DRIZZLE_TABLES.length,
        existing: 0,
        missing: DRIZZLE_TABLES.length,
        migration_needed: true,
        jwt_hook_installed: false,
      },
      tables: { existing: [], missing: [...DRIZZLE_TABLES] },
      column_drift: {},
      jwt_hook: { function_exists: false, grant_ok: null },
      migration_sql_path: "sql/migrations/fix_all_tables.sql",
      error: err instanceof Error ? err.message : "Database unreachable",
    };
  } finally {
    client?.release();
  }
}

const healthSchema: RequestHandler = async (_req, res) => {
  const result = await checkSchemaHealth();
  const httpStatus = result.status === "ok" ? 200 : 503;
  res.status(httpStatus).json(result);
};

// Restricted: returns 404 in production to avoid exposing schema metadata publicly.
router.get("/health/schema", (req, res, next) => {
  if (process.env["NODE_ENV"] === "production") return res.status(404).json({ error: "Not found" });
  return next();
}, healthSchema);

export default router;

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn(
    "[db] WARNING: DATABASE_URL is not set. Database queries will fail at runtime. " +
    "Add DATABASE_URL to your environment variables.",
  );
}

const isSupabase = /supabase\.(com|co)/.test(process.env.DATABASE_URL ?? "");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://localhost/placeholder",
  // Supabase's pooler (PgBouncer, port 6543) presents a certificate chain that
  // Node's default trust store does not always validate, causing every query
  // to fail at the SSL handshake step in serverless environments (Vercel).
  // `rejectUnauthorized: false` still encrypts the connection, it just skips
  // strict CA verification — the standard approach for Supabase Postgres.
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  // Keep pool small for serverless (Vercel) environments.
  max: 3,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
});

// CRITICAL: pg.Pool emits 'error' on background client failures.
// Without this handler the event is unhandled → Node.js crashes the process.
// In serverless environments (Vercel) this causes FUNCTION_INVOCATION_FAILED
// for every request, even ones that never touch the DB.
pool.on("error", (err) => {
  // Log but never throw — a stale idle connection must not kill the server.
  console.error("[db] pool background error (ignored):", err.message);
});
export const db = drizzle(pool, { schema });

export * from "./schema";

export {
  eq,
  and,
  or,
  ne,
  gt,
  gte,
  lt,
  lte,
  is,
  isNull,
  isNotNull,
  inArray,
  notInArray,
  between,
  like,
  ilike,
  sql,
  asc,
  desc,
  count,
  countDistinct,
  sum,
  avg,
  max,
  min,
  not,
  exists,
  notExists,
  getTableColumns,
  aliasedTable,
} from "drizzle-orm";

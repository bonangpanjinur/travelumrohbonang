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
  ssl: isSupabase ? { rejectUnauthorized: true } : undefined,
  // Keep pool small for serverless (Vercel) environments.
  max: 3,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
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

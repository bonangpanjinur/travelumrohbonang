import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Please add DATABASE_URL to your environment variables.",
  );
}

const isSupabase = /supabase\.(com|co)/.test(process.env.DATABASE_URL ?? "");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSupabase ? { rejectUnauthorized: true } : undefined,
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

#!/usr/bin/env node
/**
 * Apply a single ad-hoc SQL file to the Supabase database.
 *
 * Usage:
 *   node scripts/apply-sql.mjs docs/sql/20260801_chat_rls_realtime.sql
 *
 * Requires SUPABASE_DATABASE_URL (pooler port 6543 is switched to direct 5432).
 * The SQL file must be idempotent — this script does not track history.
 */

import pg from "pg";
import fs from "fs";
import path from "path";

const { Client } = pg;

const file = process.argv[2];
if (!file) {
  console.error("❌  Usage: node scripts/apply-sql.mjs <path-to-sql-file>");
  process.exit(1);
}

const abs = path.resolve(process.cwd(), file);
if (!fs.existsSync(abs)) {
  console.error(`❌  File not found: ${abs}`);
  process.exit(1);
}

const url = process.env.SUPABASE_DATABASE_URL;
if (!url) {
  console.error("❌  SUPABASE_DATABASE_URL is not set.");
  process.exit(1);
}

let connStr = url;
try {
  const u = new URL(url);
  for (const key of ["sslmode", "uselibpqcompat", "pgbouncer"]) {
    u.searchParams.delete(key);
  }
  if (u.port === "6543") u.port = "5432";
  connStr = u.toString();
} catch {
  /* keep original */
}

const client = new Client({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
});

const sql = fs.readFileSync(abs, "utf8");

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  console.log(`✅  Applied ${path.basename(abs)}`);
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(`❌  Failed to apply ${path.basename(abs)}:`, err.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

#!/usr/bin/env node
/**
 * Apply SQL migrations in supabase/migrations/ to the Supabase database.
 * Uses SUPABASE_DATABASE_URL (switches pooler port 6543 → direct 5432).
 *
 * Usage:
 *   node scripts/apply-supabase-migrations.mjs
 *
 * Tracks applied migrations in a lightweight `_migration_history` table so
 * already-applied files are skipped on re-runs. Exits non-zero on failure.
 */

import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Client } = pg;

const url = process.env.SUPABASE_DATABASE_URL;
if (!url) {
  console.error("❌  SUPABASE_DATABASE_URL is not set.");
  process.exit(1);
}

// Normalise: strip pgBouncer params, switch pooler port 6543 → direct 5432
let connStr = url;
try {
  const u = new URL(url);
  for (const key of ["sslmode", "uselibpqcompat", "pgbouncer"]) {
    u.searchParams.delete(key);
  }
  if (u.port === "6543") u.port = "5432";
  connStr = u.toString();
} catch { /* keep original */ }

const client = new Client({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
});

const migrationsDir = path.resolve(
  fileURLToPath(import.meta.url),
  "../../supabase/migrations",
);

await client.connect();
console.log("✅  Connected to Supabase.\n");

// Ensure migration history table exists
await client.query(`
  CREATE TABLE IF NOT EXISTS _migration_history (
    filename   TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

// Fetch already-applied filenames
const { rows: applied } = await client.query(
  "SELECT filename FROM _migration_history"
);
const appliedSet = new Set(applied.map((r) => r.filename));

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const pending = files.filter((f) => !appliedSet.has(f));
console.log(
  `📂  ${files.length} total migration(s), ${pending.length} pending.\n`
);

if (pending.length === 0) {
  console.log("🎉  Nothing to apply — database is up to date.");
  await client.end();
  process.exit(0);
}

for (const file of pending) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query(
      "INSERT INTO _migration_history (filename) VALUES ($1)",
      [file]
    );
    await client.query("COMMIT");
    console.log(`✅  ${file}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`❌  ${file}: ${err.message}`);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log("\n🎉  Done.");

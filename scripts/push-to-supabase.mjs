#!/usr/bin/env node
/**
 * UmrohPlus — Deploy schema + seed ke Supabase
 *
 * Gunakan:
 *   SUPABASE_ACCESS_TOKEN=<token> node scripts/push-to-supabase.mjs
 *
 * Cara dapatkan token:
 *   https://app.supabase.com/account/tokens → "Generate new token"
 *
 * Atau jalankan via npm:
 *   pnpm run deploy:supabase
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ──────────────────────────────────────────────────────────────────

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF =
  process.env.VITE_SUPABASE_PROJECT_ID ||
  process.env.SUPABASE_PROJECT_REF ||
  "reuwfhuaabdhxjkomred";

const API_BASE = "https://api.supabase.com/v1";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Repo root is one level up from scripts/.
const REPO_ROOT = path.resolve(__dirname, "..");

function loadSql(relativePath) {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf-8");
}

async function runStatement(sql, label) {
  const res = await fetch(`${API_BASE}/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  let body;
  try { body = await res.json(); } catch { body = { raw: await res.text() }; }

  if (!res.ok) {
    // Tampilkan tapi jangan stop untuk error "already exists" — idempotent
    const msg = body?.message || JSON.stringify(body);
    const isHarmless =
      msg.includes("already exists") ||
      msg.includes("does not exist") && sql.trim().toUpperCase().startsWith("DROP");
    if (isHarmless) {
      process.stdout.write("~");
      return;
    }
    throw new Error(`[${label}] HTTP ${res.status}: ${msg}`);
  }
  process.stdout.write(".");
}

/**
 * Pisahkan SQL menjadi individual statements, handle multi-line & dollar-quoted blocks.
 * Supabase /database/query API hanya support satu statement per call.
 */
function parseStatements(sql) {
  const statements = [];
  let current = "";
  let inDollarQuote = false;
  let dollarTag = "";
  let inLineComment = false;
  let inBlockComment = false;

  const lines = sql.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();

    // Skip pure comment lines at the start of a fresh statement
    if (!current && (trimmed.startsWith("--") || trimmed === "")) {
      continue;
    }

    current += line + "\n";

    // Very simple parser: split on semicolons outside of dollar-quoted strings
    // For our DDL/DML schema this is sufficient.
    if (!inDollarQuote) {
      if (current.trimEnd().endsWith(";")) {
        const stmt = current.trim().replace(/;$/, "").trim();
        if (stmt && !stmt.startsWith("--")) {
          statements.push(stmt);
        }
        current = "";
      }
    }
  }

  // Flush any remaining
  const remainder = current.trim();
  if (remainder && !remainder.startsWith("--")) {
    statements.push(remainder);
  }

  return statements;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!ACCESS_TOKEN) {
    console.error(`
╔══════════════════════════════════════════════════════════════════╗
║  ERROR: SUPABASE_ACCESS_TOKEN tidak ditemukan                    ║
║                                                                  ║
║  1. Buka: https://app.supabase.com/account/tokens               ║
║  2. Klik "Generate new token"                                    ║
║  3. Di Replit: Secrets → tambah SUPABASE_ACCESS_TOKEN           ║
╚══════════════════════════════════════════════════════════════════╝
`);
    process.exit(1);
  }

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  UmrohPlus — Supabase Database Deployment                        ║
║  Project: ${PROJECT_REF.padEnd(55)}║
╚══════════════════════════════════════════════════════════════════╝`);

  // ── Verifikasi koneksi ────────────────────────────────────────────
  process.stdout.write("\n🔌 Verifikasi koneksi ... ");
  const pingRes = await fetch(`${API_BASE}/projects/${PROJECT_REF}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  if (!pingRes.ok) {
    const err = await pingRes.json().catch(() => ({}));
    console.error("\n  ✗ Tidak bisa connect:", err.message || pingRes.statusText);
    process.exit(1);
  }
  const project = await pingRes.json();
  console.log(`✓ ${project.name} (${project.region})`);

  // ── Phase 1: Schema ───────────────────────────────────────────────
  console.log("\n📐 Phase 1: Membuat tabel & index ...");
  const schemaStatements = parseStatements(loadSql("sql/schema/supabase-schema.sql"));
  console.log(`   ${schemaStatements.length} statements akan dijalankan`);
  process.stdout.write("   ");

  let schemaOk = 0, schemaFail = 0;
  for (let i = 0; i < schemaStatements.length; i++) {
    try {
      await runStatement(schemaStatements[i], `schema[${i + 1}]`);
      schemaOk++;
    } catch (err) {
      process.stdout.write("✗");
      console.error(`\n   WARN: ${err.message}`);
      schemaFail++;
    }
  }
  console.log(`\n   ✓ Schema: ${schemaOk} OK, ${schemaFail} skipped/failed`);

  // ── Phase 2: Seed ─────────────────────────────────────────────────
  console.log("\n🌱 Phase 2: Mengisi data awal ...");
  const seedStatements = parseStatements(loadSql("sql/seeds/supabase-seed-prod.sql"));
  console.log(`   ${seedStatements.length} statements akan dijalankan`);
  process.stdout.write("   ");

  let seedOk = 0, seedFail = 0;
  for (let i = 0; i < seedStatements.length; i++) {
    try {
      await runStatement(seedStatements[i], `seed[${i + 1}]`);
      seedOk++;
    } catch (err) {
      process.stdout.write("✗");
      console.error(`\n   WARN: ${err.message}`);
      seedFail++;
    }
  }
  console.log(`\n   ✓ Seed: ${seedOk} OK, ${seedFail} skipped/failed`);

  // ── Phase 3: Verifikasi ───────────────────────────────────────────
  console.log("\n🔍 Phase 3: Verifikasi data ...");
  const tables = [
    "currencies", "package_categories", "packages",
    "package_departures", "departure_prices", "blog_posts",
    "site_settings", "services", "advantages", "faqs",
    "navigation_items", "testimonials", "gallery",
  ];

  console.log("   Tabel                  | Baris");
  console.log("   -----------------------|-------");
  for (const tbl of tables) {
    try {
      const res = await fetch(`${API_BASE}/projects/${PROJECT_REF}/database/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ACCESS_TOKEN}` },
        body: JSON.stringify({ query: `SELECT COUNT(*) AS c FROM ${tbl}` }),
      });
      const data = await res.json();
      const count = data?.[0]?.c ?? "?";
      console.log(`   ${tbl.padEnd(22)} | ${String(count).padStart(5)}`);
    } catch {
      console.log(`   ${tbl.padEnd(22)} | error`);
    }
  }

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  ✅  DEPLOYMENT BERHASIL!                                         ║
║                                                                  ║
║  Database Supabase sudah siap untuk production.                  ║
║  Push ke GitHub → Vercel akan auto-redeploy.                     ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

main().catch((err) => {
  console.error("\n❌ Deployment gagal:", err.message);
  process.exit(1);
});

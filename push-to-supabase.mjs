#!/usr/bin/env node
/**
 * UmrohPlus — Deploy schema + seed ke Supabase
 *
 * Gunakan:
 *   SUPABASE_ACCESS_TOKEN=<token> node push-to-supabase.mjs
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

function loadSql(filename) {
  return readFileSync(path.join(__dirname, filename), "utf-8");
}

async function runQuery(label, sql) {
  console.log(`\n▶ ${label} ...`);

  const res = await fetch(`${API_BASE}/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  const body = await res.json().catch(() => ({ raw: await res.text() }));

  if (!res.ok) {
    console.error(`  ✗ HTTP ${res.status}:`, JSON.stringify(body, null, 2));
    throw new Error(`Query "${label}" gagal (HTTP ${res.status})`);
  }

  // Hitung berapa statement yang berhasil (endpoint mengembalikan array hasil)
  const count = Array.isArray(body) ? body.length : "?";
  console.log(`  ✓ Selesai — ${count} hasil dikembalikan`);
  return body;
}

/**
 * Pisahkan SQL menjadi chunk-chunk ≤ MAX_STATEMENTS statement,
 * sehingga tidak melebihi batas body API Supabase.
 */
function splitSql(sql, maxStatements = 50) {
  const statements = sql
    .split(/;[ \t]*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));
  const chunks = [];
  for (let i = 0; i < statements.length; i += maxStatements) {
    chunks.push(statements.slice(i, i + maxStatements).join(";\n") + ";");
  }
  return chunks;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Validasi prerequisite
  if (!ACCESS_TOKEN) {
    console.error(`
╔══════════════════════════════════════════════════════════════════╗
║  ERROR: SUPABASE_ACCESS_TOKEN tidak ditemukan                    ║
║                                                                  ║
║  1. Buka: https://app.supabase.com/account/tokens               ║
║  2. Klik "Generate new token"                                    ║
║  3. Di Replit: Secrets → tambah SUPABASE_ACCESS_TOKEN           ║
║     (BUKAN SUPABASE_SERVICE_ROLE_KEY — ini token berbeda)        ║
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
  console.log("\n🔌 Verifikasi koneksi ke Supabase Management API ...");
  const pingRes = await fetch(`${API_BASE}/projects/${PROJECT_REF}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  if (!pingRes.ok) {
    const err = await pingRes.json().catch(() => ({}));
    console.error("  ✗ Tidak bisa connect:", err.message || pingRes.statusText);
    console.error("  Pastikan ACCESS_TOKEN benar dan PROJECT_REF sesuai.");
    process.exit(1);
  }
  const project = await pingRes.json();
  console.log(`  ✓ Terhubung ke project: ${project.name} (${project.region})`);

  // ── Phase 1: Schema (DDL) ─────────────────────────────────────────
  console.log("\n📐 Phase 1: Membuat tabel & index ...");
  const schemaSql = loadSql("supabase-schema.sql");
  const schemaChunks = splitSql(schemaSql, 30);
  console.log(`   ${schemaChunks.length} chunk(s) akan dijalankan`);

  for (let i = 0; i < schemaChunks.length; i++) {
    await runQuery(`Schema chunk ${i + 1}/${schemaChunks.length}`, schemaChunks[i]);
  }
  console.log("  ✓ Schema selesai!");

  // ── Phase 2: Seed data ────────────────────────────────────────────
  console.log("\n🌱 Phase 2: Mengisi data awal ...");
  const seedSql = loadSql("supabase-seed.sql");
  const seedChunks = splitSql(seedSql, 20);
  console.log(`   ${seedChunks.length} chunk(s) akan dijalankan`);

  for (let i = 0; i < seedChunks.length; i++) {
    await runQuery(`Seed chunk ${i + 1}/${seedChunks.length}`, seedChunks[i]);
  }
  console.log("  ✓ Seed data selesai!");

  // ── Phase 3: Verifikasi jumlah data ───────────────────────────────
  console.log("\n🔍 Phase 3: Verifikasi data ...");
  const verifySql = `
    SELECT tabel, jumlah FROM (
      SELECT 'currencies'         AS tabel, COUNT(*) AS jumlah FROM currencies
      UNION ALL SELECT 'package_categories',  COUNT(*) FROM package_categories
      UNION ALL SELECT 'packages',            COUNT(*) FROM packages
      UNION ALL SELECT 'package_departures',  COUNT(*) FROM package_departures
      UNION ALL SELECT 'departure_prices',    COUNT(*) FROM departure_prices
      UNION ALL SELECT 'blog_posts',          COUNT(*) FROM blog_posts
      UNION ALL SELECT 'site_settings',       COUNT(*) FROM site_settings
      UNION ALL SELECT 'services',            COUNT(*) FROM services
      UNION ALL SELECT 'advantages',          COUNT(*) FROM advantages
      UNION ALL SELECT 'faqs',                COUNT(*) FROM faqs
      UNION ALL SELECT 'navigation_items',    COUNT(*) FROM navigation_items
      UNION ALL SELECT 'testimonials',        COUNT(*) FROM testimonials
      UNION ALL SELECT 'gallery',             COUNT(*) FROM gallery
    ) sub
    ORDER BY tabel;
  `;

  const verifyRes = await runQuery("Verifikasi jumlah baris", verifySql);
  if (Array.isArray(verifyRes) && verifyRes.length > 0) {
    console.log("\n  Tabel                  | Baris");
    console.log("  -----------------------|-------");
    for (const row of verifyRes) {
      const tbl = String(row.tabel ?? row[0]).padEnd(22);
      const cnt = String(row.jumlah ?? row[1]).padStart(6);
      console.log(`  ${tbl} | ${cnt}`);
    }
  }

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  ✅  DEPLOYMENT BERHASIL!                                         ║
║                                                                  ║
║  Database Supabase sudah siap untuk production.                  ║
║  Sekarang push ke GitHub → Vercel akan auto-redeploy.            ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

main().catch((err) => {
  console.error("\n❌ Deployment gagal:", err.message);
  process.exit(1);
});

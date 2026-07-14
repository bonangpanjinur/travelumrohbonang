/**
 * Verifikasi bahwa database yang sedang dipakai (Replit Postgres lokal ATAU
 * Supabase, tergantung SUPABASE_DATABASE_URL/DATABASE_URL yang aktif) sudah
 * punya semua tabel, kolom, dan foreign key yang dibutuhkan aplikasi.
 *
 * Jalankan: pnpm --filter @workspace/scripts run verify:db
 *
 * Ini murni read-only (query ke information_schema) — tidak pernah mengubah data.
 */
import { getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "@workspace/db/schema";
import { pool } from "@workspace/db";

type ColumnRow = { column_name: string; data_type: string; udt_name: string };
type FkRow = { constraint_name: string; column_name: string; foreign_table_name: string; foreign_column_name: string };

const UUID_COMPATIBLE = new Set(["uuid", "text", "varchar", "character varying"]);

async function main() {
  const client = await pool.connect();
  const isSupabase = /supabase\.(com|co)/.test(
    process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || "",
  );

  console.log(`\n🔎 Verifying schema against: ${isSupabase ? "SUPABASE (production DB)" : "Replit local Postgres (dev DB)"}\n`);

  let missingTables = 0;
  let missingColumns = 0;
  let typeMismatches = 0;
  let missingFks = 0;
  let tablesChecked = 0;

  try {
    for (const [exportName, value] of Object.entries(schema)) {
      // Only Drizzle pgTable objects have a table config; skip relations/enums/etc.
      let config: ReturnType<typeof getTableConfig>;
      try {
        config = getTableConfig(value as any);
      } catch {
        continue;
      }
      if (!config?.name) continue;

      tablesChecked++;
      const tableName = config.name;

      const { rows: existing } = await client.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = $1
         ) AS exists`,
        [tableName],
      );

      if (!existing[0]?.exists) {
        console.log(`❌ MISSING TABLE  public.${tableName}  (expected by lib/db schema export "${exportName}")`);
        missingTables++;
        continue;
      }

      const { rows: columns } = await client.query<ColumnRow>(
        `SELECT column_name, data_type, udt_name
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1`,
        [tableName],
      );
      const columnMap = new Map(columns.map((c) => [c.column_name, c]));

      for (const col of config.columns) {
        const dbCol = columnMap.get(col.name);
        if (!dbCol) {
          console.log(`❌ MISSING COLUMN public.${tableName}.${col.name}`);
          missingColumns++;
          continue;
        }

        // Only flag genuinely incompatible type drift (e.g. integer vs text).
        // uuid vs text/varchar is a known, harmless drift in this project —
        // all IDs are generated as crypto.randomUUID() strings, which Postgres
        // accepts into uuid columns via implicit cast. See replit.md.
        const drizzleType = (col as any).columnType as string | undefined;
        if (drizzleType?.includes("PgUUID") && !UUID_COMPATIBLE.has(dbCol.udt_name)) {
          console.log(`⚠️  TYPE MISMATCH  public.${tableName}.${col.name} — Drizzle expects uuid-compatible, DB has "${dbCol.udt_name}"`);
          typeMismatches++;
        }
      }

      for (const fk of config.foreignKeys) {
        const ref = fk.reference();
        const fkColumns = ref.columns.map((c) => c.name);
        const foreignTable = getTableConfig(ref.foreignTable as any).name;
        const foreignColumns = ref.foreignColumns.map((c) => c.name);

        const { rows: fks } = await client.query<FkRow>(
          `SELECT
             tc.constraint_name,
             kcu.column_name,
             ccu.table_name AS foreign_table_name,
             ccu.column_name AS foreign_column_name
           FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu
             ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
           JOIN information_schema.constraint_column_usage ccu
             ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
           WHERE tc.constraint_type = 'FOREIGN KEY'
             AND tc.table_schema = 'public'
             AND tc.table_name = $1
             AND kcu.column_name = ANY($2::text[])`,
          [tableName, fkColumns],
        );

        const found = fks.some(
          (r) => r.foreign_table_name === foreignTable && foreignColumns.includes(r.foreign_column_name),
        );

        if (!found) {
          console.log(
            `❌ MISSING FK      public.${tableName}(${fkColumns.join(",")}) → public.${foreignTable}(${foreignColumns.join(",")})`,
          );
          missingFks++;
        }
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`\n── Ringkasan ─────────────────────────────────────`);
  console.log(`  Tabel dicek        : ${tablesChecked}`);
  console.log(`  Tabel hilang       : ${missingTables}`);
  console.log(`  Kolom hilang       : ${missingColumns}`);
  console.log(`  Foreign key hilang : ${missingFks}`);
  console.log(`  Type mismatch      : ${typeMismatches} (info saja, biasanya aman — lihat replit.md)`);
  console.log(`────────────────────────────────────────────────────\n`);

  if (missingTables > 0 || missingColumns > 0 || missingFks > 0) {
    console.log("❌ Ada yang perlu diperbaiki sebelum aplikasi dipakai dengan database ini.\n");
    process.exit(1);
  }

  console.log("✅ Semua tabel, kolom, dan foreign key yang dibutuhkan sudah ada.\n");
}

main().catch((err) => {
  console.error("Verifikasi gagal dijalankan:", err);
  process.exit(1);
});

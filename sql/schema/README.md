# `sql/schema/` — Snapshot Schema Historis

Folder ini berisi **snapshot schema SQL historis** — bukan sumber kebenaran aktif.

| File | Keterangan |
|------|-----------|
| `supabase-schema.sql` | Generate dari Drizzle ORM, DDL murni (tanpa seed) |
| `supabase-deploy.sql` | DDL + seed gabungan, untuk deploy ke Supabase via SQL Editor |

> ⚠️ Kedua file berlabel **LEGACY / HISTORICAL SNAPSHOT** di header-nya.  
> Jangan edit atau jalankan ulang tanpa membaca catatan di dalamnya.

## Sumber Kebenaran Aktual

| Layer | Lokasi |
|-------|--------|
| **Struktur tabel** | `lib/db/src/schema/*.ts` (Drizzle ORM) |
| **Migration yang ter-apply** | `supabase/migrations/*.sql` (Supabase CLI) |
| **Ad-hoc patches** | `sql/migrations/*.sql` (dijalankan manual, riwayat) |
| **Seed data** | `sql/seeds/*.sql` |

## Alur yang Benar untuk Migration Baru

1. Edit schema di `lib/db/src/schema/`
2. Jalankan `pnpm --filter @workspace/db run push` (dev)  
   atau buat file baru di `supabase/migrations/` (production Supabase)
3. **Jangan** edit file di `sql/schema/` — biarkan sebagai arsip

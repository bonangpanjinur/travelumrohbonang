# `sql/` — Panduan Folder SQL Non-CLI

Folder ini menyimpan semua SQL yang **tidak** dikelola lewat Supabase CLI migration ledger (`/supabase/migrations/`). Isinya dibagi tiga:

| Sub-folder | Isi | Status |
|---|---|---|
| `schema/` | Snapshot DDL lengkap (`supabase-schema.sql`, `supabase-deploy.sql`) | **Bootstrap / disaster-recovery only** — bukan untuk sinkronisasi rutin |
| `migrations/` | Patch ad-hoc (FK, trigger, tabel baru, dll.) | **Riwayat** — sebagian besar sudah diterapkan manual ke DB production, disimpan sebagai audit trail |
| `seeds/` | Data awal/seed | `supabase-seed.sql` & `supabase-seed-prod.sql` aktif dipakai; sisanya sudah dihapus (lihat di bawah) |

## Sumber kebenaran yang sebenarnya

| Layer | Lokasi |
|---|---|
| **Struktur tabel** | `lib/db/src/schema/*.ts` (Drizzle ORM) |
| **RLS policy & function yang benar-benar ter-apply** | `supabase/migrations/*.sql` (Supabase CLI ledger, resmi & bertanggal) |
| **Patch ad-hoc historis** | `sql/migrations/*.sql` (manual, lihat catatan tanggal apply di header masing-masing file) |
| **Seed data** | `sql/seeds/*.sql` |

`sql/schema/supabase-schema.sql` dan `supabase-deploy.sql` **bukan "jangan pernah dijalankan"** — keduanya adalah cara tercepat membuat semua tabel dari nol di project Supabase yang benar-benar kosong (disaster recovery, atau setup project baru). Dipakai oleh `pnpm run deploy:supabase` (`scripts/push-to-supabase.mjs`). Yang **tidak boleh** dilakukan: menjalankannya sebagai pengganti `pnpm --filter @workspace/db run push` untuk sinkronisasi schema rutin — itu tugas Drizzle, bukan file ini.

## Alur yang benar untuk perubahan baru

- **Ubah struktur tabel** → edit `lib/db/src/schema/*.ts`, lalu `pnpm --filter @workspace/db run push` (dev) atau `push-force` (reset penuh).
- **Ubah RLS policy / Postgres function** → buat migration baru lewat Supabase CLI (`supabase migration new ...`), simpan di `supabase/migrations/`. Jangan taruh di `sql/migrations/`.
- **Patch darurat manual** (jarang, hanya kalau CLI tidak bisa dipakai) → boleh ditaruh di `sql/migrations/` dengan header yang jelas: kapan dijalankan, kenapa, dan status "sudah diterapkan ke production" atau belum.
- **Jangan edit** `sql/schema/*.sql` — biarkan sebagai arsip snapshot.

## Riwayat pembersihan

- **2026-07-13**: `sql/seeds/seed.sql` dan `sql/seeds/seed-demo.sql` dihapus — kedua file tidak lagi dirujuk oleh skrip atau dokumentasi manapun (sudah digantikan oleh `supabase-seed.sql`/`supabase-seed-prod.sql`).

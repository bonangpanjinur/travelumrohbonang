# `sql/` — Panduan Folder SQL

Sejak **2026-07-13**, `sql/` adalah satu-satunya lokasi SQL di proyek ini. Sebelumnya ada folder `supabase/migrations/` terpisah (format ledger Supabase CLI) — folder itu sudah dihapus dan isinya (3 migration RLS/security) dipindah ke `sql/migrations/` dengan nama file asli (timestamp) tetap dipertahankan.

> **Catatan penting**: `supabase/config.toml` yang dihapus tercatat `project_id = "snfjildozzqlyyabeyry"` — **berbeda** dari project Supabase yang benar-benar dipakai production (`yakjpqqobknrmhfmybhe`, terlihat dari domain `*.supabase.co` yang muncul di error browser). Supabase CLI juga tidak pernah terpasang sebagai dependency dan tidak dipanggil dari skrip manapun di repo ini — artinya folder itu tidak pernah benar-benar "linked" & dieksekusi lewat `supabase db push`. File-filenya sejauh ini kemungkinan besar diterapkan manual (copy-paste ke SQL Editor), sama seperti file di `sql/migrations/` lain. Ini alasan kenapa menggabungkan keduanya aman dan justru lebih jujur soal cara migrasi ini benar-benar dijalankan.

| Sub-folder | Isi | Status |
|---|---|---|
| `schema/` | Snapshot DDL lengkap (`supabase-schema.sql`, `supabase-deploy.sql`) | **Bootstrap / disaster-recovery only** — bukan untuk sinkronisasi rutin |
| `migrations/` | Semua patch SQL — FK, trigger, tabel baru, RLS policy, Postgres function | **Riwayat** — sebagian besar sudah diterapkan manual ke DB production, disimpan sebagai audit trail. 3 file bernama `<timestamp>_<uuid>.sql` adalah migrasi RLS/security yang dipindah dari bekas folder `supabase/migrations/`. |
| `seeds/` | Data awal/seed | `supabase-seed.sql` & `supabase-seed-prod.sql` aktif dipakai |

## Sumber kebenaran yang sebenarnya

| Layer | Lokasi |
|---|---|
| **Struktur tabel** | `lib/db/src/schema/*.ts` (Drizzle ORM) |
| **RLS policy, Postgres function, dan semua patch historis** | `sql/migrations/*.sql` (lihat catatan status apply di header masing-masing file) |
| **Seed data** | `sql/seeds/*.sql` |

`sql/schema/supabase-schema.sql` dan `supabase-deploy.sql` **bukan "jangan pernah dijalankan"** — keduanya adalah cara tercepat membuat semua tabel dari nol di project Supabase yang benar-benar kosong (disaster recovery, atau setup project baru). Dipakai oleh `pnpm run deploy:supabase` (`scripts/push-to-supabase.mjs`). Yang **tidak boleh** dilakukan: menjalankannya sebagai pengganti `pnpm --filter @workspace/db run push` untuk sinkronisasi schema rutin — itu tugas Drizzle, bukan file ini.

## Alur yang benar untuk perubahan baru

- **Ubah struktur tabel** → edit `lib/db/src/schema/*.ts`, lalu `pnpm --filter @workspace/db run push` (dev) atau `push-force` (reset penuh).
- **Ubah RLS policy / Postgres function / patch apa pun** → buat file baru di `sql/migrations/` dengan header yang jelas: kapan dijalankan, kenapa, dan status "sudah diterapkan ke production" atau belum. Jalankan manual lewat Supabase SQL Editor (proyek ini tidak memakai Supabase CLI).
- **Jangan edit** `sql/schema/*.sql` — biarkan sebagai arsip snapshot.

## Riwayat pembersihan

- **2026-07-13**: `sql/seeds/seed.sql` dan `sql/seeds/seed-demo.sql` dihapus — tidak lagi dirujuk skrip/dokumentasi manapun.
- **2026-07-13**: Folder `supabase/` (migration ledger CLI, tidak pernah benar-benar dipakai lewat CLI) dihapus; 3 file migration RLS/security-nya dipindah ke `sql/migrations/`.

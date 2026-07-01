---
name: Umroh Gateway refactor phases
description: Status tiap phase refactor — apa yang sudah selesai dan apa yang perlu dilakukan selanjutnya
---

## Phase 1 ✅ — SQL & Database folder
- Buat `database/{schema,migrations,patches,seed}/`
- Copy (BUKAN move) 59 migration files dari `.migration-backup/supabase/migrations/`
- Rename UUID → `YYYYMMDD_NNN_deskripsi.sql`
- Tulis `database/README.md`
- `PROJECT_ARCHITECTURE.md` dibuat (595 baris)

**Why:** User minta "jangan pindahkan file apapun" — semua SQL di database/ adalah SALINAN, originals tetap di .migration-backup/.

## Phase 2 ✅ — docs/ folder
- 8 file dokumentasi: Architecture.md, API.md, Database.md, Deployment.md, FolderStructure.md, CodingStandard.md, DevelopmentGuide.md, FeatureList.md
- api-server adalah Replit artifact (Express), bukan backend utama — Supabase yang handle semua CRUD bisnis

## Phase 3+ — Source code reorganization (belum dimulai)
- Target: `src/features/` + `src/shared/` (lihat docs/FolderStructure.md)
- Saat ini: `src/components/`, `src/pages/`, `src/hooks/`, `src/lib/` (flat, type-based)
- Peta migrasi lengkap ada di `docs/FolderStructure.md`

## Key constraint
- Setiap pemindahan file: grep dulu semua import, update semua referensi, verifikasi app masih jalan (HTTP 200)

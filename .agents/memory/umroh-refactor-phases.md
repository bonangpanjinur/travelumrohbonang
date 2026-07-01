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

## Phase 4 ✅ — Feature-based structure (selesai 2026-07-01)
- src/ berhasil dimigrasi dari type-based ke feature-based structure
- Hasil akhir: admin/, features/{auth,booking,cms,dashboard,jamaah,agent,paket,tenant}/, shared/, components/ui/
- App berjalan clean: VITE ready in <500ms, zero import errors
- pages/ hanya tersisa NotFound.tsx; hooks/ dan lib/ root kosong (0 file)

**Gotcha penting saat migrasi:**
1. Bulk sed Phase 4a mengubah semua `@/hooks/` → `@/shared/hooks/` DULU (termasuk admin hooks)
2. Sed spesifik admin setelahnya tidak match karena pattern sudah berubah
3. Fix: jalankan sed kedua dengan pattern `@/shared/hooks/useAuthSettings` → `@/admin/hooks/useAuthSettings`
4. File baru yang di-copy SETELAH bulk sed langsung inherit import yang sudah diupdate
5. Relative imports di main.tsx dan App.tsx (`./lib/`, `./components/admin/`) harus difix manual

## Phase 5+ — Yang masih tersisa
- Phase 5: Database (konfirmasi .migration-backup/)
- Phase 6: Update docs/FolderStructure.md dengan struktur baru
- Phase 7: Testing & validasi (tsc --noEmit, pnpm build)
- Phase 8: Final cleanup (empty folders, dead code)
- Deferred: `components/ui/loading-spinner.tsx` vs `spinner.tsx`, `empty-state.tsx` vs `empty.tsx`

## Key constraint
- Setiap pemindahan file: grep dulu semua import, update semua referensi, verifikasi app masih jalan (HTTP 200)
- `components/ui/` shadcn TIDAK dipindah — tetap di `@/components/ui/`

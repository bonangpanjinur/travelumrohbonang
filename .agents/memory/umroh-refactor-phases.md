---
name: Umroh Gateway refactor phases
description: Status tiap phase refactor — semua selesai per 2026-07-01
---

## SEMUA PHASE SELESAI (2026-07-01)

### Phase 1 ✅ — SQL & Database folder
- Buat `database/{schema,migrations,patches,seed}/`
- Copy (BUKAN move) 59 migration files dari `.migration-backup/supabase/migrations/`
- Rename UUID → `YYYYMMDD_NNN_deskripsi.sql`

**Why:** User minta "jangan pindahkan file apapun" — semua SQL di database/ adalah SALINAN, originals tetap di .migration-backup/.

### Phase 2 ✅ — docs/ folder
- 8 file dokumentasi; api-server adalah Replit artifact (Express), bukan backend utama

### Phase 4 ✅ — Feature-based structure (selesai 2026-07-01)
- src/ berhasil dimigrasi dari type-based ke feature-based
- Hasil: admin/, features/{auth,booking,cms,dashboard,jamaah,agent,paket,tenant}/, shared/, components/ui/
- App berjalan: VITE ready <500ms, zero import errors

**Gotcha saat migrasi:**
1. Bulk sed Phase 4a mengubah `@/hooks/` → `@/shared/hooks/` DULU (termasuk admin hooks yg seharusnya ke @/admin/hooks/)
2. Sed spesifik admin setelahnya tidak match karena pattern sudah berubah  
3. Fix: sed kedua dengan pattern `@/shared/hooks/useAuthSettings` → `@/admin/hooks/useAuthSettings`
4. Relative imports di main.tsx dan App.tsx (`./lib/`, `./components/admin/`) harus difix manual
5. `components/ui/` shadcn TIDAK dipindah — path alias @/components/ui/ tetap

### Phase 5 ✅ — Database (.migration-backup/)
- 30 file SQL/lock, tidak direferensikan di kode
- Ditambah ke .gitignore, JANGAN dihapus tanpa konfirmasi manual

### Phase 6 ✅ — Docs update
- `docs/FolderStructure.md` diperbarui dengan struktur aktual post-refactor

### Phase 7 ✅ — TypeScript & Build
- `tsc --noEmit` → **0 errors** (26 pre-existing diperbaiki)
- Pattern fix umum: `return void toast.error(...)` untuk TS7030, cast `as Type[]` untuk Supabase nullable
- Production build: `PORT=3000 BASE_PATH=/ pnpm build` → ✓ built in 38.44s
- Warnings chunk size pre-existing, bukan blocker

### Phase 8 ✅ — Cleanup
- Dihapus: spinner.tsx (0 consumer), empty.tsx (0 consumer), folder kosong auth/components/

# PROJECT_ANALYSIS.md
> Ringkasan eksekutif audit menyeluruh repository Umroh App.
> Terakhir diperbarui: 2026-07-08

---

## Tentang Dokumen Ini

Direktori `/docs` berisi dokumentasi teknis lengkap project ini, dihasilkan dari audit menyeluruh seluruh codebase.

## Dokumen yang Tersedia

| File | Isi |
|------|-----|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Struktur monorepo, stack teknologi, dependency diagram, flow aplikasi |
| [DATABASE_MAP.md](./DATABASE_MAP.md) | Daftar tabel, kolom, ERD, relasi, daftar SQL & trigger |
| [API_MAP.md](./API_MAP.md) | Semua endpoint API dengan method, URL, file, dan status |
| [AUTH_FLOW.md](./AUTH_FLOW.md) | Flow login end-to-end, diagram, potensi error auth |
| [FEATURE_STATUS.md](./FEATURE_STATUS.md) | Status setiap fitur: Complete / Incomplete / Broken / Unused |
| [ROADMAP.md](./ROADMAP.md) | Sprint plan implementasi 7 sprint |
| [BUG_TRACKER.md](./BUG_TRACKER.md) | Daftar bug dengan prioritas P0–P3, termasuk security finding |
| [ENVIRONMENT.md](./ENVIRONMENT.md) | Semua environment variables: frontend/backend, required/optional |

---

## Target Project

- Website Umroh (katalog paket, booking, pembayaran)
- Login via Supabase Auth
- Dashboard Admin (multi-role RBAC)
- Dashboard Customer
- Semua data dari Supabase / PostgreSQL
- Deploy di Vercel

## Status Saat Ini (ringkasan)

| Area | Status |
|------|--------|
| Frontend (React + Vite) | ✅ Struktur lengkap |
| Backend (Express 5) | ✅ Struktur lengkap |
| Database schema | ⚠️ Perlu sync ke Supabase |
| Auth flow | ⚠️ Perlu env vars & trigger fix |
| Dashboard Admin | ⚠️ Butuh env vars yang benar |
| Dashboard Customer | ⚠️ Butuh env vars yang benar |
| Payment Gateway | ❌ Belum terintegrasi |
| Security | 🔴 1 critical finding (chat-messages no auth) |

## Prioritas Tertinggi (P0)

1. Set env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
2. Apply `supabase-deploy.sql` ke Supabase project
3. Fix redirect loop user tanpa `user_roles` row
4. Fix konflik trigger Replit Auth di `business_logic_triggers.sql`
5. 🔒 **SECURITY**: Tambah auth check di `/cms/chat-messages` (`cms.ts:212`)

---

*Dokumen ini hanya dokumentasi — tidak ada perubahan kode yang dilakukan selama audit.*

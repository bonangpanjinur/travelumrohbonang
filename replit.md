# Umroh App 

Aplikasi manajemen umroh lengkap — paket, booking, jemaah, pembayaran, dan CMS, dibangun di atas Supabase dan PostgreSQL.

## Replit Setup Status

- **Dependencies**: `pnpm install` completes cleanly ✅
- **Workflows running**:
  - `Start application` → `PORT=5000 pnpm --filter @workspace/umroh-app dev` (frontend, port 5000)
  - `API Server` → `PORT=8080 pnpm --filter @workspace/api-server dev` (API, port 8080)
- **Template system**: 3 variants (Classic, Modern, Luxury) + custom color picker in admin Settings → Template tab
- **RBAC**: Full role hierarchy (super_admin → admin → branch_manager → staff → agent → buyer) enforced frontend + backend
- **To run the app**: Supabase credentials already set in `.replit` userenv. `DATABASE_URL` auto-provided by Replit PostgreSQL.

## Run & Operate

- `PORT=5000 pnpm --filter @workspace/umroh-app dev` — frontend React/Vite (port 5000, Replit preview)
- `PORT=8080 pnpm --filter @workspace/api-server dev` — API server Express (port 8080)
- `pnpm run typecheck` — typecheck seluruh monorepo
- `pnpm run build` — build semua package
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks & Zod schemas dari OpenAPI spec
- `pnpm --filter @workspace/db run push` — push schema DB ke Supabase (dev only)
- `pnpm run verify:deploy-env` — cek semua environment variable wajib sebelum deploy ke Vercel
- `GET /api/health` — cek konektivitas database & Supabase sekaligus (status `ok`/`degraded`, latensi per service) — gunakan untuk verifikasi cepat setelah deploy ke Vercel

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- API: Express 5 (di-deploy ke Vercel Functions)
- DB: PostgreSQL (Supabase) + Drizzle ORM
- Auth: Supabase Auth (JWT, diverifikasi di API server)
- Validasi: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (dari OpenAPI spec)
- Build API: esbuild (CJS bundle)

## Where Things Live

```
artifacts/umroh-app/     — React frontend (Vite)
artifacts/api-server/    — Express API server
api/index.ts             — Vercel Function wrapper untuk API server
lib/db/                  — Drizzle schema & koneksi PostgreSQL
lib/api-spec/            — OpenAPI spec (sumber kebenaran API)
lib/api-zod/             — Zod schemas (di-generate dari spec)
lib/api-client-react/    — React Query hooks (di-generate dari spec)
vercel.json              — Konfigurasi deployment Vercel
.env.example             — Template environment variables
```

## Environment Variables

### Di Replit (development)

| Variabel | Keterangan | Status |
|---|---|---|
| `DATABASE_URL` | Replit built-in PostgreSQL | ✅ Auto-provided oleh Replit |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — wajib, tidak ada varian VITE_ | ❗ Perlu diisi jika pakai auth |
| `VITE_SUPABASE_URL` | URL Supabase — dipakai frontend & server (server fallback ke ini) | ❗ Perlu diisi jika pakai auth |
| `VITE_SUPABASE_ANON_KEY` | Anon key — dipakai frontend & server (server fallback ke ini) | ❗ Perlu diisi jika pakai auth |
| `VITE_SUPABASE_PROJECT_ID` | Subdomain project Supabase | ❗ Perlu diisi jika pakai auth |

> `SUPABASE_URL`/`SUPABASE_ANON_KEY` (tanpa prefix) dan `VITE_SUPABASE_PUBLISHABLE_KEY` **tidak perlu diisi lagi** — sudah digabung/fallback otomatis ke variabel `VITE_SUPABASE_*` di atas (lihat `artifacts/api-server/src/lib/supabaseEnv.ts`).

> **Database di Replit**: `DATABASE_URL` sudah otomatis tersedia dari Replit built-in PostgreSQL. Semua 66 tabel sudah dibuat via `drizzle-kit push` dan seed data awal sudah dimuat via `psql $DATABASE_URL -f scripts/seed.sql`. Tidak perlu setup manual.

### Di Vercel (production/deployment)

Lihat `.env.example` untuk daftar lengkap variabel yang dibutuhkan saat deploy ke Vercel.

## Deployment ke Vercel

1. Push repository ke GitHub
2. Import project di [vercel.com](https://vercel.com/new)
3. Di **Environment Variables**, tambahkan semua variabel dari tabel di atas (tanpa `PORT`)
4. Klik Deploy

Frontend dan API otomatis di-deploy bersama di satu domain:
- Frontend: `https://your-app.vercel.app/`
- API: `https://your-app.vercel.app/api/*`

`VITE_API_URL` **tidak perlu diisi** di Vercel karena frontend dan API satu domain (same-origin).

## Architecture Decisions

- **Vercel monorepo**: Frontend (static) + API (serverless function) dalam satu repository dan satu domain — menghindari CORS dan menyederhanakan deployment.
- **Supabase sebagai sumber auth**: API server memverifikasi JWT Supabase di setiap request (`requireAuth` middleware), bukan menyimpan session sendiri.
- **Semua fitur premium dibuka**: Flag `premium: true` dihapus dari `adminMenuConfig.ts`; tidak ada route guard berbasis langganan.
- **Drizzle over raw SQL**: Schema sebagai TypeScript, type-safe queries, mudah di-push ke Supabase Postgres.
- **RBAC role lookup**: `/api/auth/user` dan `authMiddleware` membaca role aktual dari tabel `user_roles` (bukan hanya email allowlist). Role hierarchy: `super_admin > admin > branch_manager > staff > agent > buyer`. Role-assignment API dilindungi `requireSuperAdmin`.
- **Dynamic theme**: `useActiveTemplate` membaca `site_settings` (key=`template`, category=`appearance`) dan menerapkan CSS variables ke `:root` secara real-time via Supabase channel. Custom hex colors dikonversi ke HSL dan override template preset.

## User Preferences

_Isi sesuai preferensi pengguna._

## Gotchas

- `VITE_*` vars hanya tersedia di frontend (Vite); server-side tidak bisa membacanya.
- `DATABASE_URL` adalah runtime-managed di Replit; jangan set manual di Replit env.
- Jalankan `pnpm --filter @workspace/db run push` setelah perubahan schema untuk sync ke Supabase.
- Vite dev server mem-proxy `/api/*` ke port 8080 — pastikan API server berjalan lebih dulu.

## Pointers

- Lihat `.env.example` untuk template lengkap environment variables
- Lihat `pnpm-workspace.yaml` untuk struktur workspace

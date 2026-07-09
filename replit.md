# Umroh App 

Aplikasi manajemen umroh lengkap — paket, booking, jemaah, pembayaran, dan CMS, dibangun di atas Supabase dan PostgreSQL.

## Replit Setup Status

- **Dependencies**: `pnpm install` completes cleanly ✅
- **Workflows running**:
  - `Start application` → `PORT=5000 pnpm --filter @workspace/umroh-app dev` (frontend, port 5000)
  - `API Server` → `PORT=8080 pnpm --filter @workspace/api-server dev` (API, port 8080)
- **Template system**: 3 variants (Classic, Modern, Luxury) + custom color picker in admin Settings → Template tab
- **RBAC**: Full role hierarchy (super_admin → admin → branch_manager → staff → agent → buyer) enforced frontend + backend
- **To run the app**: Supabase credentials already set in `.replit` userenv. `DATABASE_URL` is auto-provided by Replit PostgreSQL but is NOT the app's real database (it's empty) — the backend (`lib/db`) prefers `SUPABASE_DATABASE_URL` when set, which must be the Supabase project's pooler connection string (Session/Transaction pooler, `aws-0-<region>.pooler.supabase.com`; the direct `db.<ref>.supabase.co` host is IPv6-only and unreachable from Replit). `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DATABASE_URL` added 2026-07-08 — `GET /api/health` reports `database: ok` and `supabase: ok`.
- **2026-07-08 fix**: added missing foreign key constraints on `packages` (category/hotel/airline/airport) and `package_departures`/`departure_prices` in the live Supabase DB — they existed as columns but the FK constraints were never created, causing all PostgREST nested-select queries (homepage package list, etc.) to fail with HTTP 400 `PGRST200`. Also fixed N+1 queries in `/api/admin/departures` and `/api/admin/packages/:id`, and fixed role gaps in `adminMenuConfig.ts` (agent role couldn't see Jemaah/Manifest/etc; Dashboard/Notifications had no role restriction at all). See `RENCANA_PERBAIKAN.md` for full details.
- **Re-import note (2026-07-08)**: after re-importing this repo, `node_modules` was missing for both `artifacts/umroh-app` and `artifacts/api-server`, causing both workflows to fail (`vite: not found`, `ERR_MODULE_NOT_FOUND esbuild`). Fixed by running `pnpm install` at the repo root.
- **Re-import note (2026-07-09)**: same issue recurred after a second GitHub re-import. Fix is always the same: run `pnpm install` at the repo root, then restart both workflows. Dependencies restore cleanly in ~22 s.
- **Local DB setup (2026-07-09)**: switched to full Replit Postgres for data (no SUPABASE_DATABASE_URL needed). Schema applied via `pnpm --filter @workspace/db push-force`; seed data loaded via `psql $DATABASE_URL -f supabase-seed.sql`. Auth still uses real Supabase (login/signup). Data queries routed through Vite proxy to local API: `client.ts` uses `window.location.origin` in dev so all `/rest/v1` calls go same-origin through Vite → localhost:8080 → local DB. `/auth/v1` proxy in vite.config.ts routes auth to real Supabase.
- **P0 stabilization complete (2026-07-08)**: all 6 P0 blockers in `MASTER_PROJECT_BLUEPRINT.md` §11 are resolved — see `RENCANA_PERBAIKAN.md` "Update 2026-07-08 (lanjutan)" for full detail. Summary: `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_DATABASE_URL` set (real Supabase DB now in use, not empty Replit Postgres); legacy `trg_handle_new_local_user` trigger dropped from live DB (was dead — fired on empty, never-written `public.users`); `profiles.id`/`user_roles.id`/`user_roles.user_id` Drizzle schema types fixed from `text` to `uuid` to match the live DB (TS-only change, no DB migration); `/api/cms/chat-messages` now requires auth + booking-ownership/staff check (was a public data leak); redirect-loop and cloud-only-trigger items were already handled by existing code, verified not to need changes.
- **Known-large auth/schema audit**: `MASTER_PROJECT_BLUEPRINT.md`, `PROJECT_ANALYSIS.md`, and `AUTH_ARCHITECTURE.md` document a multi-phase remediation plan. P0 (blocker) items are done (see above). P1 (payment gateway, `isAdmin` frontend/backend role-set mismatch, dual role-resolution paths) and P2/P3 (legacy `replit-auth-web` cleanup, incomplete CRUD on contracts/refunds/withdrawals, no tests, etc.) are NOT started — see proposed follow-up tasks.
- **Broader schema drift (not yet fixed)**: the same `text`-in-Drizzle-vs-`uuid`-in-DB pattern fixed for profiles/user_roles also exists on most other tables' `id`/`*_id` columns (agents, bookings, contracts, crm, logs, payments, etc). Left alone intentionally — scope was larger than the named P0 item and carries more risk (chained `.references()` types). Candidate for a dedicated follow-up task.
- **Admin panel Supabase-readiness audit (2026-07-09)**: cross-checked every admin frontend `apiFetch` call against the actual backend route mounts and fixed all mismatches (departures, payments, refunds, SEO overrides/audit, settings/seo, pilgrim check-ins, navigation categories, tenant/redirects). Also verified the new `check_ins` table already exists in the live Supabase DB (confirmed in `sql/schema/supabase_schema.sql`) with `uuid` columns — the Drizzle schema declares them `text`, which is the same pre-existing drift noted above; this does **not** cause runtime errors because all IDs are generated with `crypto.randomUUID()` (valid uuid strings), which Postgres accepts into `uuid` columns via implicit cast regardless of what type Drizzle's TS layer thinks it is. No DB migration was needed for `check_ins`. Full monorepo typecheck is clean and both `API Server`/`Start application` workflows verified running with all 289 routes registered.

## Run & Operate

- `PORT=5000 pnpm --filter @workspace/umroh-app dev` — frontend React/Vite (port 5000, Replit preview)
- `PORT=8080 pnpm --filter @workspace/api-server dev` — API server Express (port 8080)
- `pnpm run typecheck` — typecheck seluruh monorepo
- `pnpm run build` — build semua package
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks & Zod schemas dari OpenAPI spec
- `pnpm --filter @workspace/db run push` — push schema DB ke Supabase (dev only)
- `psql "$DATABASE_URL" -f sql/seeds/supabase-seed.sql` — seed data awal ke Replit Postgres
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
- Lihat `sql/` untuk semua file SQL:
  - `sql/migrations/` — patch & migrasi inkremental (FK, trigger, role, dll.)
  - `sql/schema/` — definisi skema lengkap (Supabase & lokal)
  - `sql/seeds/` — data awal (`supabase-seed.sql` untuk dev, `supabase-seed-prod.sql` untuk prod)

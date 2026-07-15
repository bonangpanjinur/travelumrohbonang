# Umroh App

Platform SaaS manajemen perjalanan umroh — paket, booking, jemaah, pembayaran, CRM, dan CMS. Dibangun di atas Supabase dan PostgreSQL.

## Run & Operate

```bash
# Frontend React/Vite (port 5000, Replit preview)
PORT=5000 pnpm --filter @workspace/umroh-app dev

# API server Express (port 8080)
PORT=8080 pnpm --filter @workspace/api-server dev

# Typecheck seluruh monorepo
pnpm run typecheck

# Build semua package (typecheck + build)
pnpm run build

# Regenerate API hooks & Zod schemas dari OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push schema DB ke Replit Postgres (dev)
pnpm --filter @workspace/db run push

# Push schema DB (force — untuk re-import fresh)
pnpm --filter @workspace/db run push-force

# Seed data awal ke Replit Postgres
psql "$DATABASE_URL" -f sql/seeds/supabase-seed.sql

# Run API tests
pnpm test

# Cek semua env vars wajib sebelum deploy Vercel
pnpm run verify:deploy-env

# Health check API
GET /api/health
```

## Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 19 + Vite 7 + Tailwind CSS 4 + shadcn/ui |
| Routing | Wouter v3 |
| Server state | TanStack Query v5 |
| Backend | Express 5 (Node.js 20) |
| Database | PostgreSQL (Supabase) + Drizzle ORM |
| Auth | Supabase Auth (JWT, diverifikasi di API server) |
| Storage | Supabase Storage |
| API contract | OpenAPI 3.1 (Orval codegen) |
| Package manager | pnpm workspaces |
| Deploy (dev) | Replit |
| Deploy (prod) | Vercel (API serverless + frontend static) |

## Where Things Live

```
artifacts/
  umroh-app/          — React frontend (Vite)
  api-server/         — Express API server
  mockup-sandbox/     — Vite sandbox UI prototyping (dev-only)

lib/
  db/                 — Drizzle schema (source of truth) + pool config
  api-spec/           — OpenAPI YAML spec
  api-zod/            — Zod schemas (generated + manual)
  api-client-react/   — React Query hooks (generated)

api/
  index.ts            — Vercel serverless entry point

sql/
  migrations/         — SQL migration files
  seeds/              — supabase-seed.sql, supabase-seed-prod.sql
  schema/             — supabase-deploy.sql, supabase-schema.sql

scripts/
  verify-deploy-env.mjs   — pre-deploy env check
  push-to-supabase.mjs    — schema push to Supabase
  seed.ts                 — dev seed script

docs/
  PRD.md              — Product Requirements Document (single source of truth)
  ARCHITECTURE.md     — Arsitektur monorepo dan stack
  DATABASE_MAP.md     — Semua tabel, kolom, relasi
  ROADMAP.md          — Sprint roadmap
  FEATURE_STATUS.md   — Status setiap fitur
  ENVIRONMENT.md      — Semua env variables
  API_MAP.md          — Peta semua API endpoint
  AUTH_ARCHITECTURE.md — Arsitektur autentikasi
  AUTH_FLOW.md        — Flow login/JWT/role
  DEPLOY_TUTORIAL.md  — Panduan deploy ke Vercel
```

## Environment Variables

| Variable | Required | Keterangan |
|----------|:--------:|------------|
| `DATABASE_URL` | ✅ auto | Replit Postgres — dikelola otomatis Replit |
| `VITE_SUPABASE_URL` | ✅ | URL project Supabase |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ | Service role key — butuh untuk 2FA, storage uploads |
| `SUPABASE_DATABASE_URL` | ⚠️ | Supabase pooler string — jika ingin data real dari Supabase |
| `VITE_API_URL` | no | Base URL API — kosongkan jika same-origin |

> `SUPABASE_DATABASE_URL` harus pakai **pooler host** (`aws-0-<region>.pooler.supabase.com`), bukan direct host (IPv6-only, tidak bisa diakses dari Replit).

> Lihat `docs/ENVIRONMENT.md` dan `.env.example` untuk daftar lengkap.

## RBAC

Hierarki role: `super_admin → admin → branch_manager → staff → agent → buyer`

Enforced di frontend (route guards) dan backend (`requireAdmin` middleware).

## Re-import Checklist

Setiap GitHub re-import kehilangan `node_modules` dan Replit Postgres dikosongkan:

```bash
# 1. Install semua dependencies
pnpm install

# 2. Push Drizzle schema ke Replit Postgres
pnpm --filter @workspace/db run push-force

# 3. Seed data awal
psql "$DATABASE_URL" -f sql/seeds/supabase-seed.sql

# 4. Restart kedua workflow
```

Supabase secrets (`SUPABASE_DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) hilang setiap re-import — tambahkan kembali via Replit Secrets jika diperlukan.

## Architecture Decisions

- `lib/db` memilih `SUPABASE_DATABASE_URL` jika tersedia, fallback ke `DATABASE_URL` (Replit Postgres) — memungkinkan dev lokal tanpa Supabase credentials
- API contract adalah OpenAPI spec di `lib/api-spec`; semua React Query hooks dan Zod schemas di-generate via Orval — edit spec-nya, bukan file generated
- Role resolution: local-first via `DATABASE_URL`; Supabase role sync adalah enhancement opsional
- esbuild bundle API server ke CJS single file untuk Vercel Functions
- `dangerouslySetInnerHTML` di CMS pages menggunakan `dompurify` — wajib dipertahankan (cegah stored XSS)

## Gotchas

- `SUPABASE_DATABASE_URL` harus pakai pooler host, bukan direct DB host
- Setelah ubah schema: `pnpm --filter @workspace/api-spec run codegen` untuk regenerate hooks/schemas
- `pg` harus `external` di esbuild DAN direct dep di `artifacts/api-server/package.json`
- Wildcard routes Express 5 harus named (`*path`), bukan unnamed (`*`)
- `pnpm run typecheck` bisa report 0 error karena stale `.tsbuildinfo` — pakai `pnpm run typecheck:clean` terlebih dahulu jika curiga

## User Preferences

<!-- Tambahkan preferensi user di sini -->

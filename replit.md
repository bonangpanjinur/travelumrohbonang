# Umroh App

Aplikasi manajemen umroh lengkap — paket, booking, jemaah, pembayaran, dan CMS, dibangun di atas Supabase dan PostgreSQL.

## Run & Operate

- `PORT=5000 pnpm --filter @workspace/umroh-app dev` — frontend React/Vite (port 5000, Replit preview)
- `PORT=8080 pnpm --filter @workspace/api-server dev` — API server Express (port 8080)
- `pnpm run typecheck` — typecheck seluruh monorepo
- `pnpm run build` — build semua package
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks & Zod schemas dari OpenAPI spec
- `pnpm --filter @workspace/db run push` — push schema DB ke Supabase (dev only)
- `psql "$DATABASE_URL" -f sql/seeds/supabase-seed.sql` — seed data awal ke Replit Postgres
- `pnpm run verify:deploy-env` — cek semua environment variable wajib sebelum deploy ke Vercel
- `GET /api/health` — cek konektivitas database & Supabase (status `ok`/`degraded`, latensi per service)

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- API: Express 5 (dapat di-deploy ke Vercel Functions)
- DB: PostgreSQL (Supabase) + Drizzle ORM
- Auth: Supabase Auth (JWT, diverifikasi di API server)
- Validasi: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (dari OpenAPI spec)
- Build API: esbuild (CJS bundle)

## Where Things Live

```
artifacts/umroh-app/      — React frontend (Vite)
artifacts/api-server/     — Express API server
artifacts/mockup-sandbox/ — Canvas component preview sandbox (dev-only)
lib/db/                   — Drizzle schema & migrations
lib/api-spec/             — OpenAPI spec + Orval codegen
lib/api-client-react/     — Generated React Query hooks
lib/api-zod/              — Generated Zod schemas
sql/seeds/                — Seed SQL files
```

## Environment Variables

- `DATABASE_URL` — Replit Postgres (auto-provided; empty DB on fresh import — run `push-force` + seed)
- `SUPABASE_DATABASE_URL` — Supabase pooler connection string (Session/Transaction pooler). When set, `lib/db` prefers this over `DATABASE_URL`. Must use pooler host (`aws-0-<region>.pooler.supabase.com`); direct host is IPv6-only and unreachable from Replit.
- `SUPABASE_SERVICE_ROLE_KEY` — needed for role sync and storage uploads; degrades gracefully if absent
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — public Supabase project URL and anon key (used by frontend auth)

## Re-import Notes

Every GitHub re-import loses `node_modules` and empties the Replit Postgres DB. Fix:

1. `pnpm install` (root) — restores all dependencies (~22s)
2. `pnpm --filter @workspace/db push-force` — pushes Drizzle schema to Replit Postgres
3. `psql "$DATABASE_URL" -f sql/seeds/supabase-seed.sql` — loads seed data
4. Restart both workflows

Supabase secrets (`SUPABASE_DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are also lost on re-import and must be re-added manually.

## RBAC

Full role hierarchy: `super_admin → admin → branch_manager → staff → agent → buyer`, enforced on both frontend and API.

## Architecture Decisions

- `lib/db` uses `SUPABASE_DATABASE_URL` when set, falls back to `DATABASE_URL` (Replit Postgres) — allows local dev without Supabase credentials
- API server is an esbuild CJS bundle deployable to Vercel Functions
- API contract is the OpenAPI spec in `lib/api-spec`; all React Query hooks and Zod schemas are generated via Orval — edit the spec, not the generated files
- Role resolution is local-first; Supabase role sync is a secondary enhancement

## User Preferences

_Populate as you build._

## Gotchas

- `SUPABASE_DATABASE_URL` must use the pooler host, not the direct DB host (IPv6-only, unreachable from Replit)
- After any schema change, run `pnpm --filter @workspace/api-spec run codegen` to regenerate hooks/schemas
- `dangerouslySetInnerHTML` in CMS pages uses `dompurify` sanitisation — keep this in place

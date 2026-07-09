---
name: Local DB + Supabase Auth hybrid dev setup
description: How the app routes data to local Replit Postgres while keeping real Supabase for auth in dev mode.
---

# Local DB + Supabase Auth hybrid (Replit dev)

## The rule
In dev mode (`import.meta.env.DEV`), `client.ts` sets supabase URL to `window.location.origin` — same-origin requests, no CORS, Vite proxy intercepts `/rest/v1/*` and `/storage/v1/*` → `localhost:8080` → local Replit Postgres.

`auth-client.ts` still uses `VITE_SUPABASE_URL` (real Supabase) for login/signup.

`vite.config.ts` proxy split:
- `/auth/v1` → real Supabase (via `realSupabaseUrl`)
- `/api`, `/rest/v1`, `/storage/v1` → `http://localhost:8080`

**Why:** Supabase JS client sends absolute URLs; changing the URL to same-origin makes Vite proxy intercept them without CORS. Using `window.location.origin` handles any access method (127.0.0.1, Replit dev domain, etc).

## How to apply
- Never revert `client.ts` to use `VITE_SUPABASE_URL` unconditionally in dev — all CMS/blog/gallery data would hit real (empty) Supabase instead of local DB.
- `auth-client.ts` should always keep `VITE_SUPABASE_URL` (real Supabase) — auth must work against the real project.
- The ALLOWED_ORIGINS env var must include `http://127.0.0.1:5000` and `http://localhost:5000` for dev CORS checks on the API server.

## Initial DB setup (run once, idempotent)
```bash
pnpm install                                      # install all workspace deps
pnpm --filter @workspace/db push-force            # apply Drizzle schema to local Replit Postgres
psql "$DATABASE_URL" -f supabase-seed.sql         # seed reference data
```
After this, `GET /api/health/detail` should show all tables: ok.

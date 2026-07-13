---
name: Vercel DATABASE_URL not needed
description: When DATABASE_URL is not set on Vercel, all DB-touching routes must use Supabase HTTP API instead of pg pool. Pool connection timeouts (5s each) kill the serverless function even inside try-catch.
---

## The rule
When `DATABASE_URL` is absent or is the placeholder `postgres://localhost/placeholder`,
routes must forward to Supabase REST API (`SUPABASE_URL/rest/v1/{table}`) using
`SUPABASE_SERVICE_ROLE_KEY`, not `pool.query()`.

## Why
On Vercel, `DATABASE_URL` is not auto-provided. Even with try-catch around `pool.query()`,
the pg `connectionTimeoutMillis: 5000` means each failed DB call blocks for 5 seconds.
Two such calls = 10+ seconds → Vercel serverless function timeout → gateway returns 500
before the handler can send a response. The timeout happens at the infrastructure level,
so try-catch in application code cannot save you.

## How to apply
- In `rest.ts`: check `USE_SUPABASE_HTTP = !process.env.DATABASE_URL || DATABASE_URL.includes('localhost/placeholder')`. If true, call `supabaseForward(req, res, table)` and return early in every route handler.
- In `auth.ts` and `authMiddleware.ts`: use `fetch(SUPABASE_URL/rest/v1/user_roles?user_id=eq.{id})` with service role key instead of `db.select().from(userRoles)`.
- Do NOT import `usersTable` from `@workspace/db` in auth routes on Vercel — the `public.users` table does not exist in Supabase (users live in `auth.users`).
- Auto-create `user_roles` entry on first login: check role, if null, POST `{user_id, role:'buyer'}` to Supabase REST API with `Prefer: resolution=ignore-duplicates`.

## Env vars that ARE set in Vercel (no DATABASE_URL needed)
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `VITE_SUPABASE_URL` ✅
- `VITE_SUPABASE_ANON_KEY` ✅

## This rule applies per-route-file, not just rest.ts/auth.ts

Any route file that queries via Drizzle/`db.select()` directly (bypassing `rest.ts`'s proxy)
needs its own `USE_SUPABASE_HTTP` branch + PostgREST fallback — the `rest.ts` fix does not
cover it. Found `routes/packages.ts` (list/detail/filter-options/reviews) doing direct
`db.select()` with no fallback, so package listing/detail worked fine in Replit dev (real
`SUPABASE_DATABASE_URL` present) but failed with a generic "gagal memuat paket" on Vercel
(pool falls back to `postgres://localhost/placeholder`, every query hangs until timeout).
When embedding relations via PostgREST in the fallback, remember every `packages.*_id` FK in
this app has a duplicate constraint (see `packages-duplicate-fk-pgrst201.md`) — the fallback
`select=` string must disambiguate every embed (including `package_departures` and
`departure_prices`) with `!fkName`, not just the ones already hit in the frontend.

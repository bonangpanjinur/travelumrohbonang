---
name: Supabase DATABASE_URL split-brain on Replit import
description: Why Drizzle/admin routes silently point at an empty DB after importing a Supabase-backed app into Replit, and the fix pattern.
---

## The problem

When a pre-existing app whose single source of truth is an external Supabase Postgres project
gets imported into Replit, Replit's platform auto-provisions its own Postgres and binds it to
`DATABASE_URL` — a runtime-managed var that cannot simply be overwritten via secrets. Any backend
code using Drizzle/`pg.Pool` over `DATABASE_URL` (e.g. `/api/admin/*` routes) then silently talks
to a brand-new, empty Postgres instead of the real Supabase database, while most frontend pages
that call `supabase-js` directly keep working fine — masking the bug until someone exercises an
admin/Drizzle code path.

**Why:** Replit's import auto-binding happens unconditionally for any repo, regardless of whether
the app's real database lives elsewhere; it doesn't know to leave `DATABASE_URL` alone for a
Supabase-native app.

**How to apply:** don't fight the `DATABASE_URL` binding. Add a distinct env var (e.g.
`SUPABASE_DATABASE_URL`) that the db client prefers, falling back to `DATABASE_URL` when unset —
this fixes Replit dev without touching production (e.g. Vercel), where `DATABASE_URL` is already
manually set to the Supabase connection string.

## Direct vs pooler connection string

Supabase's "direct connection" host (`db.<ref>.supabase.co`) only resolves to an IPv6 address.
Replit's environment has no IPv6 egress route, so connecting with that string fails with
`ENOTFOUND`/timeout even though the string is correct. Use Supabase's **Supavisor pooler**
connection string instead (host like `aws-0-<region>.pooler.supabase.com`, session mode port 5432
or transaction mode 6543) — it resolves over IPv4 and works from Replit.

## Missing FK constraints break PostgREST embeds silently

A Drizzle schema declaring `references()` does NOT guarantee the actual FK constraint exists in the
live Postgres database — if migrations were never pushed, columns exist but constraints don't. This
manifests as PostgREST (`supabase-js` nested `select`) calls failing with HTTP 400 `PGRST200` ("no
relationship found in schema cache"), even though the column and referenced table both exist and
data is consistent. Fix: check `pg_constraint` for `contype='f'` on the table, verify no orphaned
rows first, then `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ...` and
`NOTIFY pgrst, 'reload schema'` to make PostgREST pick it up immediately without restarting.

## Secrets are wiped on re-import, not just shadowed

Re-importing the same repo into Replit (e.g. via GitHub re-sync) can drop previously-set secrets
entirely — `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DATABASE_URL` disappeared after a same-day
re-import even though `replit.md` still documented them as configured. Symptom: API server boot log
shows `SUPABASE_SERVICE_ROLE_KEY: false`, `/api/health` reports `database: error` or silently uses
the empty Replit DB, and the frontend admin-role gate falls back to "buyer" (see
`auth-middleware-500-fix.md`). **How to apply:** after any re-import, check `viewEnvVars`/secret
existence before trusting replit.md's "already configured" notes — don't assume secrets survived.
Also: the Supabase pooler connection string's username must be `postgres.<project-ref>` (not bare
`postgres`), or Postgres rejects it with a generic "password authentication failed" error that looks
like a wrong password.

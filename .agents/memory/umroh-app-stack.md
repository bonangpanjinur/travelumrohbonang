---
name: Umroh App Stack
description: Vite+React+Supabase app migrated from Vercel; key quirks for deps and Tailwind v4 setup.
---

## Auth stays on Supabase Auth (not Replit Auth) — deliberate, do not swap on routine re-imports

As of 2026-07-04 the live code still uses Supabase Auth end-to-end: frontend `auth-client.ts` calls `createClient()` from `@supabase/supabase-js`, and the API server's `authMiddleware.ts` verifies the bearer token via direct fetch to Supabase `/auth/v1/user` (no `openid-client`/Replit Auth anywhere in the tree). An earlier note here claimed auth had been switched to Replit Auth — that was stale/aspirational and did not match the checked-in code; trust the code over this note going forward.

Data (packages, site_settings, bookings, etc.) is served by a local Express REST shim (`/rest/v1/*`, `/storage/v1/*`) backed by Replit's own Postgres (via Drizzle, schema mirrored in `supabase-schema.sql`/`supabase-seed.sql`), while user auth/session still round-trips to the real external Supabase project referenced by `VITE_SUPABASE_URL`/`SUPABASE_URL`.

**Why:** this is a large, already-built production app (RBAC, admin, bookings, payments all wired to Supabase JWTs) — a full swap to Replit Auth is a major cross-cutting rewrite, not something to do incidentally during a routine Agent→Replit re-import/checkpoint restore. The `replit-migration-guardrails` skill's "replace external auth" rule targets fresh imports from Lovable/Base44/v0/Bolt with throwaway stub auth, not this kind of mature hybrid app.

**How to apply:** on a routine "migrate from Agent to Replit" pass, leave Supabase Auth in place. Only replace it with Replit Auth if the user explicitly requests it, since it touches `auth-client.ts`, `authMiddleware.ts`, RBAC role checks, and admin allowlist logic across both frontend and backend.

## Prior data-layer note (superseded above, kept for history)

An earlier pass considered ripping out Supabase env vars but decided against it because dozens of files still call `supabase.from(...)` client-side — that constraint still holds if a future Auth swap is ever attempted: `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` must stay set regardless of what auth provider is used, since they're also used for any remaining direct Supabase data calls.

**How to apply:** when adding a workspace lib package (e.g. a browser auth-hook package) that isn't code-generated, remember it needs the same tsconfig project-reference wiring as generated libs: `composite: true` + `declarationMap` + `emitDeclarationOnly` in its own tsconfig, added to both the consuming app's `references` and the root `tsconfig.json` `references`, then `pnpm -w run typecheck:libs` (a `tsc --build`) before the app's own typecheck will pick it up — otherwise you get `TS6305: Output file ... has not been built from source file`.

If a lib file uses `import.meta.env`, add `/// <reference types="vite/client" />` at the top of that file, add `"types": ["vite/client"]` to its tsconfig, and add `vite` to its `devDependencies` — plain `tsc --build` won't otherwise see Vite's ambient types.

A stale `dist/` bundle for the Express API server can keep a runtime error from a **deleted** source file (e.g. an old `lib/supabase.ts` throwing on missing env vars) alive across restarts if the previous build wasn't cleaned. If a workflow fails with an error referencing a file that no longer exists in `src/`, do `rm -rf dist` and rebuild before assuming the code is still broken.

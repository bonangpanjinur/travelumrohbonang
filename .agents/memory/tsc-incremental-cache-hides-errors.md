---
name: Stale tsc incremental cache hides real errors
description: pnpm run typecheck can report 0 errors while real type errors exist, because of stale .tsbuildinfo incremental caches.
---

`pnpm run typecheck` in this monorepo uses `tsc --incremental` with `.tsbuildinfo` files per package (`artifacts/*/​.tsbuildinfo`, `lib/*/tsconfig.tsbuildinfo`, `scripts/tsconfig.tsbuildinfo`). If a prior run cached a file as "already checked" and it wasn't touched in the current diff, tsc will skip re-checking it even if it actually has errors — so "0 errors" from `pnpm run typecheck` is not reliable proof the whole repo compiles.

**Why:** discovered when a typecheck reported 0 errors after several edits, but deleting all `.tsbuildinfo` files and re-running surfaced ~90 pre-existing `SelectQueryError`/`Argument of type ... not assignable` errors across many Supabase-client hook/component files (`useCurrency.tsx`, `useNotifications.ts`, `useTenant.tsx`, `Navbar.tsx`, `SEO.tsx`, etc.) that were never actually clean — they'd just been skipped by the incremental cache in earlier "passing" runs.

**How to apply:** before trusting a "0 errors" typecheck result as proof a broad change (e.g. schema migration, dependency bump) didn't break anything, delete all `.tsbuildinfo` files in the repo and re-run `pnpm run typecheck` once for a true clean signal. The pre-existing Supabase `SelectQueryError` type errors themselves are a known symptom of `@supabase/supabase-js`/`postgrest-js` v2.109 type-inference issues with narrow `.select("col")` + `.eq()` chains — they do not block the Vite dev server or app runtime (only `tsc --noEmit` sees them), so treat them as a separate pre-existing tech-debt item, not a regression to chase down file-by-file unless asked.

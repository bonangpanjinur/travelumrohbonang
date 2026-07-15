---
name: Admin route frontend/backend path mismatches
description: Recurring pattern where admin frontend pages call API paths that don't match how the Express router is actually mounted or structured — how to find and fix these systematically.
---

Several admin pages called endpoints that looked plausible but didn't match the actual backend mount, because they were written speculatively (one frontend file literally had a comment "Assuming this exists or create it").

**Why:** grep for `apiFetch\(.*"/api/admin/` in the frontend and diff against `router.use(...)` mounts + in-file `router.get/post/...` paths in `artifacts/api-server/src/routes/admin/*.ts`. Typecheck alone never catches this — both sides are stringly-typed paths with no shared contract.

**How to apply:** when auditing/fixing the admin panel, re-run this diff. Recurring bug classes found:
1. A router file is written with `mergeParams: true` assuming a nested mount (e.g. `/bookings/:bookingId/payments`), but the frontend also needs a flat top-level route (e.g. `/payments/all`) that doesn't require the parent param. Fix: add a second `router.use("/flatpath", ...)` mount of the same router in `routes/admin/index.ts` — do not duplicate the route file.
2. A whole sub-feature referenced by the frontend (SEO audit, single-key settings like `/settings/seo`, pilgrim check-in) was never built server-side — only discoverable by literally finding no matching `router.get/post` line.
3. Naming drift: frontend assumes plural/alternate resource names (`/tenants` vs mounted `/tenant`, `/content/package-categories` vs the real `/masterdata/categories`). Fix by pointing the frontend at the real resource rather than adding a duplicate alias route, unless the two are genuinely different concepts.
4. Response-shape drift: some routers return a bare array (`res.json(data)`), others wrap in `{ data }`. The frontend's destructuring assumption must match the specific router being called, not a project-wide convention.

**Supabase-vs-local id type drift is usually NOT a runtime bug**: even though Drizzle declares many `id`/`*_id` columns as `text()` while the live Supabase DB has them as `uuid`, this doesn't break inserts/selects as long as the app always generates ids with `crypto.randomUUID()`. Postgres implicitly casts a valid uuid-format string parameter into a `uuid` column regardless of what type Drizzle's TS layer thinks it is. Before adding a "fix schema drift" migration, check `sql/schema/supabase_schema.sql` (the most accurate live-schema dump) — the table you're worried about may already exist there with the right types, and no migration is needed at all.

---
name: Masterdata route error handling
description: Error handling pattern for /api/admin/masterdata/* POST/PATCH/DELETE handlers.
---

## Rule
All POST handlers in masterdata.ts must validate required fields (name) before hitting the DB and return 400. Use the shared dbError() helper for catch blocks to map Postgres constraint codes (23502/23503/23505) to 400/409 instead of generic 500.

**Why:** Missing package_categories table + no validation = 500 on every GET and POST to /api/admin/masterdata/categories. The table not existing was the root cause; unvalidated inserts were a secondary 500 path.

**How to apply:** When adding a new masterdata entity POST route, always check `req.body?.name?.trim()` first, then wrap db.insert in try/catch using dbError(res, entityLabel, "create", err).

## Also note
Running `pnpm --filter @workspace/db run push-force` from workspace root initializes local Replit Postgres with the full Drizzle schema (68 tables). Must be re-run whenever schema changes or when the local DB is wiped/reset.

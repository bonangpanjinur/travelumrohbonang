---
name: CMS Drizzle payload casing
description: Generic admin CMS routes pass request bodies directly to Drizzle tables whose public keys are camelCase.
---

Admin CMS CRUD endpoints use Drizzle table objects directly, so mutation payload keys must match the schema property names (`isActive`, `sortOrder`, etc.), not the underlying SQL column names (`is_active`, `sort_order`).

**Why:** Sending SQL column names to a Drizzle update produces a server-side 500 because those keys are not valid table properties.

**How to apply:** When adding or fixing callers of `/api/admin/content/*`, inspect the corresponding `lib/db` schema and send camelCase keys; keep snake_case only for direct Supabase REST callers.
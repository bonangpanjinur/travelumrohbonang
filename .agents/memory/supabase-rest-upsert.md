---
name: PostgREST upsert on non-PK unique column
description: How to correctly upsert on a unique-but-not-PK column via the Supabase REST API (PostgREST).
---

When upserting via PostgREST on a column that has a UNIQUE constraint but is NOT the primary key (e.g. `user_id` on `user_roles`), you must:

1. Add `?on_conflict=<column>` to the URL query string
2. Set `Prefer: resolution=merge-duplicates` header

Without the `?on_conflict=` query param, PostgREST cannot determine which unique constraint to use and the upsert silently falls back to PK conflict only — meaning a second insert with the same `user_id` but different `id` will throw a unique constraint violation.

**Why:** PostgREST needs an explicit conflict target. `Prefer: resolution=merge-duplicates` alone is insufficient when the unique constraint is not on the PK column.

**How to apply:**
- Server-side (Node fetch): `fetch(\`\${SUPABASE_URL}/rest/v1/user_roles?on_conflict=user_id\`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: crypto.randomUUID(), user_id, role }) })`
- Client-side (Supabase JS): `supabase.from("user_roles").upsert({ id: crypto.randomUUID(), user_id, role }, { onConflict: "user_id" })` — the JS SDK handles the URL param automatically when `onConflict` is set; still provide `id` for the INSERT path since `user_roles.id` has no DB DEFAULT.

---
name: Role resolution strategy in authMiddleware
description: How getUserRole() resolves conflicts between local Postgres and Supabase HTTP role stores, and why Supabase wins on demotion.
---

## Rule

`getUserRole()` queries BOTH local Postgres and Supabase HTTP in parallel, then picks the **more restrictive** (higher ROLE_RANK) value.

```
ROLE_RANK: super_admin(0) < admin(1) < branch_manager(2) < staff(3) < agent(4) < buyer(5) < user(6)
Higher rank number = less privilege. moreRestrictiveRole() returns the one with higher rank.
```

**Why:** Local Postgres can have a stale elevated role (e.g., user was super_admin in dev, then demoted in Supabase). Without this, the stale elevated role would persist in local DB and grant unintended access.

**How to apply:**
- Always use `getUserRole()`, never `getLocalRole()` or `getSupabaseRole()` directly in `resolveUser()`
- `persistRole()` writes to BOTH stores (local Postgres + Supabase HTTP) on admin email override or first-login assignment
- Admin email override uses `persistRole()` then evicts the token cache entry so stale "buyer" is not served again

## Local-first for performance, Supabase-wins for security

In dev (DATABASE_URL present): local Postgres is queried first (fast, no network). Supabase is also queried to catch demotions.
In production/Vercel (no DATABASE_URL): `getLocalRole()` returns null immediately, Supabase HTTP is used exclusively.

---
name: Role resolution strategy
description: How user roles are resolved in authMiddleware (local Postgres vs Supabase)
---

## Strategy: Supabase is authoritative
`getUserRole()` in `authMiddleware.ts` queries both local Postgres and Supabase in parallel.

**Supabase wins when reachable** — both promotions and demotions set via Supabase dashboard
take effect within the token-cache TTL (60 s). When Supabase returns a role, it is also
synced to local Postgres in the background (fire-and-forget) so future fast-path requests
stay accurate.

**Local Postgres is the fallback** — used only when Supabase HTTP REST is unreachable
(network error, missing env vars, etc).

**Why:** Previous "most restrictive wins" design (local buyer + supabase super_admin → buyer)
blocked legitimate admin promotions made directly in the Supabase dashboard. Supabase-as-
authoritative means a single source of truth; backend still verifies on every request so the
60-second cache window is acceptable.

## ADMIN_EMAILS override
Still applies: if the email is in the `ADMIN_EMAILS` env var allowlist, the user always gets
`super_admin` regardless of DB state. Covers the bootstrap case where no role row exists.

## isAdmin (frontend)
`useAuth.tsx`: `isAdmin = role !== "user" && role !== "buyer"` — all non-buyer roles get
admin panel access (includes agent, staff, branch_manager, admin, super_admin).

`isFullAdmin = role === "super_admin" || role === "admin"` — matches backend `requireAdmin`
middleware; use for UI gated by full admin privilege.

## How to apply
- Never call `getLocalRole` / `getSupabaseRole` directly in other code; always use `getUserRole()`.
- A role cached for up to 60 s; force a fresh lookup by evicting: `tokenCache.delete(token)`.
- New env var `SUPABASE_SERVICE_ROLE_KEY` must be set for Supabase role lookup to work.

---
name: Generic REST proxy unfiltered-write guard
description: PATCH/DELETE on /rest/v1/:table must reject an empty filter, and privilege tables must never be reachable through this proxy at all.
---

**Rule 1:** Any generic table-name-driven REST proxy (`/rest/v1/:table` style) must refuse PATCH/DELETE when the request has no actual filter predicate, on both the direct-pool SQL path and any HTTP-forward-to-PostgREST path. PostgREST itself does not refuse an unfiltered UPDATE/DELETE for a service-role request — it will happily update/delete every row.

**Why:** On 2026-07-08, `user_roles` was reachable through this proxy's `AUTH_TABLES` set (gated only by "is logged in", no ownership/role check). The PATCH handler had a WHERE-clause guard on DELETE but not on PATCH. A PATCH request with zero query params ran `UPDATE user_roles SET role = ...` with no WHERE at all, setting every user in the system to `super_admin` in one call.

**How to apply:**
1. PATCH and DELETE handlers must both reject when `buildWhere(...)` (or equivalent) returns empty — not just DELETE.
2. When a table falls back to forwarding raw query params to PostgREST (e.g. `USE_SUPABASE_HTTP` mode), that forward path needs its own filter check — count only actual filter keys, not `select`/`order`/`limit`/`offset` (those look like query params but aren't predicates and must not satisfy the guard).
3. **Never add a privilege/role table (e.g. `user_roles`) to a generic AUTH_TABLES-style set** that only checks authentication. Role assignment must go exclusively through an admin-gated route (`requireSuperAdmin` or equivalent). Read `.agents/memory/generic-rest-proxy-auth-gaps.md` — AUTH_TABLES has no per-row ownership check either, so this class of gap generalizes beyond just PATCH-without-WHERE: a logged-in "buyer" can still PATCH someone else's row in any AUTH_TABLES entry by supplying an arbitrary victim filter. Treat any new AUTH_TABLES entry as no-ownership-check-writable by default and design accordingly.
4. When writing SQL parameter placeholders by hand (not via an ORM), double-check the `$` prefix survives — a bare `${i+1}` instead of `$${i+1}` silently produces `"col" = 1` instead of a bound parameter and is easy to miss in review.

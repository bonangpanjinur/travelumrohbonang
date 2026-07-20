---
name: Auth middleware anon-key skip
description: Why the auth middleware skips JWT verification for Supabase anon/service-role keys
---

## The Problem
Supabase JS client attaches `Authorization: Bearer <anon-key>` to ALL requests (including REST proxy `/rest/v1/*`). The anon key is a valid JWT but has no `sub` claim — Supabase's `/auth/v1/user` endpoint returns `403 bad_jwt: missing sub claim` for it.

This caused every unauthenticated page load to log "token invalid or Supabase unreachable" and waste a network round-trip.

## The Fix
Added `jwtHasSubClaim(token)` helper in `authMiddleware.ts` that base64-decodes the JWT payload and checks for a `sub` field. If `sub` is missing, `resolveUser` returns null immediately without calling Supabase.

**Why:** User JWTs always have `sub` = user UUID. Anon/service-role keys are JWTs with `role` but no `sub`. This is the canonical way to distinguish them without network calls.

**How to apply:** Any future change to auth middleware must preserve this early-exit before the Supabase HTTP call.

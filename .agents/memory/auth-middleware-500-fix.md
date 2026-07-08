---
name: authMiddleware 500 fix + Supabase JWT hook setup
description: Why admin dashboard button didn't appear, and the full fix chain required.
---

## The problem chain

1. `authMiddleware` had no try-catch → any unhandled async throw → Express 5 → global error handler → 500
2. On 500, `useAuth` fell back to `buildUserFromToken` (JWT claims only)
3. Without Supabase Custom JWT Hook, `app_metadata.role` is absent from JWT → fallback defaults to "buyer"
4. `isAdmin = !!(role && role !== "user" && role !== "buyer")` → false → button hidden

## The three fixes

### 1. authMiddleware try-catch (code)
Wrapped token resolution in try-catch, logs error, proceeds unauthenticated (never blocks request).

### 2. custom_jwt_hook.sql cast bug
`WHERE user_roles.user_id = (event->>'user_id')::uuid` → WRONG, user_id is TEXT not UUID.
Fixed: `WHERE user_roles.user_id = event->>'user_id'`

### 3. user_roles in Supabase
Table must exist in Supabase for getSupabaseRole and persistRole to work.
Migration: `supabase/migrations/create_user_roles_table.sql` — idempotent, safe to re-run.
Uses DO $$ block for policy creation (CREATE POLICY IF NOT EXISTS not valid in all PG versions).

## Full setup checklist for Supabase (one-time)

1. Run `create_user_roles_table.sql` in Supabase SQL Editor
2. Run `custom_jwt_hook.sql` in Supabase SQL Editor  
3. Supabase Dashboard → Authentication → Hooks → Custom Access Token Hook
   → Type: Postgres Function → Function: public.custom_access_token_hook
4. User must logout + login again (JWT needs to be reissued with new claims)

**Why:** The JWT hook embeds `app_metadata.role` into every new token. Without it, the JWT fallback always gives "buyer" even when the API correctly returns super_admin — because the JWT fallback reads claims only.

## Vercel env vars required (all must be set)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` ← critical for getSupabaseRole  
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `ADMIN_EMAILS` ← safety net, assigns super_admin by email match
- `VITE_SUPABASE_PROJECT_ID`

**NOT needed on Vercel:** `DATABASE_URL` (Vercel uses Supabase REST, not direct Postgres)

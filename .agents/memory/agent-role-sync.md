---
name: Agent role sync
description: How agent accounts are auto-registered and linked to agents table records
---

# Agent Role Sync Pattern

## Rule
When admin sets a user's role to `'agent'` via `PATCH /api/admin/users/:id`, the backend automatically ensures an `agents` row exists and is linked via `agents.user_id`.

## How to apply
Logic lives in `syncAgentRecord()` in `artifacts/api-server/src/routes/admin/users.ts`:
1. Called after profile update whenever `updates.role` is present
2. role → 'agent': look up by user_id first, then by email, then auto-create
3. role → anything else: set `agents.user_id = null` (unlink, do NOT delete)

**Why:** agents records persist for historical booking/commission data even if role is revoked.

## Backfill
`supabase/migrations/20260731000001_backfill_agent_user_ids.sql` — idempotent UPDATE that links existing agents by email match where user_id is null and profiles.role = 'agent'.

## Related fallback
`scopeGuard.ts` resolveUserScope also does email fallback + auto-link at request time as a secondary safety net.

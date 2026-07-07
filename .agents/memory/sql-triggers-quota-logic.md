---
name: SQL quota trigger logic for bookings/package_departures
description: Business logic triggers applied to local Postgres — quota management, auto-confirm, commission, notifications.
---

## Rule

All business logic triggers live in `scripts/migrations/business_logic_triggers.sql`. Re-run this file idempotently (DROP TRIGGER IF EXISTS before CREATE TRIGGER) after any schema change.

## Quota Trigger Edge Cases

`fn_booking_quota_on_update()` handles three cases:
1. **Departure reassignment** (departure_id changes while booking is active on both sides): restore slot to old departure, consume from new (with hard quota guard)
2. **Cancellation**: restore slot to current departure
3. **Reactivation from cancelled**: consume slot with hard quota guard

`fn_booking_quota_on_insert()` uses `SELECT ... FOR UPDATE` to prevent concurrent oversubscription. Raises `check_violation` exception when quota = 0.

**Why:** Using `GREATEST(0, remaining_quota - 1)` silently allows oversubscription. Hard guard via `FOR UPDATE` lock + `RAISE EXCEPTION` makes oversubscription an explicit error.

## Dollar-Quote Fix

`$$` delimiters in plpgsql functions can be corrupted to `$` by the Edit tool. If a SQL file has broken `AS $` or `$;` lines, fix via Python:
```python
lines[i] = 'AS $$\n'  # or '$$;\n'
```
Do NOT use shell heredoc with `$$` (it expands to PID in bash).

## Trigger List (8 total)
- `trg_users_updated_at` — BEFORE UPDATE users → set updated_at
- `trg_booking_quota_insert` — AFTER INSERT bookings → decrement quota
- `trg_booking_quota_update` — AFTER UPDATE bookings → quota on cancel/reactivate/reassign
- `trg_booking_payment_auto_confirm` — AFTER INSERT/UPDATE booking_payments → auto-confirm when paid
- `trg_booking_commission` — AFTER UPDATE bookings → create agent_commissions on confirm
- `trg_booking_status_notification` — AFTER UPDATE bookings → notify user on status change
- `trg_handle_new_local_user` — AFTER INSERT users → create profiles + user_roles(buyer)

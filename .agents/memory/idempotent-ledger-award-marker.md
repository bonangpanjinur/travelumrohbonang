---
name: Idempotent ledger awards via marker field
description: Pattern for making one-time point/credit grants tied to an event safe to retry, without adding new schema columns.
---

When a ledger-style table (e.g. loyalty points, credits, referral bonuses) needs
to award a one-time amount tied to a business event (e.g. "booking completed"),
and the event handler might fire more than once (webhook retries, admin
re-clicking a status button, cron re-runs), guard against double-awarding.

**Why:** Adding a new `booking_id` / `event_id` foreign-key column to an
existing ledger table is often unnecessary schema churn when the table already
has a generic `description` or similar free-text field.

**How to apply:** encode a stable marker (e.g. `booking:${bookingId}`) in the
ledger row's `description` field at insert time. Before granting, query for an
existing row with that exact marker + the relevant `source`/type; if found,
skip (return a no-op result) instead of inserting again. This makes the award
function safe to call unconditionally from multiple call sites (e.g. every time
a status transitions to "completed") without needing a separate "has this been
awarded" check elsewhere.

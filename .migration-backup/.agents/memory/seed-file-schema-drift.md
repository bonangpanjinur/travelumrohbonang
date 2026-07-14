---
name: Seed file schema drift
description: sql/seeds/supabase-seed.sql referenced columns removed from the live Drizzle schema, breaking seeding after a fresh db push
---
`sql/seeds/supabase-seed.sql` inserted into `package_categories.icon` and `muthawifs.bio`/`muthawifs.is_active`, none of which exist in the current Drizzle schema (`lib/db`). Running the seed as-is after a fresh `drizzle-kit push` fails with "column does not exist", and the failure cascades: packages/departures/prices/commissions all depend on category_id/muthawif_id FKs, so one bad early insert leaves dozens of downstream rows missing.

**Why:** seed SQL is hand-maintained separately from the Drizzle schema and drifts silently; nothing fails until you actually try to seed a fresh empty database (e.g. after Replit's own Postgres gets used instead of Supabase, or after a schema reset).

**How to apply:** before trusting seed output, run `psql "$DATABASE_URL" -c "\d <table>"` on any table that errors and drop/adjust columns in the seed file to match. Re-run the seed script — it's idempotent (`ON CONFLICT DO NOTHING`), so re-running after a partial failure is safe and will fill in the previously-blocked FK-dependent rows.

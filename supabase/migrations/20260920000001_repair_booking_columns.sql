-- Repair schema drift for bookings created by the current API.
-- Production may have skipped one or more historical booking migrations;
-- every statement is idempotent so this can safely run on existing data.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS exchange_rate double precision DEFAULT 1,
  ADD COLUMN IF NOT EXISTS payment_policy_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS payment_schedule_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS policy_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS policy_accepted_version text,
  ADD COLUMN IF NOT EXISTS invoice_preferences jsonb,
  ADD COLUMN IF NOT EXISTS pic_id text,
  ADD COLUMN IF NOT EXISTS pic_type text,
  ADD COLUMN IF NOT EXISTS is_group_booking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_name text,
  ADD COLUMN IF NOT EXISTS pic_name text,
  ADD COLUMN IF NOT EXISTS pic_phone text,
  ADD COLUMN IF NOT EXISTS pic_email text,
  ADD COLUMN IF NOT EXISTS pemesan_name text,
  ADD COLUMN IF NOT EXISTS pemesan_phone text,
  ADD COLUMN IF NOT EXISTS pemesan_email text,
  ADD COLUMN IF NOT EXISTS pax_count integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_bookings_approval_expiry
  ON public.bookings (status, approval_expires_at);

-- Normalize any legacy NULL values before the application relies on pax_count.
UPDATE public.bookings
SET pax_count = 1
WHERE pax_count IS NULL;

ALTER TABLE public.bookings
  ALTER COLUMN pax_count SET DEFAULT 1,
  ALTER COLUMN pax_count SET NOT NULL;

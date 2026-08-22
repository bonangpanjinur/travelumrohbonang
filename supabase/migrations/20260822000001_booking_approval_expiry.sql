-- Booking approval expiry: an approved booking holds seats only until this timestamp
-- when no payment has been recorded.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_bookings_approval_expiry
  ON public.bookings (status, approval_expires_at)
  WHERE status = 'confirmed' AND approval_expires_at IS NOT NULL;

-- Give legacy confirmed bookings one full approval window from migration time.
-- Bookings with recorded payment are harmless here because the expiry job checks
-- for the absence of non-void payments before expiring anything.
UPDATE public.bookings
SET approved_at = COALESCE(approved_at, NOW()),
    approval_expires_at = COALESCE(approval_expires_at, NOW() + INTERVAL '24 hours')
WHERE status = 'confirmed'
  AND approval_expires_at IS NULL;

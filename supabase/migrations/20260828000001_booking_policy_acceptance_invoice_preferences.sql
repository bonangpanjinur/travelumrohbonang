ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS policy_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS policy_accepted_version TEXT,
  ADD COLUMN IF NOT EXISTS invoice_preferences JSONB;

COMMENT ON COLUMN bookings.policy_accepted_at IS 'Timestamp when customer accepted the effective payment policy.';
COMMENT ON COLUMN bookings.policy_accepted_version IS 'Immutable effective policy version captured at booking time.';
COMMENT ON COLUMN bookings.invoice_preferences IS 'Customer-selected invoice channels and visible sections.';

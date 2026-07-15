-- Sprint 1 — Payment audit fields
-- Adds verified_by, verified_at, rejection_reason to the payments table
-- so admins can be tracked when they approve or reject manual payment proofs.
--
-- Safe to run multiple times (IF NOT EXISTS guards).

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS verified_by       text,
  ADD COLUMN IF NOT EXISTS verified_at       timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason  text;

COMMENT ON COLUMN payments.verified_by      IS 'admin user_id who verified or rejected this payment';
COMMENT ON COLUMN payments.verified_at      IS 'timestamp of verification/rejection action';
COMMENT ON COLUMN payments.rejection_reason IS 'reason provided by admin when rejecting a payment proof';

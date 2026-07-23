-- Migration: add proof_url column to booking_payments
-- Root cause: original schema migration did not include this column,
-- causing INSERT failures (500) when admin records a manual payment.

ALTER TABLE "booking_payments"
  ADD COLUMN IF NOT EXISTS "proof_url" text;

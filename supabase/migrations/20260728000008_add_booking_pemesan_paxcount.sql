-- ============================================================
-- Migration: Add pemesan_* and pax_count columns to bookings
-- These columns exist in the Drizzle schema but were never
-- added to the database via a migration, causing the booking
-- list page to fail with a "column does not exist" error.
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS pemesan_name  TEXT,
  ADD COLUMN IF NOT EXISTS pemesan_phone TEXT,
  ADD COLUMN IF NOT EXISTS pemesan_email TEXT,
  ADD COLUMN IF NOT EXISTS pax_count     INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN bookings.pemesan_name  IS 'Name of the person who made the booking (may differ from pilgrims)';
COMMENT ON COLUMN bookings.pemesan_phone IS 'Phone of the person who made the booking';
COMMENT ON COLUMN bookings.pemesan_email IS 'Email of the person who made the booking';
COMMENT ON COLUMN bookings.pax_count     IS 'Number of seats consumed by this booking (1 for single, N for group)';

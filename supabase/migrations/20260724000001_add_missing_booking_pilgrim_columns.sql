-- ============================================================
-- Add missing columns to booking_pilgrims
-- seat_number, flight_segment, notes were added to the Drizzle
-- schema (O-10) but never landed in a DB migration, causing
-- Drizzle's RETURNING to fail with "column does not exist".
-- ============================================================

ALTER TABLE booking_pilgrims ADD COLUMN IF NOT EXISTS seat_number text;
ALTER TABLE booking_pilgrims ADD COLUMN IF NOT EXISTS flight_segment text;
ALTER TABLE booking_pilgrims ADD COLUMN IF NOT EXISTS notes text;

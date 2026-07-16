-- Group Booking: add coordinator/group fields to the bookings table
-- Run this migration against your Supabase / PostgreSQL database.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS is_group_booking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_name       text,
  ADD COLUMN IF NOT EXISTS pic_name         text,
  ADD COLUMN IF NOT EXISTS pic_phone        text,
  ADD COLUMN IF NOT EXISTS pic_email        text;

COMMENT ON COLUMN bookings.is_group_booking IS 'True for group/family/mosque bookings';
COMMENT ON COLUMN bookings.group_name       IS 'Group label, e.g. Rombongan Masjid Al-Ikhlas';
COMMENT ON COLUMN bookings.pic_name         IS 'Group coordinator full name';
COMMENT ON COLUMN bookings.pic_phone        IS 'Group coordinator phone number';
COMMENT ON COLUMN bookings.pic_email        IS 'Group coordinator email address';

-- Add missing columns to pilgrim_equipment that exist in Drizzle schema
-- but were omitted from the original 20260718000000_sync_drizzle_schema.sql migration.
-- All columns are optional (nullable or have defaults) so existing rows are unaffected.

ALTER TABLE pilgrim_equipment
  ADD COLUMN IF NOT EXISTS returned_at  timestamptz,
  ADD COLUMN IF NOT EXISTS size         text,
  ADD COLUMN IF NOT EXISTS quantity     integer NOT NULL DEFAULT 1;

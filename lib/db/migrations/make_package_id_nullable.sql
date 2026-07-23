-- Migration: make package_departures.package_id nullable
-- Run this once against your Supabase database when applying this schema change.
--
-- This allows departures to exist before being linked to a package.
-- When a package is deleted, its departures will have package_id set to NULL
-- (SET NULL) instead of being deleted (CASCADE).

-- Step 1: Drop the existing NOT NULL constraint and CASCADE foreign key
ALTER TABLE package_departures
  DROP CONSTRAINT IF EXISTS package_departures_package_id_fkey;

-- Step 2: Re-add the foreign key as nullable with SET NULL on delete
ALTER TABLE package_departures
  ALTER COLUMN package_id DROP NOT NULL;

ALTER TABLE package_departures
  ADD CONSTRAINT package_departures_package_id_fkey
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL;

-- Fix FK constraint names so PostgREST hints in API queries resolve correctly.
--
-- Root cause: the initial migration used Drizzle's long auto-generated names
-- (e.g. packages_category_id_package_categories_id_fk) but all API routes
-- reference the short PostgreSQL convention names (e.g. packages_category_id_fkey).
-- PostgREST resolves join hints by exact constraint name, so the mismatch causes
-- PGRST200 "Could not find a relationship" errors.
--
-- Safe to run multiple times: each block checks before acting.

-- ── 1. packages.category_id → package_categories.id ─────────────────────────
DO $$
BEGIN
  -- Rename if it was created with Drizzle's long name
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'packages_category_id_package_categories_id_fk'
  ) THEN
    ALTER TABLE packages
      RENAME CONSTRAINT packages_category_id_package_categories_id_fk
      TO packages_category_id_fkey;
  END IF;

  -- Create from scratch if neither name exists yet
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'packages_category_id_fkey'
  ) THEN
    ALTER TABLE packages
      ADD CONSTRAINT packages_category_id_fkey
        FOREIGN KEY (category_id) REFERENCES package_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── 2. departure_prices.departure_id → package_departures.id ─────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'departure_prices_departure_id_package_departures_id_fk'
  ) THEN
    ALTER TABLE departure_prices
      RENAME CONSTRAINT departure_prices_departure_id_package_departures_id_fk
      TO departure_prices_departure_id_fkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'departure_prices_departure_id_fkey'
  ) THEN
    ALTER TABLE departure_prices
      ADD CONSTRAINT departure_prices_departure_id_fkey
        FOREIGN KEY (departure_id) REFERENCES package_departures(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── 3. Verify the other 6 _fkey constraints needed by the packages route ──────
-- These were added via ALTER TABLE ADD COLUMN ... REFERENCES or CREATE TABLE ...
-- REFERENCES, so PostgreSQL auto-names them with the short _fkey convention.
-- They should already be correct, but we ensure them here for completeness.

-- package_departures.package_id → packages.id
-- (handled by 20260727000001_make_package_id_nullable.sql — skipped here)

-- package_departures.airline_id → airlines.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'package_departures_airline_id_fkey'
  ) THEN
    ALTER TABLE package_departures
      ADD CONSTRAINT package_departures_airline_id_fkey
        FOREIGN KEY (airline_id) REFERENCES airlines(id) ON DELETE SET NULL;
  END IF;
END $$;

-- package_departures.hotel_makkah_id → hotels.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'package_departures_hotel_makkah_id_fkey'
  ) THEN
    ALTER TABLE package_departures
      ADD CONSTRAINT package_departures_hotel_makkah_id_fkey
        FOREIGN KEY (hotel_makkah_id) REFERENCES hotels(id) ON DELETE SET NULL;
  END IF;
END $$;

-- package_departures.hotel_madinah_id → hotels.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'package_departures_hotel_madinah_id_fkey'
  ) THEN
    ALTER TABLE package_departures
      ADD CONSTRAINT package_departures_hotel_madinah_id_fkey
        FOREIGN KEY (hotel_madinah_id) REFERENCES hotels(id) ON DELETE SET NULL;
  END IF;
END $$;

-- departure_hotels.departure_id → package_departures.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'departure_hotels_departure_id_fkey'
  ) THEN
    ALTER TABLE departure_hotels
      ADD CONSTRAINT departure_hotels_departure_id_fkey
        FOREIGN KEY (departure_id) REFERENCES package_departures(id) ON DELETE CASCADE;
  END IF;
END $$;

-- departure_hotels.hotel_id → hotels.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'departure_hotels_hotel_id_fkey'
  ) THEN
    ALTER TABLE departure_hotels
      ADD CONSTRAINT departure_hotels_hotel_id_fkey
        FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE;
  END IF;
END $$;

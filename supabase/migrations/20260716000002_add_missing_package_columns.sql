-- Add columns that may be missing from packages table
-- (safe to run multiple times — ADD COLUMN IF NOT EXISTS is idempotent)

ALTER TABLE packages ADD COLUMN IF NOT EXISTS hotel_makkah_id   text;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS hotel_madinah_id  text;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS airline_id         text;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS airport_id         text;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS minimum_dp         integer;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS dp_deadline_days   integer;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS full_deadline_days integer;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS required_doc_types text;

-- Add FK constraints (skip if already exists)
DO $$ BEGIN
  ALTER TABLE packages ADD CONSTRAINT packages_hotel_makkah_id_hotels_id_fk
    FOREIGN KEY (hotel_makkah_id) REFERENCES hotels(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE packages ADD CONSTRAINT packages_hotel_madinah_id_hotels_id_fk
    FOREIGN KEY (hotel_madinah_id) REFERENCES hotels(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE packages ADD CONSTRAINT packages_airline_id_airlines_id_fk
    FOREIGN KEY (airline_id) REFERENCES airlines(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE packages ADD CONSTRAINT packages_airport_id_airports_id_fk
    FOREIGN KEY (airport_id) REFERENCES airports(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

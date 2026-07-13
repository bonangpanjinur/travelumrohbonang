-- ============================================================
-- Tambah FK constraints yang hilang di tabel `packages` (Supabase live DB)
--
-- LATAR BELAKANG:
--   Halaman detail paket (/paket/:slug) query lewat Supabase client dengan
--   nested-select:
--     hotel_makkah:hotels!packages_hotel_makkah_id_fkey(name, star)
--     hotel_madinah:hotels!packages_hotel_madinah_id_fkey(name, star)
--     airline:airlines(name)
--     airport:airports(name, city)
--     category:package_categories(name)
--   PostgREST butuh FK constraint asli di database untuk resolve relasi ini.
--   Tanpa FK, semua query di atas gagal dengan 400 PGRST200:
--   "Could not find a relationship between 'packages' and 'hotels' in the schema cache"
--   — walau kolom category_id/hotel_makkah_id/dll. sudah ada dan berisi data valid.
--
-- CARA PAKAI:
--   Buka Supabase Dashboard (project terkait) → SQL Editor → paste & jalankan.
--   Idempotent — aman dijalankan berulang kali (DO NOTHING kalau constraint sudah ada).
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'packages_category_id_fkey' AND table_name = 'packages'
  ) THEN
    ALTER TABLE packages
      ADD CONSTRAINT packages_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES package_categories(id) ON DELETE SET NULL;
    RAISE NOTICE 'Created: packages_category_id_fkey';
  ELSE
    RAISE NOTICE 'Already exists: packages_category_id_fkey';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'packages_hotel_makkah_id_fkey' AND table_name = 'packages'
  ) THEN
    ALTER TABLE packages
      ADD CONSTRAINT packages_hotel_makkah_id_fkey
      FOREIGN KEY (hotel_makkah_id) REFERENCES hotels(id) ON DELETE SET NULL;
    RAISE NOTICE 'Created: packages_hotel_makkah_id_fkey';
  ELSE
    RAISE NOTICE 'Already exists: packages_hotel_makkah_id_fkey';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'packages_hotel_madinah_id_fkey' AND table_name = 'packages'
  ) THEN
    ALTER TABLE packages
      ADD CONSTRAINT packages_hotel_madinah_id_fkey
      FOREIGN KEY (hotel_madinah_id) REFERENCES hotels(id) ON DELETE SET NULL;
    RAISE NOTICE 'Created: packages_hotel_madinah_id_fkey';
  ELSE
    RAISE NOTICE 'Already exists: packages_hotel_madinah_id_fkey';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'packages_airline_id_fkey' AND table_name = 'packages'
  ) THEN
    ALTER TABLE packages
      ADD CONSTRAINT packages_airline_id_fkey
      FOREIGN KEY (airline_id) REFERENCES airlines(id) ON DELETE SET NULL;
    RAISE NOTICE 'Created: packages_airline_id_fkey';
  ELSE
    RAISE NOTICE 'Already exists: packages_airline_id_fkey';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'packages_airport_id_fkey' AND table_name = 'packages'
  ) THEN
    ALTER TABLE packages
      ADD CONSTRAINT packages_airport_id_fkey
      FOREIGN KEY (airport_id) REFERENCES airports(id) ON DELETE SET NULL;
    RAISE NOTICE 'Created: packages_airport_id_fkey';
  ELSE
    RAISE NOTICE 'Already exists: packages_airport_id_fkey';
  END IF;
END $$;

-- package_departures.package_id → packages.id (dipakai oleh nested-select departures di beberapa halaman)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'package_departures_package_id_fkey' AND table_name = 'package_departures'
  ) THEN
    ALTER TABLE package_departures
      ADD CONSTRAINT package_departures_package_id_fkey
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE;
    RAISE NOTICE 'Created: package_departures_package_id_fkey';
  ELSE
    RAISE NOTICE 'Already exists: package_departures_package_id_fkey';
  END IF;
END $$;

-- departure_prices.departure_id → package_departures.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'departure_prices_departure_id_fkey' AND table_name = 'departure_prices'
  ) THEN
    ALTER TABLE departure_prices
      ADD CONSTRAINT departure_prices_departure_id_fkey
      FOREIGN KEY (departure_id) REFERENCES package_departures(id) ON DELETE CASCADE;
    RAISE NOTICE 'Created: departure_prices_departure_id_fkey';
  ELSE
    RAISE NOTICE 'Already exists: departure_prices_departure_id_fkey';
  END IF;
END $$;

-- package_hotels.package_id → packages.id, package_hotels.hotel_id → hotels.id
-- (dipakai oleh "Hotel Tambahan" nested-select di PackageDetail.tsx)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'package_hotels_package_id_fkey' AND table_name = 'package_hotels'
  ) THEN
    ALTER TABLE package_hotels
      ADD CONSTRAINT package_hotels_package_id_fkey
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE;
    RAISE NOTICE 'Created: package_hotels_package_id_fkey';
  ELSE
    RAISE NOTICE 'Already exists: package_hotels_package_id_fkey';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'package_hotels_hotel_id_fkey' AND table_name = 'package_hotels'
  ) THEN
    ALTER TABLE package_hotels
      ADD CONSTRAINT package_hotels_hotel_id_fkey
      FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE SET NULL;
    RAISE NOTICE 'Created: package_hotels_hotel_id_fkey';
  ELSE
    RAISE NOTICE 'Already exists: package_hotels_hotel_id_fkey';
  END IF;
END $$;

-- ============================================================
-- Verifikasi setelah menjalankan script:
-- ============================================================
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('packages', 'package_departures', 'departure_prices', 'package_hotels')
ORDER BY tc.table_name, tc.constraint_name;

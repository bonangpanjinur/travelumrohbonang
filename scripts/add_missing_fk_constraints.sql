-- ============================================================
-- Tambah FK constraints yang hilang di Supabase live DB
-- 
-- CARA PAKAI:
--   Buka Supabase Dashboard → SQL Editor → paste & jalankan
--
-- Constraints ini dibutuhkan oleh PostgREST untuk nested-select
-- (embedded relationship). Tanpa FK ini, query dengan sintaks
-- profile:profiles!bookings_user_id_profiles_fkey(...)
-- atau booking:bookings(booking_code) akan mengembalikan 400 PGRST200.
--
-- Script ini menggunakan IF NOT EXISTS / DO NOTHING pattern sehingga
-- aman dijalankan berulang kali.
-- ============================================================

-- 1. bookings.user_id → profiles.id
--    Digunakan oleh: Dashboard admin (recent bookings), useAdminNotifications
--    Query yang gagal: profiles!bookings_user_id_profiles_fkey(name, email)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bookings_user_id_profiles_fkey'
      AND table_name = 'bookings'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
    RAISE NOTICE 'Created: bookings_user_id_profiles_fkey';
  ELSE
    RAISE NOTICE 'Already exists: bookings_user_id_profiles_fkey';
  END IF;
END $$;

-- 2. bookings.package_id → packages.id
--    Digunakan oleh: Dashboard admin (recent bookings package title)
--    Query yang gagal: package:packages(title)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bookings_package_id_packages_fkey'
      AND table_name = 'bookings'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_package_id_packages_fkey
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL;
    RAISE NOTICE 'Created: bookings_package_id_packages_fkey';
  ELSE
    RAISE NOTICE 'Already exists: bookings_package_id_packages_fkey';
  END IF;
END $$;

-- 3. payments.booking_id → bookings.id
--    Digunakan oleh: useAdminNotifications (pending payments with booking_code)
--    Query yang gagal: booking:bookings(booking_code)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payments_booking_id_bookings_fkey'
      AND table_name = 'payments'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_booking_id_bookings_fkey
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
    RAISE NOTICE 'Created: payments_booking_id_bookings_fkey';
  ELSE
    RAISE NOTICE 'Already exists: payments_booking_id_bookings_fkey';
  END IF;
END $$;

-- 4. bookings.departure_id → package_departures.id
--    Digunakan oleh: berbagai query yang embed departure data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bookings_departure_id_package_departures_fkey'
      AND table_name = 'bookings'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_departure_id_package_departures_fkey
      FOREIGN KEY (departure_id) REFERENCES package_departures(id) ON DELETE SET NULL;
    RAISE NOTICE 'Created: bookings_departure_id_package_departures_fkey';
  ELSE
    RAISE NOTICE 'Already exists: bookings_departure_id_package_departures_fkey';
  END IF;
END $$;

-- 5. booking_pilgrims.booking_id → bookings.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'booking_pilgrims_booking_id_bookings_fkey'
      AND table_name = 'booking_pilgrims'
  ) THEN
    ALTER TABLE booking_pilgrims
      ADD CONSTRAINT booking_pilgrims_booking_id_bookings_fkey
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
    RAISE NOTICE 'Created: booking_pilgrims_booking_id_bookings_fkey';
  ELSE
    RAISE NOTICE 'Already exists: booking_pilgrims_booking_id_bookings_fkey';
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
  AND tc.table_name IN ('bookings', 'payments', 'booking_pilgrims')
ORDER BY tc.table_name, tc.constraint_name;

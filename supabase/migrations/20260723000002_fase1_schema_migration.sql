-- FASE 1: Migrasi Database Schema
-- Arsitektur baru: paket = template produk, keberangkatan = instansi nyata
-- Urutan: tambah kolom baru → migrasi data → hapus kolom lama

-- ============================================================
-- 1.2: Tambah hotel_makkah_id dan hotel_madinah_id ke package_departures
-- ============================================================
ALTER TABLE package_departures
  ADD COLUMN IF NOT EXISTS hotel_makkah_id TEXT REFERENCES hotels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hotel_madinah_id TEXT REFERENCES hotels(id) ON DELETE SET NULL;

-- ============================================================
-- 1.4: Migrasi data — salin hotel dari packages ke package_departures
-- (airline sudah ada di package_departures, tidak perlu disalin)
-- ============================================================
UPDATE package_departures pd
SET
  hotel_makkah_id = COALESCE(pd.hotel_makkah_id, p.hotel_makkah_id),
  hotel_madinah_id = COALESCE(pd.hotel_madinah_id, p.hotel_madinah_id)
FROM packages p
WHERE pd.package_id = p.id
  AND (p.hotel_makkah_id IS NOT NULL OR p.hotel_madinah_id IS NOT NULL);

-- ============================================================
-- 1.3: Buat tabel departure_hotels (gantikan package_hotels, FK ke departure)
-- ============================================================
CREATE TABLE IF NOT EXISTS departure_hotels (
  id          TEXT PRIMARY KEY,
  departure_id TEXT REFERENCES package_departures(id) ON DELETE CASCADE,
  hotel_id    TEXT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  label       TEXT,
  sort_order  INTEGER,
  created_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_departure_hotels_departure_id ON departure_hotels(departure_id);
CREATE INDEX IF NOT EXISTS idx_departure_hotels_hotel_id     ON departure_hotels(hotel_id);

-- 1.3: Migrasi data package_hotels → departure_hotels
-- Link ke keberangkatan pertama dari setiap paket (best-effort migration)
INSERT INTO departure_hotels (id, departure_id, hotel_id, label, sort_order, created_at)
SELECT
  ph.id,
  (
    SELECT pd.id
    FROM package_departures pd
    WHERE pd.package_id = ph.package_id
    ORDER BY pd.departure_date ASC
    LIMIT 1
  ) AS departure_id,
  ph.hotel_id,
  ph.label,
  ph.sort_order,
  ph.created_at
FROM package_hotels ph
WHERE ph.package_id IS NOT NULL
  AND (
    SELECT pd.id
    FROM package_departures pd
    WHERE pd.package_id = ph.package_id
    ORDER BY pd.departure_date ASC
    LIMIT 1
  ) IS NOT NULL;

-- 1.3: Hapus tabel lama package_hotels
DROP TABLE IF EXISTS package_hotels;

-- ============================================================
-- 1.1: Hapus kolom hotel dan maskapai dari packages
-- (data sudah disalin ke package_departures di atas)
-- ============================================================
ALTER TABLE packages
  DROP COLUMN IF EXISTS hotel_makkah_id,
  DROP COLUMN IF EXISTS hotel_madinah_id,
  DROP COLUMN IF EXISTS airline_id,
  DROP COLUMN IF EXISTS airport_id;

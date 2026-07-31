-- ============================================================
-- MIGRATION: Schema Update untuk UmrohPlus Production
-- Jalankan seluruh file ini di Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → paste → Run)
--
-- Semua statement menggunakan IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- sehingga aman dijalankan berulang kali.
-- ============================================================

-- ------------------------------------------------------------
-- 1. KOLOM BARU DI TABEL BOOKINGS
-- ------------------------------------------------------------
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS pic_id           TEXT,
  ADD COLUMN IF NOT EXISTS pic_type         TEXT,
  ADD COLUMN IF NOT EXISTS is_group_booking BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_name       TEXT,
  ADD COLUMN IF NOT EXISTS pic_name         TEXT,
  ADD COLUMN IF NOT EXISTS pic_phone        TEXT,
  ADD COLUMN IF NOT EXISTS pic_email        TEXT,
  ADD COLUMN IF NOT EXISTS pemesan_name     TEXT,
  ADD COLUMN IF NOT EXISTS pemesan_phone    TEXT,
  ADD COLUMN IF NOT EXISTS pemesan_email    TEXT,
  ADD COLUMN IF NOT EXISTS pax_count        INTEGER NOT NULL DEFAULT 1;

-- ------------------------------------------------------------
-- 2. KOLOM BARU DI TABEL BOOKING_PILGRIMS
-- ------------------------------------------------------------
ALTER TABLE booking_pilgrims
  ADD COLUMN IF NOT EXISTS pilgrim_id      TEXT,
  ADD COLUMN IF NOT EXISTS seat_number     TEXT,
  ADD COLUMN IF NOT EXISTS flight_segment  TEXT;

CREATE INDEX IF NOT EXISTS idx_booking_pilgrims_pilgrim_id ON booking_pilgrims(pilgrim_id);

-- ------------------------------------------------------------
-- 3. KOLOM BARU DI TABEL EQUIPMENT
-- ------------------------------------------------------------
ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS total_stock INTEGER NOT NULL DEFAULT 0;

-- ------------------------------------------------------------
-- 4. TABEL BARU: booking_rooms (alokasi kamar per booking)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_rooms (
  id          TEXT PRIMARY KEY,
  booking_id  TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  room_type   TEXT NOT NULL,
  price       NUMERIC NOT NULL,
  quantity    INTEGER NOT NULL,
  subtotal    NUMERIC NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_booking_rooms_booking_id ON booking_rooms(booking_id);

-- ------------------------------------------------------------
-- 5. TABEL BARU: booking_status_logs (BK-03 audit trail)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_status_logs (
  id          TEXT PRIMARY KEY,
  booking_id  TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  changed_by  TEXT,
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_booking_status_logs_booking_id ON booking_status_logs(booking_id);

-- ------------------------------------------------------------
-- 6. TABEL BARU: pilgrims — master data jemaah (JM-DB01)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pilgrims (
  id              TEXT PRIMARY KEY,
  nik             TEXT UNIQUE,
  passport_number TEXT UNIQUE,
  name            TEXT NOT NULL,
  birth_date      TEXT,
  nationality     TEXT DEFAULT 'WNI',
  phone           TEXT,
  email           TEXT,
  gender          TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pilgrims_name ON pilgrims(name);

-- ------------------------------------------------------------
-- 7. TABEL BARU: manifests — snapshot manifest saat cetak (MN-DB01)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manifests (
  id             TEXT PRIMARY KEY,
  departure_id   TEXT REFERENCES package_departures(id) ON DELETE CASCADE,
  printed_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  printed_by     TEXT,
  total_pilgrims INTEGER NOT NULL DEFAULT 0,
  format         TEXT NOT NULL DEFAULT 'pdf',
  snapshot_json  TEXT,
  created_at     TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_manifests_departure_id ON manifests(departure_id);

-- ------------------------------------------------------------
-- 8. TABEL BARU: pilgrim_equipment — distribusi perlengkapan (PL-DB01)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pilgrim_equipment (
  id              TEXT PRIMARY KEY,
  pilgrim_id      TEXT NOT NULL REFERENCES booking_pilgrims(id) ON DELETE CASCADE,
  equipment_id    TEXT NOT NULL REFERENCES equipment(id),
  booking_id      TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending',
  distributed_at  TIMESTAMP WITH TIME ZONE,
  distributed_by  TEXT,
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pilgrim_equipment_pilgrim_id ON pilgrim_equipment(pilgrim_id);
CREATE INDEX IF NOT EXISTS idx_pilgrim_equipment_booking_id ON pilgrim_equipment(booking_id);

-- ------------------------------------------------------------
-- 9. TABEL BARU: savings_accounts & savings_transactions (Tabungan Umroh)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS savings_accounts (
  id                   TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL,
  target_package_id    TEXT,
  target_package_name  TEXT,
  target_amount        INTEGER NOT NULL DEFAULT 0,
  current_balance      INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'active',
  notes                TEXT,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at           TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_savings_accounts_user_id ON savings_accounts(user_id);

CREATE TABLE IF NOT EXISTS savings_transactions (
  id               TEXT PRIMARY KEY,
  account_id       TEXT NOT NULL,
  amount           INTEGER NOT NULL,
  type             TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  proof_url        TEXT,
  notes            TEXT,
  rejection_reason TEXT,
  booking_id       TEXT,
  recorded_by      TEXT,
  verified_at      TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_savings_tx_account_id ON savings_transactions(account_id);

-- ------------------------------------------------------------
-- 10. SINKRONISASI remaining_quota DARI BOOKING AKTUAL
-- Perbaiki nilai remaining_quota yang tidak sinkron.
-- (Jalankan setelah kolom/tabel di atas berhasil dibuat)
-- ------------------------------------------------------------
UPDATE package_departures pd
SET remaining_quota = GREATEST(0,
  pd.quota - (
    SELECT COUNT(*)
    FROM bookings b
    WHERE b.departure_id = pd.id
      AND b.status <> 'cancelled'
  )
),
status = CASE
  WHEN pd.quota - (
    SELECT COUNT(*)
    FROM bookings b
    WHERE b.departure_id = pd.id
      AND b.status <> 'cancelled'
  ) <= 0 THEN 'penuh'
  ELSE pd.status
END;

-- ============================================================
-- SELESAI. Refresh halaman admin setelah menjalankan ini.
-- ============================================================

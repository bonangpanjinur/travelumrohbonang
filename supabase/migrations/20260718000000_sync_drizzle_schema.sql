-- Sync Drizzle schema → Supabase production
-- Generated: 2026-07-18
-- Applies: 4 missing tables + 6 missing columns discovered by full schema diff

-- ══════════════════════════════════════════════════════════════
-- TABEL BARU
-- ══════════════════════════════════════════════════════════════

-- 1. pilgrims — master jamaah lintas booking (JM-DB01)
CREATE TABLE IF NOT EXISTS pilgrims (
  id              text PRIMARY KEY,
  nik             text,
  passport_number text,
  name            text NOT NULL,
  birth_date      text,
  nationality     text DEFAULT 'WNI',
  phone           text,
  email           text,
  gender          text,
  created_at      timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pilgrims_nik      ON pilgrims(nik)             WHERE nik IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pilgrims_passport ON pilgrims(passport_number) WHERE passport_number IS NOT NULL;
CREATE INDEX       IF NOT EXISTS idx_pilgrims_name     ON pilgrims(name);

-- 2. booking_status_logs — audit trail perubahan status booking (BK-03)
CREATE TABLE IF NOT EXISTS booking_status_logs (
  id          text PRIMARY KEY,
  booking_id  text NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_status text,
  to_status   text NOT NULL,
  changed_by  text,
  notes       text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_status_logs_booking_id ON booking_status_logs(booking_id);

-- 3. manifests — snapshot manifest saat dicetak (MN-DB01)
CREATE TABLE IF NOT EXISTS manifests (
  id              text PRIMARY KEY,
  departure_id    text REFERENCES package_departures(id) ON DELETE CASCADE,
  printed_at      timestamptz DEFAULT now(),
  printed_by      text,
  total_pilgrims  integer NOT NULL DEFAULT 0,
  format          text NOT NULL DEFAULT 'pdf',
  snapshot_json   text
);
CREATE INDEX IF NOT EXISTS idx_manifests_departure_id ON manifests(departure_id);

-- 4. pilgrim_equipment — distribusi perlengkapan per jamaah (PL-DB01)
CREATE TABLE IF NOT EXISTS pilgrim_equipment (
  id              text PRIMARY KEY,
  pilgrim_id      text NOT NULL REFERENCES booking_pilgrims(id) ON DELETE CASCADE,
  equipment_id    text NOT NULL REFERENCES equipment(id),
  booking_id      text NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'pending',
  distributed_at  timestamptz,
  distributed_by  text,
  notes           text,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pilgrim_equipment_pilgrim_id   ON pilgrim_equipment(pilgrim_id);
CREATE INDEX IF NOT EXISTS idx_pilgrim_equipment_booking_id   ON pilgrim_equipment(booking_id);
CREATE INDEX IF NOT EXISTS idx_pilgrim_equipment_equipment_id ON pilgrim_equipment(equipment_id);

-- ══════════════════════════════════════════════════════════════
-- KOLOM BARU
-- ══════════════════════════════════════════════════════════════

-- booking_pilgrims.pilgrim_id — FK ke master pilgrims (setelah tabel pilgrims dibuat)
ALTER TABLE booking_pilgrims ADD COLUMN IF NOT EXISTS pilgrim_id text REFERENCES pilgrims(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_booking_pilgrims_pilgrim_id ON booking_pilgrims(pilgrim_id);

-- equipment.total_stock — total unit yang dimiliki biro (PL-F02)
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS total_stock integer NOT NULL DEFAULT 0;

-- departure_gallery.caption — nama kolom yang dipakai Drizzle
ALTER TABLE departure_gallery ADD COLUMN IF NOT EXISTS caption text;

-- payment_gateway_transactions.installment_schedule_id — link ke cicilan (F-05)
ALTER TABLE payment_gateway_transactions ADD COLUMN IF NOT EXISTS installment_schedule_id text;

-- payments.verified_at, payments.rejection_reason — audit verifikasi pembayaran
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_at       timestamptz;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS rejection_reason  text;

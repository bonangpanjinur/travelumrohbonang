-- ============================================================
-- Fix missing columns & tables — production sync
-- Generated: 2026-07-22
-- Fixes: 503 on /api/admin/departures, /api/admin/visa,
--        500 on /api/admin/incident-reports
-- ============================================================

-- ── 1. package_departures — kolom info penerbangan (KB-F03) ──────────────────
ALTER TABLE package_departures
  ADD COLUMN IF NOT EXISTS airline_id            text REFERENCES airlines(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS flight_number         text,
  ADD COLUMN IF NOT EXISTS departure_airport_id  text REFERENCES airports(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS arrival_airport_id    text REFERENCES airports(id)  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_departures_airline_id
  ON package_departures(airline_id);

-- ── 2. incident_reports — manajemen insiden lapangan ────────────────────────
CREATE TABLE IF NOT EXISTS incident_reports (
  id            text PRIMARY KEY,
  departure_id  text REFERENCES package_departures(id) ON DELETE SET NULL,
  pilgrim_id    text REFERENCES booking_pilgrims(id)   ON DELETE SET NULL,
  type          text NOT NULL,
  title         text NOT NULL,
  description   text NOT NULL,
  status        text NOT NULL DEFAULT 'open',
  severity      text NOT NULL DEFAULT 'medium',
  location      text,
  handled_by    text,
  resolution    text,
  reported_by   text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  resolved_at   timestamptz
);
CREATE INDEX IF NOT EXISTS idx_incident_reports_departure_id ON incident_reports(departure_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_status       ON incident_reports(status);
CREATE INDEX IF NOT EXISTS idx_incident_reports_created_at   ON incident_reports(created_at);

-- ── 3. visa_applications — tracking status visa per jemaah (O-9) ────────────
CREATE TABLE IF NOT EXISTS visa_applications (
  id                text PRIMARY KEY,
  booking_id        text NOT NULL REFERENCES bookings(id)         ON DELETE CASCADE,
  pilgrim_id        text NOT NULL REFERENCES booking_pilgrims(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'draft',
  submitted_at      timestamptz,
  approved_at       timestamptz,
  expiry_date       date,
  rejection_reason  text,
  visa_number       text,
  notes             text,
  updated_by        text,
  created_at        timestamptz,
  updated_at        timestamptz
);
CREATE INDEX IF NOT EXISTS idx_visa_booking_id  ON visa_applications(booking_id);
CREATE INDEX IF NOT EXISTS idx_visa_pilgrim_id  ON visa_applications(pilgrim_id);
CREATE INDEX IF NOT EXISTS idx_visa_status      ON visa_applications(status);

-- ── 4. savings_accounts — rekening tabungan umroh per jamaah ────────────────
CREATE TABLE IF NOT EXISTS savings_accounts (
  id                   text PRIMARY KEY,
  user_id              text NOT NULL,
  target_package_id    text,
  target_package_name  text,
  target_amount        integer NOT NULL DEFAULT 0,
  current_balance      integer NOT NULL DEFAULT 0,
  status               text NOT NULL DEFAULT 'active',
  notes                text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz
);
CREATE INDEX IF NOT EXISTS idx_savings_accounts_user_id ON savings_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_accounts_status  ON savings_accounts(status);

-- ── 5. savings_transactions — mutasi saldo tabungan ─────────────────────────
CREATE TABLE IF NOT EXISTS savings_transactions (
  id                text PRIMARY KEY,
  account_id        text NOT NULL,
  amount            integer NOT NULL,
  type              text NOT NULL,
  status            text NOT NULL DEFAULT 'pending',
  proof_url         text,
  notes             text,
  rejection_reason  text,
  booking_id        text,
  recorded_by       text,
  verified_at       timestamptz,
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_savings_tx_account_id ON savings_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_savings_tx_status     ON savings_transactions(status);
CREATE INDEX IF NOT EXISTS idx_savings_tx_type       ON savings_transactions(type);

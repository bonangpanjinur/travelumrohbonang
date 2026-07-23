-- F-14 Multi-Currency: tambah kolom exchange_rate ke bookings
-- dan rate_updated_at ke currencies.
--
-- Idempotent: menggunakan ADD COLUMN IF NOT EXISTS agar aman dijalankan ulang.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS exchange_rate double precision NOT NULL DEFAULT 1;

ALTER TABLE currencies
  ADD COLUMN IF NOT EXISTS rate_updated_at timestamptz;

-- ============================================================
-- Fix: tambah kolom departure_type ke package_departures
-- Kolom ini ada di Drizzle schema tapi belum pernah di-migrate
-- ke production, menyebabkan POST /api/admin/departures → 500
-- ============================================================

ALTER TABLE package_departures
  ADD COLUMN IF NOT EXISTS departure_type TEXT NOT NULL DEFAULT 'direct';

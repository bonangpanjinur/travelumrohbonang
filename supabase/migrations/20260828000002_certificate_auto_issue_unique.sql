-- Idempotency guard for automatic certificate issuance.
-- A pilgrim can have at most one certificate of each type per booking.
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_booking_pilgrim_type_unique
  ON certificates (booking_id, pilgrim_id, certificate_type);

-- Idempotency guard for automatic certificate issuance.
-- A pilgrim can have at most one certificate of each type per booking.
--
-- Existing installations may already contain duplicate rows because this
-- constraint was introduced after certificate auto-issuance was deployed.
-- Keep the earliest certificate for each logical key before adding the index.
WITH ranked_certificates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY booking_id, pilgrim_id, certificate_type
      ORDER BY created_at ASC, id ASC
    ) AS row_number
  FROM public.certificates
)
DELETE FROM public.certificates AS certificates
USING ranked_certificates AS duplicates
WHERE certificates.id = duplicates.id
  AND duplicates.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_booking_pilgrim_type_unique
  ON public.certificates (booking_id, pilgrim_id, certificate_type);

COMMENT ON INDEX public.idx_certificates_booking_pilgrim_type_unique IS
  'Ensures one certificate of each type per pilgrim and booking';

-- Allow admin routes to bypass the quota-on-insert trigger.
-- Admin booking routes deliberately allow over-booking (late registrations,
-- record-keeping) and manage quota themselves via explicit UPDATE after INSERT.
--
-- Pattern: in the transaction, run:
--   SET LOCAL app.skip_quota_check = 'true';
-- before the INSERT, and the trigger will skip the quota gate.

CREATE OR REPLACE FUNCTION fn_booking_quota_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Admin / system bypass: SET LOCAL app.skip_quota_check = 'true' in the tx
  IF current_setting('app.skip_quota_check', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF (
    SELECT remaining_quota
    FROM package_departures
    WHERE id = NEW.departure_id
  ) <= 0 THEN
    RAISE EXCEPTION 'Kuota keberangkatan penuh (departure_id: %)', NEW.departure_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

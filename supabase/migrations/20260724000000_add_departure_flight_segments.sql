-- ============================================================
-- Add departure_flight_segments table
-- Missing table causing error on Jadwal Keberangkatan page
-- ============================================================

CREATE TABLE IF NOT EXISTS departure_flight_segments (
  id                    text PRIMARY KEY,
  departure_id          text NOT NULL REFERENCES package_departures(id) ON DELETE CASCADE,
  segment_order         integer NOT NULL DEFAULT 0,
  airline_id            text REFERENCES airlines(id) ON DELETE SET NULL,
  flight_number         text,
  departure_airport_id  text REFERENCES airports(id) ON DELETE SET NULL,
  arrival_airport_id    text REFERENCES airports(id) ON DELETE SET NULL,
  created_at            timestamptz
);

CREATE INDEX IF NOT EXISTS idx_dep_flight_segments_departure_id
  ON departure_flight_segments(departure_id);

CREATE INDEX IF NOT EXISTS idx_dep_flight_segments_order
  ON departure_flight_segments(segment_order);

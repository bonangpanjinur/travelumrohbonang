-- Adds the "equipment" master data table (Perlengkapan menu) — packing-list
-- items associated with Umrah packages (e.g. ihram, mukena, koper, tas).
-- Mirrors the pattern used by other master data tables (hotels, airlines,
-- airports, muthawifs): public read, admin write via RLS.

CREATE TABLE IF NOT EXISTS equipment (
  id          TEXT PRIMARY KEY,
  name        TEXT    NOT NULL,
  category    TEXT,
  description TEXT,
  image_url   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER,
  created_at  TIMESTAMPTZ
);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS equipment_public_read ON equipment;
DROP POLICY IF EXISTS equipment_admin_all ON equipment;

CREATE POLICY equipment_public_read ON equipment FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY equipment_admin_all   ON equipment FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());

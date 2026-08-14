-- O-11: Pre-departure checklist per keberangkatan
-- Idempotent migration for production databases where the table is missing.
-- profiles.id is UUID, therefore departure_checklists.done_by must also be UUID.

CREATE TABLE IF NOT EXISTS departure_checklists (
  id TEXT PRIMARY KEY,
  departure_id TEXT NOT NULL REFERENCES package_departures(id) ON DELETE CASCADE,
  h_minus INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  item TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  done_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  done_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_departure_id
  ON departure_checklists(departure_id);

CREATE INDEX IF NOT EXISTS idx_checklist_h_minus
  ON departure_checklists(h_minus);

CREATE INDEX IF NOT EXISTS idx_checklist_is_done
  ON departure_checklists(is_done);

CREATE INDEX IF NOT EXISTS idx_checklist_departure_item
  ON departure_checklists(departure_id, h_minus, item);

COMMENT ON TABLE departure_checklists IS 'Operational pre-departure checklist items per package departure';
COMMENT ON COLUMN departure_checklists.h_minus IS 'Days before departure when the item should be completed';
COMMENT ON COLUMN departure_checklists.is_done IS 'Whether the checklist item has been completed';

GRANT SELECT, INSERT, UPDATE, DELETE ON departure_checklists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON departure_checklists TO service_role;

-- Sprint 4A: Muthawif Portal Foundation
-- 1. Add user_id to muthawifs (links muthawif record → Supabase auth user)
-- 2. Create muthawif_daily_reports table

-- 1. user_id column on muthawifs
ALTER TABLE muthawifs
  ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_muthawifs_user_id ON muthawifs(user_id);

-- 2. muthawif_daily_reports
CREATE TABLE IF NOT EXISTS muthawif_daily_reports (
  id              TEXT PRIMARY KEY,
  muthawif_id     TEXT NOT NULL REFERENCES muthawifs(id) ON DELETE CASCADE,
  departure_id    TEXT NOT NULL REFERENCES package_departures(id) ON DELETE CASCADE,
  report_date     TEXT NOT NULL,
  location        TEXT,
  group_condition TEXT,
  content         TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'submitted',
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_muthawif_daily_reports_muthawif_id  ON muthawif_daily_reports(muthawif_id);
CREATE INDEX IF NOT EXISTS idx_muthawif_daily_reports_departure_id ON muthawif_daily_reports(departure_id);
CREATE INDEX IF NOT EXISTS idx_muthawif_daily_reports_date         ON muthawif_daily_reports(report_date);

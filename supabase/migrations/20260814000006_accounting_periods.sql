-- Accounting periods / period locking
-- Restores the table required by autoJournal and admin payment verification.
-- This migration is idempotent so it is safe to apply to partially migrated databases.

CREATE TABLE IF NOT EXISTS accounting_periods (
  id         TEXT PRIMARY KEY,
  year       INTEGER NOT NULL,
  month      INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at  TIMESTAMPTZ,
  closed_by  TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_accounting_periods_year_month
  ON accounting_periods(year, month);

CREATE INDEX IF NOT EXISTS idx_accounting_periods_status
  ON accounting_periods(status);

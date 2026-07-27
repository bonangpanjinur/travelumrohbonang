-- F-12: Budget & Proyeksi Cash Flow
-- Migration: create budgets table

CREATE TABLE IF NOT EXISTS budgets (
  id               TEXT PRIMARY KEY,
  period_year      INTEGER NOT NULL,
  period_month     INTEGER,                         -- NULL = anggaran tahunan
  category         TEXT NOT NULL,
  category_label   TEXT,
  budget_type      TEXT NOT NULL DEFAULT 'expense', -- income | expense
  amount           INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  created_by       TEXT,
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_budgets_year          ON budgets (period_year);
CREATE INDEX IF NOT EXISTS idx_budgets_year_month    ON budgets (period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_budgets_category      ON budgets (category);

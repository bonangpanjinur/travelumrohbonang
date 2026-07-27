-- =============================================================================
-- PRODUCTION SYNC MIGRATION
-- Jalankan seluruh file ini di Supabase SQL Editor:
--   https://supabase.com/dashboard → project → SQL Editor
--
-- Semua statement memakai IF NOT EXISTS / DO $$ sehingga aman dijalankan
-- berulang kali tanpa error.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. chart_of_accounts — tambah kolom yang hilang
-- ---------------------------------------------------------------------------
ALTER TABLE chart_of_accounts
  ADD COLUMN IF NOT EXISTS category       text,
  ADD COLUMN IF NOT EXISTS normal_balance text;

-- ---------------------------------------------------------------------------
-- 2. budgets — tabel baru untuk F-12 Budget & Proyeksi Cash Flow
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budgets (
  id             text        PRIMARY KEY,
  period_year    integer     NOT NULL,
  period_month   integer,                          -- NULL = anggaran tahunan
  category       text        NOT NULL,
  category_label text,
  budget_type    text        NOT NULL DEFAULT 'expense',  -- income | expense
  amount         integer     NOT NULL DEFAULT 0,
  notes          text,
  created_by     text,
  created_at     timestamptz,
  updated_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_budgets_year          ON budgets (period_year);
CREATE INDEX IF NOT EXISTS idx_budgets_year_month    ON budgets (period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_budgets_category      ON budgets (category);

-- ---------------------------------------------------------------------------
-- 3. Verifikasi — output kolom chart_of_accounts setelah migrasi
-- ---------------------------------------------------------------------------
SELECT column_name, data_type, is_nullable
FROM   information_schema.columns
WHERE  table_name = 'chart_of_accounts'
  AND  table_schema = 'public'
ORDER  BY ordinal_position;

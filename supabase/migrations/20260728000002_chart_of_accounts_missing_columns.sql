-- Tambah kolom yang belum ada di chart_of_accounts
ALTER TABLE chart_of_accounts
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE chart_of_accounts
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

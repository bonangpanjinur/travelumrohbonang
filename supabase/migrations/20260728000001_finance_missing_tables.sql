-- ============================================================
-- Migration: Finance missing tables + columns
-- Tanggal: 2026-07-28
-- Tabel baru: chart_of_accounts, bank_mutations, budgets
-- Kolom baru: financial_transactions.account_id, .entry_type
-- ============================================================

-- ── chart_of_accounts ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id             TEXT PRIMARY KEY,
  code           TEXT NOT NULL,
  name           TEXT NOT NULL,
  type           TEXT NOT NULL,             -- asset|liability|equity|revenue|expense
  category       TEXT,
  normal_balance TEXT,                      -- debit|credit
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  description    TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coa_code ON chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(type);

-- ── bank_mutations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_mutations (
  id           TEXT PRIMARY KEY,
  mutation_date DATE NOT NULL,
  description  TEXT,
  amount       INTEGER NOT NULL,
  balance      INTEGER,
  ref_number   TEXT,
  bank_account TEXT,
  bank_name    TEXT,
  matched_to   TEXT,
  is_matched   BOOLEAN NOT NULL DEFAULT FALSE,
  notes        TEXT,
  created_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bank_mutations_date         ON bank_mutations(mutation_date);
CREATE INDEX IF NOT EXISTS idx_bank_mutations_is_matched   ON bank_mutations(is_matched);
CREATE INDEX IF NOT EXISTS idx_bank_mutations_bank_account ON bank_mutations(bank_account);

-- ── budgets ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id             TEXT PRIMARY KEY,
  period_year    INTEGER NOT NULL,
  period_month   INTEGER,
  category       TEXT NOT NULL,
  category_label TEXT,
  budget_type    TEXT NOT NULL DEFAULT 'expense',
  amount         INTEGER NOT NULL DEFAULT 0,
  notes          TEXT,
  created_by     TEXT,
  created_at     TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_budgets_year       ON budgets(period_year);
CREATE INDEX IF NOT EXISTS idx_budgets_year_month ON budgets(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_budgets_category   ON budgets(category);

-- ── financial_transactions: tambah kolom account_id dan entry_type ────────────
ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS account_id  TEXT,
  ADD COLUMN IF NOT EXISTS entry_type  TEXT;

CREATE INDEX IF NOT EXISTS idx_financial_transactions_account_id
  ON financial_transactions(account_id);

-- Savings hardening: idempotent deposits and explicit withdrawal lifecycle.

ALTER TABLE savings_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_savings_tx_account_idempotency
  ON savings_transactions(account_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_savings_tx_withdrawal_pending
  ON savings_transactions(account_id, status)
  WHERE type = 'withdrawal' AND status = 'pending';

COMMENT ON COLUMN savings_transactions.idempotency_key IS
  'Client-generated key preventing duplicate deposit submissions for one savings account';

COMMENT ON COLUMN savings_accounts.status IS
  'active | withdrawal_pending | closed | withdrawn';

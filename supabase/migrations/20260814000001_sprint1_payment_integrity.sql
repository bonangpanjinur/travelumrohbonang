-- Sprint 1: payment posting integrity constraints
-- Safe/idempotent migration. Review existing duplicate data before deployment.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_booking_payments_amount_positive'
      AND conrelid = 'booking_payments'::regclass
  ) THEN
    ALTER TABLE booking_payments
      ADD CONSTRAINT chk_booking_payments_amount_positive CHECK (amount > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_payments_amount_positive'
      AND conrelid = 'payments'::regclass
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT chk_payments_amount_positive CHECK (amount > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_financial_transactions_amount_positive'
      AND conrelid = 'financial_transactions'::regclass
  ) THEN
    ALTER TABLE financial_transactions
      ADD CONSTRAINT chk_financial_transactions_amount_positive CHECK (amount > 0);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_payments_active_reference
  ON booking_payments (booking_id, reference_number)
  WHERE is_voided = false AND reference_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_transactions_reference_entry
  ON financial_transactions (reference_number, entry_type)
  WHERE reference_number IS NOT NULL AND entry_type IS NOT NULL;

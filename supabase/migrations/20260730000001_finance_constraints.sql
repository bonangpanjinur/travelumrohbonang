-- ============================================================
-- F2-04: Constraint DB untuk Integritas Data Keuangan
-- F3-02: Unique constraint booking_payments untuk konsolidasi
-- F3-04: Enum types untuk status komisi & withdrawal
-- ============================================================

-- ── F2-04: CoA — kode akun harus unik ────────────────────────────────────────
-- Cegah dua akun dengan kode yang sama masuk ke Chart of Accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_chart_of_accounts_code'
      AND conrelid = 'chart_of_accounts'::regclass
  ) THEN
    ALTER TABLE chart_of_accounts ADD CONSTRAINT uq_chart_of_accounts_code UNIQUE (code);
  END IF;
END $$;

-- ── F2-04: Komisi agen — amount tidak boleh negatif ───────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_agent_commissions_amount_positive'
      AND conrelid = 'agent_commissions'::regclass
  ) THEN
    ALTER TABLE agent_commissions
      ADD CONSTRAINT chk_agent_commissions_amount_positive CHECK (amount >= 0);
  END IF;
END $$;

-- ── F2-04: Komisi agen — satu booking hanya boleh punya satu komisi per agen ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_agent_commissions_booking_agent'
      AND conrelid = 'agent_commissions'::regclass
  ) THEN
    ALTER TABLE agent_commissions
      ADD CONSTRAINT uq_agent_commissions_booking_agent UNIQUE (booking_id, agent_id);
  END IF;
END $$;

-- ── F2-04: Bank mutations — matched_to unik + FK ke booking_payments ─────────
-- Setiap bank mutation hanya boleh cocok dengan satu booking payment (unique).
-- matched_to → booking_payments.id (sesuai desain rekonsiliasi yang sudah ada)
CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_mutations_matched_to
  ON bank_mutations (matched_to)
  WHERE matched_to IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_bank_mutations_matched_to'
      AND conrelid = 'bank_mutations'::regclass
  ) THEN
    ALTER TABLE bank_mutations
      ADD CONSTRAINT fk_bank_mutations_matched_to
      FOREIGN KEY (matched_to)
      REFERENCES booking_payments(id)
      ON DELETE SET NULL
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Jika ada data lama yang tidak konsisten, lewati FK dan hanya pertahankan unique index
  RAISE WARNING 'Could not add FK constraint fk_bank_mutations_matched_to: %', SQLERRM;
END $$;

-- ── F3-02: booking_payments — unique per reference_number per booking ─────────
-- Cegah duplikat booking_payments untuk payment yang sama
-- (verify flow menggunakan referenceNumber = 'manual-{paymentId}' sebagai idempotency key)
CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_payments_booking_refnum
  ON booking_payments (booking_id, reference_number)
  WHERE reference_number IS NOT NULL AND is_voided = false;

-- ── F3-04: Enum types untuk status komisi dan withdrawal ─────────────────────
-- Buat enum types jika belum ada
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commission_status') THEN
    CREATE TYPE commission_status AS ENUM ('pending', 'approved', 'paid', 'cancelled');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status') THEN
    CREATE TYPE withdrawal_status AS ENUM ('requested', 'approved', 'rejected', 'paid');
  END IF;
END $$;

-- Cast kolom existing ke enum type baru
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_commissions'
      AND column_name = 'status'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE agent_commissions
      ALTER COLUMN status TYPE commission_status
      USING status::commission_status;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not cast agent_commissions.status to enum: %. Column stays as text.', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_withdrawals'
      AND column_name = 'status'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE agent_withdrawals
      ALTER COLUMN status TYPE withdrawal_status
      USING status::withdrawal_status;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not cast agent_withdrawals.status to enum: %. Column stays as text.', SQLERRM;
END $$;

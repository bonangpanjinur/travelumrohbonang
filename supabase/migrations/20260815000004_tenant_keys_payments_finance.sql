-- Tenant isolation for payment and financial transaction records.
-- branch_id is denormalized intentionally for reporting, indexing, and defense-in-depth;
-- booking_id remains the source-of-truth relationship.
-- NULL means legacy/ambiguous data and is global-admin only.

ALTER TABLE IF EXISTS public.booking_payments
  ADD COLUMN IF NOT EXISTS branch_id text;
ALTER TABLE IF EXISTS public.payments
  ADD COLUMN IF NOT EXISTS branch_id text;
ALTER TABLE IF EXISTS public.installment_schedules
  ADD COLUMN IF NOT EXISTS branch_id text;
ALTER TABLE IF EXISTS public.payment_gateway_transactions
  ADD COLUMN IF NOT EXISTS branch_id text;
ALTER TABLE IF EXISTS public.financial_transactions
  ADD COLUMN IF NOT EXISTS branch_id text;

DO $$
DECLARE
  table_name text;
  constraint_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['booking_payments','payments','installment_schedules','payment_gateway_transactions','financial_transactions'] LOOP
    constraint_name := table_name || '_branch_id_branches_id_fk';
    IF to_regclass('public.branches') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = constraint_name) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL',
        table_name, constraint_name
      );
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_booking_payments_branch_id ON public.booking_payments(branch_id);
CREATE INDEX IF NOT EXISTS idx_payments_branch_id ON public.payments(branch_id);
CREATE INDEX IF NOT EXISTS idx_installment_schedules_branch_id ON public.installment_schedules(branch_id);
CREATE INDEX IF NOT EXISTS idx_payment_gateway_transactions_branch_id ON public.payment_gateway_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_branch_id ON public.financial_transactions(branch_id);

UPDATE public.booking_payments p
SET branch_id = b.branch_id
FROM public.bookings b
WHERE p.booking_id = b.id AND p.branch_id IS NULL AND b.branch_id IS NOT NULL;

UPDATE public.payments p
SET branch_id = b.branch_id
FROM public.bookings b
WHERE p.booking_id = b.id AND p.branch_id IS NULL AND b.branch_id IS NOT NULL;

UPDATE public.installment_schedules s
SET branch_id = b.branch_id
FROM public.bookings b
WHERE s.booking_id = b.id AND s.branch_id IS NULL AND b.branch_id IS NOT NULL;

UPDATE public.payment_gateway_transactions p
SET branch_id = b.branch_id
FROM public.bookings b
WHERE p.booking_id = b.id AND p.branch_id IS NULL AND b.branch_id IS NOT NULL;

UPDATE public.financial_transactions t
SET branch_id = b.branch_id
FROM public.bookings b
WHERE t.booking_id = b.id AND t.branch_id IS NULL AND b.branch_id IS NOT NULL;

COMMENT ON COLUMN public.booking_payments.branch_id IS 'Tenant branch denormalized from bookings.branch_id; NULL is legacy/global-admin only.';
COMMENT ON COLUMN public.payments.branch_id IS 'Tenant branch denormalized from bookings.branch_id; NULL is legacy/global-admin only.';
COMMENT ON COLUMN public.installment_schedules.branch_id IS 'Tenant branch denormalized from bookings.branch_id; NULL is legacy/global-admin only.';
COMMENT ON COLUMN public.payment_gateway_transactions.branch_id IS 'Tenant branch denormalized from bookings.branch_id; NULL is legacy/global-admin only.';
COMMENT ON COLUMN public.financial_transactions.branch_id IS 'Tenant branch denormalized from bookings.branch_id; NULL is legacy/global-admin only.';

-- Enforce HQ as the owner of every transaction that has no operational branch.
-- This migration is intentionally idempotent and preserves existing source-derived branches first.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.branches WHERE id = 'hq')
     AND NOT EXISTS (SELECT 1 FROM public.branches WHERE slug = 'hq') THEN
    INSERT INTO public.branches (id, name, slug, description, is_active, created_at)
    VALUES ('hq', 'HQ', 'hq', 'Branch sistem untuk transaksi perusahaan/global', true, now());
  END IF;
END $$;

-- Prefer the source entity whenever it has a deterministic branch.
UPDATE public.financial_transactions t
SET branch_id = b.branch_id
FROM public.bookings b
WHERE t.booking_id = b.id AND b.branch_id IS NOT NULL;
UPDATE public.booking_payments t
SET branch_id = b.branch_id
FROM public.bookings b
WHERE t.booking_id = b.id AND b.branch_id IS NOT NULL;
UPDATE public.payments t
SET branch_id = b.branch_id
FROM public.bookings b
WHERE t.booking_id = b.id AND b.branch_id IS NOT NULL;
UPDATE public.installment_schedules t
SET branch_id = b.branch_id
FROM public.bookings b
WHERE t.booking_id = b.id AND b.branch_id IS NOT NULL;
UPDATE public.payment_gateway_transactions t
SET branch_id = b.branch_id
FROM public.bookings b
WHERE t.booking_id = b.id AND b.branch_id IS NOT NULL;
UPDATE public.refund_requests t
SET branch_id = b.branch_id
FROM public.bookings b
WHERE t.booking_id = b.id AND b.branch_id IS NOT NULL;
UPDATE public.agent_commissions t
SET branch_id = a.branch_id
FROM public.agents a
WHERE t.agent_id = a.id AND a.branch_id IS NOT NULL;
UPDATE public.agent_withdrawals t
SET branch_id = a.branch_id
FROM public.agents a
WHERE t.agent_id = a.id AND a.branch_id IS NOT NULL;
UPDATE public.savings_transactions t
SET branch_id = a.branch_id
FROM public.savings_accounts a
WHERE t.account_id = a.id AND a.branch_id IS NOT NULL;
UPDATE public.savings_transactions t
SET branch_id = b.branch_id
FROM public.bookings b
WHERE t.booking_id = b.id AND b.branch_id IS NOT NULL;

-- Any remaining legacy/global transaction is explicitly owned by HQ.
UPDATE public.financial_transactions SET branch_id = 'hq' WHERE branch_id IS NULL;
UPDATE public.booking_payments SET branch_id = 'hq' WHERE branch_id IS NULL;
UPDATE public.payments SET branch_id = 'hq' WHERE branch_id IS NULL;
UPDATE public.installment_schedules SET branch_id = 'hq' WHERE branch_id IS NULL;
UPDATE public.payment_gateway_transactions SET branch_id = 'hq' WHERE branch_id IS NULL;
UPDATE public.agent_commissions SET branch_id = 'hq' WHERE branch_id IS NULL;
UPDATE public.agent_withdrawals SET branch_id = 'hq' WHERE branch_id IS NULL;
UPDATE public.savings_accounts SET branch_id = 'hq' WHERE branch_id IS NULL;
UPDATE public.savings_transactions SET branch_id = 'hq' WHERE branch_id IS NULL;
UPDATE public.refund_requests SET branch_id = 'hq' WHERE branch_id IS NULL;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'financial_transactions', 'booking_payments', 'payments',
    'installment_schedules', 'payment_gateway_transactions',
    'agent_commissions', 'agent_withdrawals', 'savings_accounts',
    'savings_transactions', 'refund_requests'
  ] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN branch_id SET NOT NULL', table_name);
    END IF;
  END LOOP;
END $$;

COMMENT ON COLUMN public.financial_transactions.branch_id IS 'Tenant owner; HQ is mandatory for transactions without an operational branch.';
COMMENT ON COLUMN public.booking_payments.branch_id IS 'Tenant owner; derived from booking or HQ for legacy/global records.';
COMMENT ON COLUMN public.payments.branch_id IS 'Tenant owner; derived from booking or HQ for legacy/global records.';
COMMENT ON COLUMN public.installment_schedules.branch_id IS 'Tenant owner; derived from booking or HQ for legacy/global records.';
COMMENT ON COLUMN public.payment_gateway_transactions.branch_id IS 'Tenant owner; derived from booking or HQ for legacy/global records.';
COMMENT ON COLUMN public.agent_commissions.branch_id IS 'Tenant owner; derived from agent or HQ for legacy/global records.';
COMMENT ON COLUMN public.agent_withdrawals.branch_id IS 'Tenant owner; derived from agent or HQ for legacy/global records.';
COMMENT ON COLUMN public.savings_accounts.branch_id IS 'Tenant owner; derived from account owner or HQ for legacy/global records.';
COMMENT ON COLUMN public.savings_transactions.branch_id IS 'Tenant owner; derived from savings account or HQ for legacy/global records.';
COMMENT ON COLUMN public.refund_requests.branch_id IS 'Tenant owner; derived from booking or HQ for legacy/global records.';

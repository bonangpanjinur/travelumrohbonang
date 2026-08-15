-- Tenant isolation for non-booking financial transactions.
-- NULL branch_id remains legacy/ambiguous and is global-admin only.

ALTER TABLE IF EXISTS public.agent_commissions ADD COLUMN IF NOT EXISTS branch_id text;
ALTER TABLE IF EXISTS public.agent_withdrawals ADD COLUMN IF NOT EXISTS branch_id text;
ALTER TABLE IF EXISTS public.savings_accounts ADD COLUMN IF NOT EXISTS branch_id text;
ALTER TABLE IF EXISTS public.savings_transactions ADD COLUMN IF NOT EXISTS branch_id text;
ALTER TABLE IF EXISTS public.refund_requests ADD COLUMN IF NOT EXISTS branch_id text;

DO $$
DECLARE
  table_name text;
  constraint_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['agent_commissions','agent_withdrawals','savings_accounts','savings_transactions','refund_requests'] LOOP
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

CREATE INDEX IF NOT EXISTS idx_agent_commissions_branch_id ON public.agent_commissions(branch_id);
CREATE INDEX IF NOT EXISTS idx_agent_withdrawals_branch_id ON public.agent_withdrawals(branch_id);
CREATE INDEX IF NOT EXISTS idx_savings_accounts_branch_id ON public.savings_accounts(branch_id);
CREATE INDEX IF NOT EXISTS idx_savings_transactions_branch_id ON public.savings_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_branch_id ON public.refund_requests(branch_id);

-- Commission and withdrawals inherit the agent's branch.
UPDATE public.agent_commissions c
SET branch_id = a.branch_id
FROM public.agents a
WHERE c.agent_id = a.id AND c.branch_id IS NULL AND a.branch_id IS NOT NULL;

UPDATE public.agent_withdrawals w
SET branch_id = a.branch_id
FROM public.agents a
WHERE w.agent_id = a.id AND w.branch_id IS NULL AND a.branch_id IS NOT NULL;

-- Savings account ownership follows the profile branch when it is unambiguous.
UPDATE public.savings_accounts s
SET branch_id = p.branch_id
FROM public.profiles p
WHERE s.user_id = p.id AND s.branch_id IS NULL AND p.branch_id IS NOT NULL;

UPDATE public.savings_transactions t
SET branch_id = s.branch_id
FROM public.savings_accounts s
WHERE t.account_id = s.id AND t.branch_id IS NULL AND s.branch_id IS NOT NULL;

-- Refunds inherit the booking branch.
UPDATE public.refund_requests r
SET branch_id = b.branch_id
FROM public.bookings b
WHERE r.booking_id = b.id AND r.branch_id IS NULL AND b.branch_id IS NOT NULL;

COMMENT ON COLUMN public.agent_commissions.branch_id IS 'Tenant branch denormalized from agents.branch_id; NULL is legacy/global-admin only.';
COMMENT ON COLUMN public.agent_withdrawals.branch_id IS 'Tenant branch denormalized from agents.branch_id; NULL is legacy/global-admin only.';
COMMENT ON COLUMN public.savings_accounts.branch_id IS 'Tenant branch owner resolved from profiles.branch_id; NULL is legacy/global-admin only.';
COMMENT ON COLUMN public.savings_transactions.branch_id IS 'Tenant branch denormalized from savings_accounts.branch_id; NULL is legacy/global-admin only.';
COMMENT ON COLUMN public.refund_requests.branch_id IS 'Tenant branch denormalized from bookings.branch_id; NULL is legacy/global-admin only.';

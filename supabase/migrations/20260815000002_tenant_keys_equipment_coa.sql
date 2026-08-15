-- Tenant isolation foundation for equipment inventory and chart of accounts.
-- NULL branch_id means global/shared data and remains global-admin only.

ALTER TABLE IF EXISTS public.equipment
  ADD COLUMN IF NOT EXISTS branch_id text;

ALTER TABLE IF EXISTS public.chart_of_accounts
  ADD COLUMN IF NOT EXISTS branch_id text;

DO $$
BEGIN
  IF to_regclass('public.branches') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'equipment_branch_id_branches_id_fk'
    ) THEN
      ALTER TABLE public.equipment
        ADD CONSTRAINT equipment_branch_id_branches_id_fk
        FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'chart_of_accounts_branch_id_branches_id_fk'
    ) THEN
      ALTER TABLE public.chart_of_accounts
        ADD CONSTRAINT chart_of_accounts_branch_id_branches_id_fk
        FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_equipment_branch_id
  ON public.equipment(branch_id);

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_branch_id
  ON public.chart_of_accounts(branch_id);

-- Backfill equipment only when all historical assignments resolve to one branch.
WITH equipment_branch AS (
  SELECT pe.equipment_id, MIN(b.branch_id) AS branch_id
  FROM public.pilgrim_equipment pe
  JOIN public.bookings b ON b.id = pe.booking_id
  WHERE b.branch_id IS NOT NULL
  GROUP BY pe.equipment_id
  HAVING COUNT(DISTINCT b.branch_id) = 1
)
UPDATE public.equipment e
SET branch_id = eb.branch_id
FROM equipment_branch eb
WHERE e.id = eb.equipment_id
  AND e.branch_id IS NULL;

-- Backfill CoA only when all linked financial transactions resolve to one branch.
-- Unused/shared accounts remain NULL and therefore global-admin only.
WITH account_branch AS (
  SELECT ft.account_id, MIN(b.branch_id) AS branch_id
  FROM public.financial_transactions ft
  JOIN public.bookings b ON b.id = ft.booking_id
  WHERE ft.account_id IS NOT NULL
    AND b.branch_id IS NOT NULL
  GROUP BY ft.account_id
  HAVING COUNT(DISTINCT b.branch_id) = 1
)
UPDATE public.chart_of_accounts coa
SET branch_id = ab.branch_id
FROM account_branch ab
WHERE coa.id = ab.account_id
  AND coa.branch_id IS NULL;

COMMENT ON COLUMN public.equipment.branch_id IS
  'Tenant branch owner. NULL means global/shared equipment and is global-admin only.';

COMMENT ON COLUMN public.chart_of_accounts.branch_id IS
  'Tenant branch owner. NULL means global/shared account and is global-admin only.';

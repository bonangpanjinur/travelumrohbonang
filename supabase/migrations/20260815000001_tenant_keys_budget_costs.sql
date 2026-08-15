-- Tenant isolation foundation for financial planning and package costs.
-- Nullable branch_id preserves global/shared records; non-global routes must only
-- access rows whose branch_id matches the authenticated scope.

ALTER TABLE IF EXISTS public.budgets
  ADD COLUMN IF NOT EXISTS branch_id text;

ALTER TABLE IF EXISTS public.package_costs
  ADD COLUMN IF NOT EXISTS branch_id text;

DO $$
BEGIN
  IF to_regclass('public.branches') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'budgets_branch_id_branches_id_fk'
    ) THEN
      ALTER TABLE public.budgets
        ADD CONSTRAINT budgets_branch_id_branches_id_fk
        FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'package_costs_branch_id_branches_id_fk'
    ) THEN
      ALTER TABLE public.package_costs
        ADD CONSTRAINT package_costs_branch_id_branches_id_fk
        FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_budgets_branch_id
  ON public.budgets(branch_id);

CREATE INDEX IF NOT EXISTS idx_package_costs_branch_id
  ON public.package_costs(branch_id);

-- Departure-specific costs can be backfilled when all bookings for that
-- departure belong to exactly one branch. Ambiguous and package-level costs
-- remain NULL and therefore stay global-only until explicitly assigned.
WITH departure_branch AS (
  SELECT b.departure_id, MIN(b.branch_id) AS branch_id
  FROM public.bookings b
  WHERE b.branch_id IS NOT NULL
  GROUP BY b.departure_id
  HAVING COUNT(DISTINCT b.branch_id) = 1
)
UPDATE public.package_costs pc
SET branch_id = db.branch_id
FROM departure_branch db
WHERE pc.departure_id = db.departure_id
  AND pc.branch_id IS NULL;

COMMENT ON COLUMN public.budgets.branch_id IS
  'Tenant branch owner. NULL means global/shared budget and is global-admin only.';

COMMENT ON COLUMN public.package_costs.branch_id IS
  'Tenant branch owner. NULL means global/shared cost and is global-admin only.';

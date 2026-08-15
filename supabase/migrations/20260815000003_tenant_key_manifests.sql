-- Tenant isolation for printed manifest snapshots.
-- NULL branch_id is retained for legacy/ambiguous snapshots and is global-admin only.

ALTER TABLE IF EXISTS public.manifests
  ADD COLUMN IF NOT EXISTS branch_id text;

DO $$
BEGIN
  IF to_regclass('public.branches') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'manifests_branch_id_branches_id_fk'
     ) THEN
    ALTER TABLE public.manifests
      ADD CONSTRAINT manifests_branch_id_branches_id_fk
      FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_manifests_branch_id
  ON public.manifests(branch_id);

-- Backfill a snapshot only when its departure's bookings belong to one branch.
WITH departure_branch AS (
  SELECT b.departure_id, MIN(b.branch_id) AS branch_id
  FROM public.bookings b
  WHERE b.departure_id IS NOT NULL
    AND b.branch_id IS NOT NULL
  GROUP BY b.departure_id
  HAVING COUNT(DISTINCT b.branch_id) = 1
)
UPDATE public.manifests m
SET branch_id = db.branch_id
FROM departure_branch db
WHERE m.departure_id = db.departure_id
  AND m.branch_id IS NULL;

COMMENT ON COLUMN public.manifests.branch_id IS
  'Tenant branch owner. NULL means legacy/ambiguous snapshot and is global-admin only.';

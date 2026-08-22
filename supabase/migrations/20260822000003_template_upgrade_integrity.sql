-- Prevent duplicate active template upgrade orders under concurrent requests.
-- This migration intentionally fails instead of silently deleting existing duplicates.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.template_upgrade_orders
    WHERE status IN ('pending', 'proof_submitted')
    GROUP BY tenant_site_id, target_template
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate active template upgrade orders exist; resolve them before applying 20260822000003_template_upgrade_integrity.sql';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_template_upgrade_orders_active_target
  ON public.template_upgrade_orders (tenant_site_id, target_template)
  WHERE status IN ('pending', 'proof_submitted');

CREATE INDEX IF NOT EXISTS idx_template_upgrade_orders_status_created
  ON public.template_upgrade_orders (status, created_at DESC);

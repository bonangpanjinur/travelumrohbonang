-- Store submitted upgrade proof and operator notes server-side.
ALTER TABLE IF EXISTS public.template_upgrade_orders
  ADD COLUMN IF NOT EXISTS proof_url text;

ALTER TABLE IF EXISTS public.template_upgrade_orders
  ADD COLUMN IF NOT EXISTS notes text;

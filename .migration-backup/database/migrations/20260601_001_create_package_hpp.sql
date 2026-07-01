
-- =========================
-- HPP / Package Costs
-- =========================
CREATE TABLE IF NOT EXISTS public.package_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN (
    'ticket','hotel_makkah','hotel_madinah','visa','transport',
    'muthawif','meals','handling','marketing','equipment','other'
  )),
  item_name text NOT NULL,
  qty numeric NOT NULL DEFAULT 1,
  unit text DEFAULT 'pax',
  unit_cost numeric NOT NULL DEFAULT 0,
  currency_code text NOT NULL DEFAULT 'IDR',
  is_per_pax boolean NOT NULL DEFAULT true,
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_package_costs_package ON public.package_costs(package_id);
CREATE INDEX IF NOT EXISTS idx_package_costs_category ON public.package_costs(category);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.package_costs TO authenticated;
GRANT ALL ON public.package_costs TO service_role;

ALTER TABLE public.package_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage package costs" ON public.package_costs;
CREATE POLICY "Admins manage package costs" ON public.package_costs
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_package_costs_updated_at ON public.package_costs;
CREATE TRIGGER trg_package_costs_updated_at
  BEFORE UPDATE ON public.package_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =========================
-- Helper: convert any currency to IDR using currencies table
-- =========================
CREATE OR REPLACE FUNCTION public.to_idr(_amount numeric, _currency text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(_amount, 0) * COALESCE(
    (SELECT rate_to_idr FROM public.currencies WHERE code = UPPER(_currency) LIMIT 1),
    1
  );
$$;

REVOKE EXECUTE ON FUNCTION public.to_idr(numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.to_idr(numeric, text) TO authenticated, service_role;

-- =========================
-- View: total HPP per pax per paket (dalam IDR)
-- =========================
CREATE OR REPLACE VIEW public.package_hpp_summary AS
SELECT
  pc.package_id,
  SUM(
    CASE WHEN pc.is_per_pax
      THEN public.to_idr(pc.unit_cost, pc.currency_code) * pc.qty
      ELSE 0
    END
  ) AS hpp_per_pax_idr,
  SUM(
    CASE WHEN NOT pc.is_per_pax
      THEN public.to_idr(pc.unit_cost, pc.currency_code) * pc.qty
      ELSE 0
    END
  ) AS hpp_fixed_idr,
  COUNT(*) AS items_count
FROM public.package_costs pc
GROUP BY pc.package_id;

GRANT SELECT ON public.package_hpp_summary TO authenticated, service_role;

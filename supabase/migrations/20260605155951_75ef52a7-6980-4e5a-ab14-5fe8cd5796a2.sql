
ALTER TABLE public.package_costs
  ADD COLUMN IF NOT EXISTS departure_id uuid NULL REFERENCES public.package_departures(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_package_costs_departure ON public.package_costs(departure_id);
CREATE INDEX IF NOT EXISTS idx_package_costs_package_active ON public.package_costs(package_id, is_active);

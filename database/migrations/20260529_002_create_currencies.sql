
-- ============ CURRENCIES ============
CREATE TABLE IF NOT EXISTS public.currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  symbol text NOT NULL DEFAULT '',
  rate_to_idr numeric NOT NULL DEFAULT 1,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.currencies TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.currencies TO authenticated;
GRANT ALL ON public.currencies TO service_role;

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active currencies"
  ON public.currencies FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage currencies"
  ON public.currencies FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_currencies_updated_at
  BEFORE UPDATE ON public.currencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed default currencies
INSERT INTO public.currencies (code, name, symbol, rate_to_idr, is_default, is_active)
VALUES
  ('IDR', 'Indonesian Rupiah', 'Rp', 1, true, true),
  ('USD', 'US Dollar', '$', 15800, false, true),
  ('SAR', 'Saudi Riyal', 'SAR', 4200, false, true),
  ('MYR', 'Malaysian Ringgit', 'RM', 3500, false, true)
ON CONFLICT (code) DO NOTHING;

-- ============ BOOKINGS CURRENCY ============
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'IDR';

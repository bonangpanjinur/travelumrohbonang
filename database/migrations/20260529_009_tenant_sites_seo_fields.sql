ALTER TABLE public.tenant_sites
  ADD COLUMN IF NOT EXISTS gsc_verification text,
  ADD COLUMN IF NOT EXISTS seo_default_image text;

CREATE TABLE IF NOT EXISTS public.slug_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_site_id uuid REFERENCES public.tenant_sites(id) ON DELETE CASCADE,
  resource_type text NOT NULL CHECK (resource_type IN ('package','blog','page')),
  old_slug text NOT NULL,
  new_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS slug_redirects_unique
  ON public.slug_redirects (COALESCE(tenant_site_id::text,''), resource_type, old_slug);

GRANT SELECT ON public.slug_redirects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.slug_redirects TO authenticated;
GRANT ALL ON public.slug_redirects TO service_role;

ALTER TABLE public.slug_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read slug redirects"
  ON public.slug_redirects FOR SELECT
  USING (true);

CREATE POLICY "Admins manage slug redirects"
  ON public.slug_redirects FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.seo_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  og_image TEXT,
  canonical_override TEXT,
  noindex BOOLEAN NOT NULL DEFAULT false,
  keywords TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seo_overrides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_overrides TO authenticated;
GRANT ALL ON public.seo_overrides TO service_role;

ALTER TABLE public.seo_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SEO overrides readable by all"
  ON public.seo_overrides FOR SELECT
  USING (true);

CREATE POLICY "Admins manage SEO overrides"
  ON public.seo_overrides FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER seo_overrides_set_updated_at
  BEFORE UPDATE ON public.seo_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_seo_overrides_path ON public.seo_overrides(path);

-- SEO audit results (cron output)
CREATE TABLE IF NOT EXISTS public.seo_audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  issue TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.seo_audit_results TO authenticated;
GRANT ALL ON public.seo_audit_results TO service_role;

ALTER TABLE public.seo_audit_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit"
  ON public.seo_audit_results FOR SELECT
  TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage audit"
  ON public.seo_audit_results FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

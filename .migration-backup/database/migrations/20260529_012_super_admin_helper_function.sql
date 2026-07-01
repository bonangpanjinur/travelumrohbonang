
-- Helper: super admin check
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
$$;

-- Table for integration API keys (sensitive)
CREATE TABLE IF NOT EXISTS public.integration_secrets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL UNIQUE,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_secrets TO authenticated;
GRANT ALL ON public.integration_secrets TO service_role;

ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin manage integration secrets"
ON public.integration_secrets FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_integration_secrets_updated_at
BEFORE UPDATE ON public.integration_secrets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed default login settings (2FA disabled globally by default)
INSERT INTO public.site_settings (category, key, value)
VALUES ('auth', 'settings', '{"enable_2fa": false, "require_2fa": false}'::jsonb)
ON CONFLICT (category, key) DO NOTHING;

-- Seed empty integration rows so admin UI shows them
INSERT INTO public.integration_secrets (provider, config, is_active)
VALUES
  ('resend', '{"api_key": "", "from_email": "", "from_name": ""}'::jsonb, false),
  ('fonnte', '{"api_key": "", "device": ""}'::jsonb, false),
  ('wablas', '{"api_key": "", "endpoint": ""}'::jsonb, false)
ON CONFLICT (provider) DO NOTHING;

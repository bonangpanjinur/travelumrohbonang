
-- 2FA columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT[];

-- Contracts (e-signature)
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  user_id UUID NOT NULL,
  html_content TEXT NOT NULL,
  signature_data_url TEXT,
  signed_at TIMESTAMPTZ,
  signer_ip TEXT,
  signer_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own contracts" ON public.contracts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users insert own contracts" ON public.contracts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users sign own contracts" ON public.contracts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage contracts" ON public.contracts
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER contracts_updated_at BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_contracts_booking ON public.contracts(booking_id);
CREATE INDEX IF NOT EXISTS idx_contracts_user ON public.contracts(user_id);

-- Error logs
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  level TEXT NOT NULL DEFAULT 'error',
  message TEXT NOT NULL,
  stack TEXT,
  url TEXT,
  user_agent TEXT,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.error_logs TO anon, authenticated;
GRANT SELECT, DELETE ON public.error_logs TO authenticated;
GRANT ALL ON public.error_logs TO service_role;

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert errors" ON public.error_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins read errors" ON public.error_logs
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete errors" ON public.error_logs
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_error_logs_created ON public.error_logs(created_at DESC);

-- Request log (rate limiting)
CREATE TABLE IF NOT EXISTS public.request_log (
  id BIGSERIAL PRIMARY KEY,
  ip TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.request_log TO anon, authenticated;
GRANT SELECT, DELETE ON public.request_log TO authenticated;
GRANT ALL ON public.request_log TO service_role;

ALTER TABLE public.request_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert request log" ON public.request_log
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins read request log" ON public.request_log
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_request_log_ip_endpoint_time
  ON public.request_log(ip, endpoint, created_at DESC);

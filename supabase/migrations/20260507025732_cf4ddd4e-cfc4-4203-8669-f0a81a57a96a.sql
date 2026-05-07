
-- ============ MODUL 1: AGENT COMMISSIONS & WITHDRAWALS ============
CREATE TABLE IF NOT EXISTS public.agent_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  booking_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, paid
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agent_id, booking_id)
);
ALTER TABLE public.agent_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage agent commissions" ON public.agent_commissions;
CREATE POLICY "Admins manage agent commissions" ON public.agent_commissions
  FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Agents view own commissions" ON public.agent_commissions;
CREATE POLICY "Agents view own commissions" ON public.agent_commissions
  FOR SELECT USING (EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_commissions.agent_id AND a.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.agent_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  amount numeric NOT NULL,
  bank_name text NOT NULL,
  bank_account text NOT NULL,
  account_holder text NOT NULL,
  status text NOT NULL DEFAULT 'requested', -- requested, approved, rejected, paid
  proof_url text,
  notes text,
  admin_notes text,
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage withdrawals" ON public.agent_withdrawals;
CREATE POLICY "Admins manage withdrawals" ON public.agent_withdrawals
  FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Agents view own withdrawals" ON public.agent_withdrawals;
CREATE POLICY "Agents view own withdrawals" ON public.agent_withdrawals
  FOR SELECT USING (EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_withdrawals.agent_id AND a.user_id = auth.uid()));

DROP POLICY IF EXISTS "Agents create own withdrawals" ON public.agent_withdrawals;
CREATE POLICY "Agents create own withdrawals" ON public.agent_withdrawals
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_withdrawals.agent_id AND a.user_id = auth.uid()));

-- Trigger: insert commission when booking paid
CREATE OR REPLACE FUNCTION public.create_agent_commission_on_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  commission_amt numeric := 0;
  agent_pct numeric := 0;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') AND NEW.agent_id IS NOT NULL THEN
    SELECT COALESCE(commission_percent, 0) INTO agent_pct FROM agents WHERE id = NEW.agent_id;
    commission_amt := COALESCE(NEW.total_price, 0) * agent_pct / 100;
    INSERT INTO public.agent_commissions (agent_id, booking_id, amount, status)
    VALUES (NEW.agent_id, NEW.id, commission_amt, 'pending')
    ON CONFLICT (agent_id, booking_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_agent_commission ON public.bookings;
CREATE TRIGGER trg_create_agent_commission
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.create_agent_commission_on_paid();

-- ============ MODUL 3: REFUND REQUESTS ============
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reason text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected, refunded
  admin_notes text,
  bank_name text,
  bank_account text,
  account_holder text,
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage refunds" ON public.refund_requests;
CREATE POLICY "Admins manage refunds" ON public.refund_requests FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users view own refunds" ON public.refund_requests;
CREATE POLICY "Users view own refunds" ON public.refund_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own refunds" ON public.refund_requests;
CREATE POLICY "Users create own refunds" ON public.refund_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM bookings b WHERE b.id = refund_requests.booking_id AND b.user_id = auth.uid() AND b.status = 'paid'));

-- ============ MODUL 4: AUDIT LOGS ============
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view audit logs" ON public.audit_logs;
CREATE POLICY "Admins view audit logs" ON public.audit_logs FOR SELECT USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated insert audit logs" ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON public.audit_logs(user_id, action);

-- Super admin can manage user_roles (for role management UI)
DROP POLICY IF EXISTS "Super admins manage roles" ON public.user_roles;
CREATE POLICY "Super admins manage roles" ON public.user_roles FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

-- Tenant enabled modules
ALTER TABLE public.tenant_sites ADD COLUMN IF NOT EXISTS enabled_modules jsonb DEFAULT '{"bookings":true,"crm":true,"chat":true,"refunds":true}'::jsonb;

-- ============ MODUL 5: CHAT MESSAGES ============
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL DEFAULT 'buyer', -- buyer, admin
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage chat" ON public.chat_messages;
CREATE POLICY "Admins manage chat" ON public.chat_messages FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users view own chat" ON public.chat_messages;
CREATE POLICY "Users view own chat" ON public.chat_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM bookings b WHERE b.id = chat_messages.booking_id AND b.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users send chat" ON public.chat_messages;
CREATE POLICY "Users send chat" ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM bookings b WHERE b.id = chat_messages.booking_id AND b.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users update own chat read" ON public.chat_messages;
CREATE POLICY "Users update own chat read" ON public.chat_messages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM bookings b WHERE b.id = chat_messages.booking_id AND b.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_chat_messages_booking ON public.chat_messages(booking_id, created_at);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

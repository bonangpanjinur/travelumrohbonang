
-- Batch 1: Operational + B2B tables

-- 1. Departure gallery
CREATE TABLE IF NOT EXISTS public.departure_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id uuid NOT NULL,
  image_url text NOT NULL,
  caption text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.departure_gallery TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departure_gallery TO authenticated;
GRANT ALL ON public.departure_gallery TO service_role;
ALTER TABLE public.departure_gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read gallery" ON public.departure_gallery FOR SELECT USING (true);
CREATE POLICY "Admins manage gallery" ON public.departure_gallery FOR ALL USING (is_admin(auth.uid()));

-- 2. Check-ins
CREATE TABLE IF NOT EXISTS public.check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pilgrim_id uuid NOT NULL,
  departure_id uuid,
  booking_id uuid,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  checked_in_by uuid,
  location text,
  notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.check_ins TO authenticated;
GRANT ALL ON public.check_ins TO service_role;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage checkins" ON public.check_ins FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users view own checkins" ON public.check_ins FOR SELECT USING (
  EXISTS (SELECT 1 FROM bookings b WHERE b.id = check_ins.booking_id AND b.user_id = auth.uid())
);

-- 3. Manasik materials
CREATE TABLE IF NOT EXISTS public.manasik_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'pdf',
  file_url text,
  thumbnail_url text,
  package_id uuid,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.manasik_materials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manasik_materials TO authenticated;
GRANT ALL ON public.manasik_materials TO service_role;
ALTER TABLE public.manasik_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read manasik" ON public.manasik_materials FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage manasik" ON public.manasik_materials FOR ALL USING (is_admin(auth.uid()));

-- 4. Agent target column
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS monthly_target numeric DEFAULT 0;

-- 5. Affiliate clicks
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  referral_code text,
  ip text,
  user_agent text,
  landing_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.affiliate_clicks TO anon, authenticated;
GRANT SELECT ON public.affiliate_clicks TO authenticated;
GRANT ALL ON public.affiliate_clicks TO service_role;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone insert click" ON public.affiliate_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view clicks" ON public.affiliate_clicks FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Agents view own clicks" ON public.affiliate_clicks FOR SELECT USING (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = affiliate_clicks.agent_id AND a.user_id = auth.uid())
);

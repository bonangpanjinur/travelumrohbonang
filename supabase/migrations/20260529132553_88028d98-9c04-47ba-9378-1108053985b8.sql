
-- =========================================================
-- Sprint B-D: wishlist, public reviews, loyalty, pg_cron reminders
-- =========================================================

-- 1. WISHLIST
CREATE TABLE IF NOT EXISTS public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, package_id)
);
GRANT SELECT, INSERT, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own wishlist" ON public.wishlists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own wishlist" ON public.wishlists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own wishlist" ON public.wishlists FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. PUBLIC REVIEWS (rating per paket dari jamaah)
CREATE TABLE IF NOT EXISTS public.package_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  comment text,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.package_reviews TO anon;
GRANT SELECT, INSERT, UPDATE ON public.package_reviews TO authenticated;
GRANT ALL ON public.package_reviews TO service_role;
ALTER TABLE public.package_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view approved reviews" ON public.package_reviews FOR SELECT TO anon, authenticated USING (is_approved = true OR auth.uid() = user_id);
CREATE POLICY "Users can submit reviews" ON public.package_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reviews" ON public.package_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin manage reviews" ON public.package_reviews FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 3. LOYALTY POINTS
CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points int NOT NULL DEFAULT 0,
  source text NOT NULL,
  reference_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.loyalty_points TO authenticated;
GRANT ALL ON public.loyalty_points TO service_role;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own points" ON public.loyalty_points FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin manage points" ON public.loyalty_points FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE VIEW public.loyalty_balances AS
  SELECT user_id, COALESCE(SUM(points),0) AS total_points
  FROM public.loyalty_points GROUP BY user_id;
GRANT SELECT ON public.loyalty_balances TO authenticated;

-- 4. pg_cron daily reminder dispatcher (uses existing payment-reminder edge function)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'daily-payment-reminders';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
END $$;

SELECT cron.schedule(
  'daily-payment-reminders',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://snfjildozzqlyyabeyry.supabase.co/functions/v1/payment-reminder',
    headers := jsonb_build_object('Content-Type','application/json','apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuZmppbGRvenpxbHl5YWJleXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MzgxMjUsImV4cCI6MjA4NjMxNDEyNX0.nUtGiN4fLJCZGUAhU4SlVUprqv7BVTqrFqoAcnluTjQ'),
    body := jsonb_build_object('triggered_at', now())
  );
  $$
);

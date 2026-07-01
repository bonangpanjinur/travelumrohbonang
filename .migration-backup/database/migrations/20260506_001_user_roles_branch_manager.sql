
-- 0. Relax role check constraint to allow buyer and branch_manager
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('super_admin','admin','staff','agent','branch_manager','buyer'));

-- 1. Backfill user_roles for users without any role
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'buyer'
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Update handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'buyer')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. pilgrim_testimonials
CREATE TABLE IF NOT EXISTS public.pilgrim_testimonials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message text,
  photo_url text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (booking_id, user_id)
);

ALTER TABLE public.pilgrim_testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published testimonials" ON public.pilgrim_testimonials;
CREATE POLICY "Public read published testimonials"
  ON public.pilgrim_testimonials FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Users view own testimonials" ON public.pilgrim_testimonials;
CREATE POLICY "Users view own testimonials"
  ON public.pilgrim_testimonials FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own testimonials" ON public.pilgrim_testimonials;
CREATE POLICY "Users insert own testimonials"
  ON public.pilgrim_testimonials FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.user_id = auth.uid() AND b.status = 'completed'
    )
  );

DROP POLICY IF EXISTS "Users update own unpublished testimonials" ON public.pilgrim_testimonials;
CREATE POLICY "Users update own unpublished testimonials"
  ON public.pilgrim_testimonials FOR UPDATE
  USING (auth.uid() = user_id AND is_published = false);

DROP POLICY IF EXISTS "Admins manage testimonials" ON public.pilgrim_testimonials;
CREATE POLICY "Admins manage testimonials"
  ON public.pilgrim_testimonials FOR ALL
  USING (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_pilgrim_testimonials_updated ON public.pilgrim_testimonials;
CREATE TRIGGER trg_pilgrim_testimonials_updated
  BEFORE UPDATE ON public.pilgrim_testimonials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

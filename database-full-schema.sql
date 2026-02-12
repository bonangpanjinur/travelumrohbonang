-- ============================================================
-- FULL DATABASE SCHEMA - UmrohPlus
-- Safe to run multiple times (idempotent)
-- ============================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TABLES (CREATE IF NOT EXISTS)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.airlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.airports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  star INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.muthawifs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  branch_id UUID REFERENCES public.branches(id),
  commission_percent NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.package_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.package_categories(id),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  package_type TEXT,
  category_id UUID REFERENCES public.package_categories(id),
  airline_id UUID REFERENCES public.airlines(id),
  airport_id UUID REFERENCES public.airports(id),
  hotel_makkah_id UUID REFERENCES public.hotels(id),
  hotel_madinah_id UUID REFERENCES public.hotels(id),
  duration_days INTEGER DEFAULT 9,
  dp_deadline_days INTEGER DEFAULT 30,
  full_deadline_days INTEGER DEFAULT 7,
  minimum_dp NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.package_hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.packages(id),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id),
  label TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.package_departures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES public.packages(id),
  departure_date DATE NOT NULL,
  return_date DATE,
  quota INTEGER NOT NULL,
  remaining_quota INTEGER NOT NULL,
  muthawif_id UUID REFERENCES public.muthawifs(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.departure_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID REFERENCES public.package_departures(id),
  room_type TEXT NOT NULL,
  price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.package_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.packages(id),
  pic_type TEXT NOT NULL,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID REFERENCES public.package_departures(id),
  title TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.itinerary_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID REFERENCES public.itineraries(id),
  day_number INTEGER NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code TEXT NOT NULL,
  user_id UUID,
  package_id UUID REFERENCES public.packages(id),
  departure_id UUID REFERENCES public.package_departures(id),
  total_price NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  pic_type TEXT DEFAULT 'pusat',
  pic_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK for bookings.user_id -> profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_user_id_profiles_fkey') THEN
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.booking_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id),
  room_type TEXT NOT NULL,
  price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_pilgrims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id),
  name TEXT NOT NULL,
  nik TEXT,
  gender TEXT,
  birth_date DATE,
  phone TEXT,
  email TEXT,
  passport_number TEXT,
  passport_expiry DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id),
  amount NUMERIC NOT NULL,
  payment_type TEXT DEFAULT 'full',
  payment_method TEXT,
  status TEXT DEFAULT 'pending',
  proof_url TEXT,
  paid_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  booking_id UUID REFERENCES public.bookings(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  min_purchase NUMERIC DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expired_at DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  image_url TEXT,
  author TEXT,
  category TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  category TEXT DEFAULT 'umroh',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  photo_url TEXT,
  location TEXT,
  package_name TEXT,
  rating INTEGER DEFAULT 5,
  travel_date DATE,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'star',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.advantages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  icon TEXT DEFAULT 'check-circle',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guide_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'circle',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.navigation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  parent_id UUID REFERENCES public.navigation_items(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  open_in_new_tab BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.floating_buttons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  platform TEXT NOT NULL,
  url TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  slug TEXT NOT NULL,
  content TEXT,
  seo_title TEXT,
  seo_description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug TEXT,
  section_type TEXT,
  data JSONB,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  category TEXT NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_booking_code()
RETURNS TEXT LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE new_code TEXT;
BEGIN
  new_code := 'UMR-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 4));
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin', 'admin'))
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_departure_quota_on_booking_paid()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE pilgrim_count INTEGER;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    SELECT COUNT(*) INTO pilgrim_count FROM public.booking_pilgrims WHERE booking_id = NEW.id;
    IF pilgrim_count = 0 THEN
      SELECT COALESCE(SUM(quantity), 0) INTO pilgrim_count FROM public.booking_rooms WHERE booking_id = NEW.id;
    END IF;
    IF NEW.departure_id IS NOT NULL AND pilgrim_count > 0 THEN
      UPDATE public.package_departures SET remaining_quota = remaining_quota - pilgrim_count
      WHERE id = NEW.departure_id AND remaining_quota >= pilgrim_count;
      IF NOT FOUND THEN RAISE EXCEPTION 'Kuota keberangkatan tidak mencukupi'; END IF;
    END IF;
  END IF;
  IF NEW.status = 'cancelled' AND OLD.status = 'paid' THEN
    SELECT COUNT(*) INTO pilgrim_count FROM public.booking_pilgrims WHERE booking_id = NEW.id;
    IF pilgrim_count = 0 THEN
      SELECT COALESCE(SUM(quantity), 0) INTO pilgrim_count FROM public.booking_rooms WHERE booking_id = NEW.id;
    END IF;
    IF NEW.departure_id IS NOT NULL AND pilgrim_count > 0 THEN
      UPDATE public.package_departures SET remaining_quota = remaining_quota + pilgrim_count WHERE id = NEW.departure_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. TRIGGERS
-- ============================================================

-- Auth trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Booking quota trigger
DROP TRIGGER IF EXISTS update_quota_on_booking_status ON public.bookings;
CREATE TRIGGER update_quota_on_booking_status AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_departure_quota_on_booking_paid();

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 4. ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muthawifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_departures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departure_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_pilgrims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advantages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floating_buttons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS POLICIES (DROP IF EXISTS + CREATE)
-- ============================================================

-- Helper macro: we use DROP POLICY IF EXISTS before each CREATE

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (is_admin(auth.uid()));
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles" ON public.user_roles FOR ALL USING (is_admin(auth.uid()));

-- airlines
DROP POLICY IF EXISTS "Public can read airlines" ON public.airlines;
CREATE POLICY "Public can read airlines" ON public.airlines FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage airlines" ON public.airlines;
CREATE POLICY "Admins can manage airlines" ON public.airlines FOR ALL USING (is_admin(auth.uid()));

-- airports
DROP POLICY IF EXISTS "Public can read airports" ON public.airports;
CREATE POLICY "Public can read airports" ON public.airports FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage airports" ON public.airports;
CREATE POLICY "Admins can manage airports" ON public.airports FOR ALL USING (is_admin(auth.uid()));

-- hotels
DROP POLICY IF EXISTS "Public can read hotels" ON public.hotels;
CREATE POLICY "Public can read hotels" ON public.hotels FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage hotels" ON public.hotels;
CREATE POLICY "Admins can manage hotels" ON public.hotels FOR ALL USING (is_admin(auth.uid()));

-- muthawifs
DROP POLICY IF EXISTS "Public can read muthawifs" ON public.muthawifs;
CREATE POLICY "Public can read muthawifs" ON public.muthawifs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage muthawifs" ON public.muthawifs;
CREATE POLICY "Admins can manage muthawifs" ON public.muthawifs FOR ALL USING (is_admin(auth.uid()));

-- branches
DROP POLICY IF EXISTS "Public can read branches" ON public.branches;
CREATE POLICY "Public can read branches" ON public.branches FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage branches" ON public.branches;
CREATE POLICY "Admins can manage branches" ON public.branches FOR ALL USING (is_admin(auth.uid()));

-- agents
DROP POLICY IF EXISTS "Public can read agents" ON public.agents;
CREATE POLICY "Public can read agents" ON public.agents FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage agents" ON public.agents;
CREATE POLICY "Admins can manage agents" ON public.agents FOR ALL USING (is_admin(auth.uid()));

-- package_categories
DROP POLICY IF EXISTS "Public can read package categories" ON public.package_categories;
CREATE POLICY "Public can read package categories" ON public.package_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage categories" ON public.package_categories;
CREATE POLICY "Admins can manage categories" ON public.package_categories FOR ALL USING (is_admin(auth.uid()));

-- packages
DROP POLICY IF EXISTS "Public can read packages" ON public.packages;
CREATE POLICY "Public can read packages" ON public.packages FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage packages" ON public.packages;
CREATE POLICY "Admins can manage packages" ON public.packages FOR ALL USING (is_admin(auth.uid()));

-- package_hotels
DROP POLICY IF EXISTS "Public can read package hotels" ON public.package_hotels;
CREATE POLICY "Public can read package hotels" ON public.package_hotels FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage package hotels" ON public.package_hotels;
CREATE POLICY "Admins can manage package hotels" ON public.package_hotels FOR ALL USING (is_admin(auth.uid()));

-- package_departures
DROP POLICY IF EXISTS "Public can read departures" ON public.package_departures;
CREATE POLICY "Public can read departures" ON public.package_departures FOR SELECT USING (status = 'active');
DROP POLICY IF EXISTS "Admins can manage departures" ON public.package_departures;
CREATE POLICY "Admins can manage departures" ON public.package_departures FOR ALL USING (is_admin(auth.uid()));

-- departure_prices
DROP POLICY IF EXISTS "Public can read departure prices" ON public.departure_prices;
CREATE POLICY "Public can read departure prices" ON public.departure_prices FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage prices" ON public.departure_prices;
CREATE POLICY "Admins can manage prices" ON public.departure_prices FOR ALL USING (is_admin(auth.uid()));

-- package_commissions
DROP POLICY IF EXISTS "Public can read package commissions" ON public.package_commissions;
CREATE POLICY "Public can read package commissions" ON public.package_commissions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage package commissions" ON public.package_commissions;
CREATE POLICY "Admins can manage package commissions" ON public.package_commissions FOR ALL USING (is_admin(auth.uid()));

-- itineraries
DROP POLICY IF EXISTS "Public can read itineraries" ON public.itineraries;
CREATE POLICY "Public can read itineraries" ON public.itineraries FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage itineraries" ON public.itineraries;
CREATE POLICY "Admins can manage itineraries" ON public.itineraries FOR ALL USING (is_admin(auth.uid()));

-- itinerary_days
DROP POLICY IF EXISTS "Public can read itinerary days" ON public.itinerary_days;
CREATE POLICY "Public can read itinerary days" ON public.itinerary_days FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage itinerary days" ON public.itinerary_days;
CREATE POLICY "Admins can manage itinerary days" ON public.itinerary_days FOR ALL USING (is_admin(auth.uid()));

-- bookings
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
CREATE POLICY "Users can update own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id AND status = 'draft');
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
CREATE POLICY "Admins can manage all bookings" ON public.bookings FOR ALL USING (is_admin(auth.uid()));

-- booking_rooms
DROP POLICY IF EXISTS "Users can view own booking rooms" ON public.booking_rooms;
CREATE POLICY "Users can view own booking rooms" ON public.booking_rooms FOR SELECT USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_rooms.booking_id AND bookings.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can create booking rooms" ON public.booking_rooms;
CREATE POLICY "Users can create booking rooms" ON public.booking_rooms FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_rooms.booking_id AND bookings.user_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can manage booking rooms" ON public.booking_rooms;
CREATE POLICY "Admins can manage booking rooms" ON public.booking_rooms FOR ALL USING (is_admin(auth.uid()));

-- booking_pilgrims
DROP POLICY IF EXISTS "Users can view own pilgrims" ON public.booking_pilgrims;
CREATE POLICY "Users can view own pilgrims" ON public.booking_pilgrims FOR SELECT USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_pilgrims.booking_id AND bookings.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can create pilgrims" ON public.booking_pilgrims;
CREATE POLICY "Users can create pilgrims" ON public.booking_pilgrims FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_pilgrims.booking_id AND bookings.user_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can manage pilgrims" ON public.booking_pilgrims;
CREATE POLICY "Admins can manage pilgrims" ON public.booking_pilgrims FOR ALL USING (is_admin(auth.uid()));

-- payments
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can create payments" ON public.payments;
CREATE POLICY "Users can create payments" ON public.payments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid()));
DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;
CREATE POLICY "Admins can manage payments" ON public.payments FOR ALL USING (is_admin(auth.uid()));

-- notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role can create notifications" ON public.notifications;
CREATE POLICY "Service role can create notifications" ON public.notifications FOR INSERT WITH CHECK (is_admin(auth.uid()) OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
CREATE POLICY "Admins can manage all notifications" ON public.notifications FOR ALL USING (is_admin(auth.uid()));

-- coupons
DROP POLICY IF EXISTS "Public can read active coupons" ON public.coupons;
CREATE POLICY "Public can read active coupons" ON public.coupons FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (is_admin(auth.uid()));

-- blog_posts
DROP POLICY IF EXISTS "Public can read published blog posts" ON public.blog_posts;
CREATE POLICY "Public can read published blog posts" ON public.blog_posts FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS "Admins can manage blog posts" ON public.blog_posts;
CREATE POLICY "Admins can manage blog posts" ON public.blog_posts FOR ALL USING (is_admin(auth.uid()));

-- gallery
DROP POLICY IF EXISTS "Public can read gallery" ON public.gallery;
CREATE POLICY "Public can read gallery" ON public.gallery FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage gallery" ON public.gallery;
CREATE POLICY "Admins can manage gallery" ON public.gallery FOR ALL USING (is_admin(auth.uid()));

-- testimonials
DROP POLICY IF EXISTS "Public can read testimonials" ON public.testimonials;
CREATE POLICY "Public can read testimonials" ON public.testimonials FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage testimonials" ON public.testimonials;
CREATE POLICY "Admins can manage testimonials" ON public.testimonials FOR ALL USING (is_admin(auth.uid()));

-- faqs
DROP POLICY IF EXISTS "Anyone can view active FAQs" ON public.faqs;
CREATE POLICY "Anyone can view active FAQs" ON public.faqs FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage FAQs" ON public.faqs;
CREATE POLICY "Admins can manage FAQs" ON public.faqs FOR ALL USING (is_admin(auth.uid()));

-- services
DROP POLICY IF EXISTS "Public can read active services" ON public.services;
CREATE POLICY "Public can read active services" ON public.services FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
CREATE POLICY "Admins can manage services" ON public.services FOR ALL USING (is_admin(auth.uid()));

-- advantages
DROP POLICY IF EXISTS "Public can read advantages" ON public.advantages;
CREATE POLICY "Public can read advantages" ON public.advantages FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage advantages" ON public.advantages;
CREATE POLICY "Admins can manage advantages" ON public.advantages FOR ALL USING (is_admin(auth.uid()));

-- guide_steps
DROP POLICY IF EXISTS "Public can read guide steps" ON public.guide_steps;
CREATE POLICY "Public can read guide steps" ON public.guide_steps FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage guide steps" ON public.guide_steps;
CREATE POLICY "Admins can manage guide steps" ON public.guide_steps FOR ALL USING (is_admin(auth.uid()));

-- navigation_items
DROP POLICY IF EXISTS "Public can read active navigation items" ON public.navigation_items;
CREATE POLICY "Public can read active navigation items" ON public.navigation_items FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage navigation items" ON public.navigation_items;
CREATE POLICY "Admins can manage navigation items" ON public.navigation_items FOR ALL USING (is_admin(auth.uid()));

-- floating_buttons
DROP POLICY IF EXISTS "Anyone can view active floating buttons" ON public.floating_buttons;
CREATE POLICY "Anyone can view active floating buttons" ON public.floating_buttons FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage floating buttons" ON public.floating_buttons;
CREATE POLICY "Admins can manage floating buttons" ON public.floating_buttons FOR ALL USING (is_admin(auth.uid()));

-- pages
DROP POLICY IF EXISTS "Public can read pages" ON public.pages;
CREATE POLICY "Public can read pages" ON public.pages FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage pages" ON public.pages;
CREATE POLICY "Admins can manage pages" ON public.pages FOR ALL USING (is_admin(auth.uid()));

-- sections
DROP POLICY IF EXISTS "Public can read sections" ON public.sections;
CREATE POLICY "Public can read sections" ON public.sections FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage sections" ON public.sections;
CREATE POLICY "Admins can manage sections" ON public.sections FOR ALL USING (is_admin(auth.uid()));

-- settings
DROP POLICY IF EXISTS "Public can read settings" ON public.settings;
CREATE POLICY "Public can read settings" ON public.settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
CREATE POLICY "Admins can manage settings" ON public.settings FOR ALL USING (is_admin(auth.uid()));

-- site_settings
DROP POLICY IF EXISTS "Public can read site settings" ON public.site_settings;
CREATE POLICY "Public can read site settings" ON public.site_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;
CREATE POLICY "Admins can manage site settings" ON public.site_settings FOR ALL USING (is_admin(auth.uid()));

-- ============================================================
-- 6. STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('cms-images', 'cms-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('testimonials', 'testimonials', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('blog', 'blog', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies (public read for all buckets)
DO $$ 
DECLARE bucket_name TEXT;
BEGIN
  FOR bucket_name IN SELECT unnest(ARRAY['payment-proofs','cms-images','gallery','testimonials','blog','avatars']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read %s" ON storage.objects', bucket_name);
    EXECUTE format('CREATE POLICY "Public read %s" ON storage.objects FOR SELECT USING (bucket_id = %L)', bucket_name, bucket_name);
    
    EXECUTE format('DROP POLICY IF EXISTS "Auth upload %s" ON storage.objects', bucket_name);
    EXECUTE format('CREATE POLICY "Auth upload %s" ON storage.objects FOR INSERT WITH CHECK (bucket_id = %L AND auth.role() = ''authenticated'')', bucket_name, bucket_name);
    
    EXECUTE format('DROP POLICY IF EXISTS "Auth update %s" ON storage.objects', bucket_name);
    EXECUTE format('CREATE POLICY "Auth update %s" ON storage.objects FOR UPDATE USING (bucket_id = %L AND auth.role() = ''authenticated'')', bucket_name, bucket_name);
    
    EXECUTE format('DROP POLICY IF EXISTS "Auth delete %s" ON storage.objects', bucket_name);
    EXECUTE format('CREATE POLICY "Auth delete %s" ON storage.objects FOR DELETE USING (bucket_id = %L AND auth.role() = ''authenticated'')', bucket_name, bucket_name);
  END LOOP;
END $$;

-- ============================================================
-- DONE! Jalankan file ini di SQL Editor Supabase Anda.
-- ============================================================

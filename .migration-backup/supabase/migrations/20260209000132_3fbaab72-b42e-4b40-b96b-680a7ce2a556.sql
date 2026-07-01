-- ENUM TYPES (using TEXT with CHECK for flexibility)
-- No explicit ENUM needed, using CHECK constraints in tables

-- 1. PROFILES (linked to auth.users for roles - keeping roles SEPARATE for security)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. USER ROLES (separate table for security - CRITICAL for privilege escalation prevention)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('super_admin','admin','staff','agent')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3. BRANCHES (Cabang)
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. AGENTS (Agen)
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  commission_percent NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. DATA MASTER: HOTELS
CREATE TABLE public.hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  star INTEGER CHECK (star >= 1 AND star <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. DATA MASTER: AIRLINES
CREATE TABLE public.airlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. DATA MASTER: AIRPORTS
CREATE TABLE public.airports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. DATA MASTER: MUTHAWIFS
CREATE TABLE public.muthawifs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. PACKAGE CATEGORIES
CREATE TABLE public.package_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. PACKAGES (Paket Umroh)
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category_id UUID REFERENCES public.package_categories(id) ON DELETE SET NULL,
  description TEXT,
  package_type TEXT,
  image_url TEXT,
  hotel_makkah_id UUID REFERENCES public.hotels(id) ON DELETE SET NULL,
  hotel_madinah_id UUID REFERENCES public.hotels(id) ON DELETE SET NULL,
  airline_id UUID REFERENCES public.airlines(id) ON DELETE SET NULL,
  airport_id UUID REFERENCES public.airports(id) ON DELETE SET NULL,
  duration_days INTEGER DEFAULT 9,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 11. PACKAGE DEPARTURES (Keberangkatan)
CREATE TABLE public.package_departures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES public.packages(id) ON DELETE CASCADE,
  departure_date DATE NOT NULL,
  return_date DATE,
  quota INTEGER NOT NULL,
  remaining_quota INTEGER NOT NULL,
  status TEXT CHECK (status IN ('active','closed')) DEFAULT 'active',
  muthawif_id UUID REFERENCES public.muthawifs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 12. DEPARTURE PRICES (Harga per Tipe Kamar)
CREATE TABLE public.departure_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID REFERENCES public.package_departures(id) ON DELETE CASCADE,
  room_type TEXT CHECK (room_type IN ('quad','triple','double')) NOT NULL,
  price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 13. ITINERARIES (per Keberangkatan)
CREATE TABLE public.itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID REFERENCES public.package_departures(id) ON DELETE CASCADE,
  title TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 14. ITINERARY DAYS
CREATE TABLE public.itinerary_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID REFERENCES public.itineraries(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 15. BOOKINGS
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  departure_id UUID REFERENCES public.package_departures(id) ON DELETE SET NULL,
  pic_type TEXT CHECK (pic_type IN ('pusat','branch','agent')) DEFAULT 'pusat',
  pic_id UUID,
  total_price NUMERIC NOT NULL DEFAULT 0,
  status TEXT CHECK (status IN ('draft','waiting_payment','paid','cancelled')) DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 16. BOOKING ROOMS (Jumlah Orang & Harga per Tipe Kamar)
CREATE TABLE public.booking_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  room_type TEXT CHECK (room_type IN ('quad','triple','double')) NOT NULL,
  price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 17. BOOKING PILGRIMS (Data Jemaah)
CREATE TABLE public.booking_pilgrims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  gender TEXT CHECK (gender IN ('male','female')),
  nik TEXT,
  passport_number TEXT,
  passport_expiry DATE,
  birth_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 18. PAYMENTS
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  payment_method TEXT,
  amount NUMERIC NOT NULL,
  proof_url TEXT,
  status TEXT CHECK (status IN ('pending','paid','failed')) DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 19. COUPONS
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percent','fixed')) NOT NULL,
  value NUMERIC NOT NULL,
  min_purchase NUMERIC DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  expired_at DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 20. CMS PAGES
CREATE TABLE public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT,
  content TEXT,
  seo_title TEXT,
  seo_description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 21. CMS SECTIONS
CREATE TABLE public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug TEXT,
  section_type TEXT,
  data JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 22. SETTINGS (Key-Value)
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muthawifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_departures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departure_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_pilgrims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER FUNCTION: Check if user has role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- SECURITY DEFINER FUNCTION: Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin')
  )
$$;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin(auth.uid()));

-- USER ROLES POLICIES (admin only)
CREATE POLICY "Admins can manage user roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- PUBLIC READ for master data (packages, categories, hotels, etc.)
CREATE POLICY "Public can read packages" ON public.packages FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read package categories" ON public.package_categories FOR SELECT USING (true);
CREATE POLICY "Public can read hotels" ON public.hotels FOR SELECT USING (true);
CREATE POLICY "Public can read airlines" ON public.airlines FOR SELECT USING (true);
CREATE POLICY "Public can read airports" ON public.airports FOR SELECT USING (true);
CREATE POLICY "Public can read departures" ON public.package_departures FOR SELECT USING (status = 'active');
CREATE POLICY "Public can read departure prices" ON public.departure_prices FOR SELECT USING (true);
CREATE POLICY "Public can read itineraries" ON public.itineraries FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read itinerary days" ON public.itinerary_days FOR SELECT USING (true);
CREATE POLICY "Public can read pages" ON public.pages FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read sections" ON public.sections FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Public can read active coupons" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read branches" ON public.branches FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read agents" ON public.agents FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read muthawifs" ON public.muthawifs FOR SELECT USING (true);

-- ADMIN WRITE policies for master data
CREATE POLICY "Admins can manage packages" ON public.packages FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage categories" ON public.package_categories FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage hotels" ON public.hotels FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage airlines" ON public.airlines FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage airports" ON public.airports FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage departures" ON public.package_departures FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage prices" ON public.departure_prices FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage itineraries" ON public.itineraries FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage itinerary days" ON public.itinerary_days FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage pages" ON public.pages FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage sections" ON public.sections FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage settings" ON public.settings FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage branches" ON public.branches FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage agents" ON public.agents FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage muthawifs" ON public.muthawifs FOR ALL USING (public.is_admin(auth.uid()));

-- BOOKINGS POLICIES
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id AND status = 'draft');
CREATE POLICY "Admins can manage all bookings" ON public.bookings FOR ALL USING (public.is_admin(auth.uid()));

-- BOOKING ROOMS POLICIES
CREATE POLICY "Users can view own booking rooms" ON public.booking_rooms FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_rooms.booking_id AND bookings.user_id = auth.uid()));
CREATE POLICY "Users can create booking rooms" ON public.booking_rooms FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_rooms.booking_id AND bookings.user_id = auth.uid()));
CREATE POLICY "Admins can manage booking rooms" ON public.booking_rooms FOR ALL USING (public.is_admin(auth.uid()));

-- BOOKING PILGRIMS POLICIES
CREATE POLICY "Users can view own pilgrims" ON public.booking_pilgrims FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_pilgrims.booking_id AND bookings.user_id = auth.uid()));
CREATE POLICY "Users can create pilgrims" ON public.booking_pilgrims FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_pilgrims.booking_id AND bookings.user_id = auth.uid()));
CREATE POLICY "Admins can manage pilgrims" ON public.booking_pilgrims FOR ALL USING (public.is_admin(auth.uid()));

-- PAYMENTS POLICIES
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid()));
CREATE POLICY "Users can create payments" ON public.payments FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid()));
CREATE POLICY "Admins can manage payments" ON public.payments FOR ALL USING (public.is_admin(auth.uid()));

-- FUNCTION: Create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- TRIGGER: Auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- FUNCTION: Generate booking code
CREATE OR REPLACE FUNCTION public.generate_booking_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
BEGIN
  new_code := 'UMR-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 4));
  RETURN new_code;
END;
$$;
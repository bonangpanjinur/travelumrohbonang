-- ============================================================
-- AISYAH TOUR & TRAVEL - COMPLETE DATABASE SCHEMA
-- Single-file Supabase Migration (FULL)
-- Generated: 2026-02-09
-- ============================================================
-- CATATAN: File ini berisi SELURUH skema database proyek.
-- Jalankan di Supabase SQL Editor pada project baru.
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


-- ============================================================
-- 2. HELPER FUNCTIONS (harus dibuat sebelum tabel & policies)
-- ============================================================

-- Cek apakah user adalah admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
  );
$$;

-- Cek apakah user memiliki role tertentu
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Generate kode booking unik
CREATE OR REPLACE FUNCTION public.generate_booking_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
BEGIN
  new_code := 'UMR-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 4));
  RETURN new_code;
END;
$$;

-- Auto-create profile saat user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
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

-- Auto-update kolom updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Auto-manage kuota keberangkatan saat status booking berubah
CREATE OR REPLACE FUNCTION public.update_departure_quota_on_booking_paid()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pilgrim_count INTEGER;
BEGIN
  -- Booking dibayar → kurangi kuota
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    SELECT COUNT(*) INTO pilgrim_count
    FROM public.booking_pilgrims WHERE booking_id = NEW.id;

    IF pilgrim_count = 0 THEN
      SELECT COALESCE(SUM(quantity), 0) INTO pilgrim_count
      FROM public.booking_rooms WHERE booking_id = NEW.id;
    END IF;

    IF NEW.departure_id IS NOT NULL AND pilgrim_count > 0 THEN
      UPDATE public.package_departures
      SET remaining_quota = remaining_quota - pilgrim_count
      WHERE id = NEW.departure_id AND remaining_quota >= pilgrim_count;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Kuota keberangkatan tidak mencukupi';
      END IF;
    END IF;
  END IF;

  -- Booking dibatalkan dari paid → kembalikan kuota
  IF NEW.status = 'cancelled' AND OLD.status = 'paid' THEN
    SELECT COUNT(*) INTO pilgrim_count
    FROM public.booking_pilgrims WHERE booking_id = NEW.id;

    IF pilgrim_count = 0 THEN
      SELECT COALESCE(SUM(quantity), 0) INTO pilgrim_count
      FROM public.booking_rooms WHERE booking_id = NEW.id;
    END IF;

    IF NEW.departure_id IS NOT NULL AND pilgrim_count > 0 THEN
      UPDATE public.package_departures
      SET remaining_quota = remaining_quota + pilgrim_count
      WHERE id = NEW.departure_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


-- ============================================================
-- 3. SEMUA TABEL (34 tabel)
-- ============================================================

-- 3.1 Profiles (data user tambahan)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.2 User Roles (role-based access control)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.3 Branches (cabang)
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.4 Agents (agen penjualan)
CREATE TABLE IF NOT EXISTS public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  commission_percent numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  branch_id uuid REFERENCES public.branches(id),
  created_at timestamp with time zone DEFAULT now()
);

-- 3.5 Airlines (maskapai)
CREATE TABLE IF NOT EXISTS public.airlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.6 Airports (bandara)
CREATE TABLE IF NOT EXISTS public.airports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  code text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.7 Hotels
CREATE TABLE IF NOT EXISTS public.hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  star integer,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.8 Muthawifs (pembimbing ibadah)
CREATE TABLE IF NOT EXISTS public.muthawifs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  photo_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.9 Package Categories (kategori paket)
CREATE TABLE IF NOT EXISTS public.package_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  parent_id uuid REFERENCES public.package_categories(id),
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.10 Packages (paket umroh/haji)
CREATE TABLE IF NOT EXISTS public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  package_type text,
  duration_days integer DEFAULT 9,
  minimum_dp numeric DEFAULT 0,
  dp_deadline_days integer DEFAULT 30,
  full_deadline_days integer DEFAULT 7,
  is_active boolean DEFAULT true,
  category_id uuid REFERENCES public.package_categories(id),
  hotel_makkah_id uuid REFERENCES public.hotels(id),
  hotel_madinah_id uuid REFERENCES public.hotels(id),
  airline_id uuid REFERENCES public.airlines(id),
  airport_id uuid REFERENCES public.airports(id),
  created_at timestamp with time zone DEFAULT now()
);

-- 3.11 Package Commissions (komisi per paket)
-- FIX #1: Tambahkan UNIQUE constraint (package_id, pic_type) untuk upsert
CREATE TABLE IF NOT EXISTS public.package_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id),
  pic_type text NOT NULL,
  commission_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (package_id, pic_type)
);

-- 3.12 Package Departures (jadwal keberangkatan)
CREATE TABLE IF NOT EXISTS public.package_departures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid REFERENCES public.packages(id),
  muthawif_id uuid REFERENCES public.muthawifs(id),
  departure_date date NOT NULL,
  return_date date,
  quota integer NOT NULL,
  remaining_quota integer NOT NULL,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now()
);

-- 3.13 Departure Prices (harga per tipe kamar per keberangkatan)
CREATE TABLE IF NOT EXISTS public.departure_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id uuid REFERENCES public.package_departures(id),
  room_type text NOT NULL,
  price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.14 Itineraries (jadwal perjalanan)
CREATE TABLE IF NOT EXISTS public.itineraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id uuid REFERENCES public.package_departures(id),
  title text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.15 Itinerary Days (detail per hari)
CREATE TABLE IF NOT EXISTS public.itinerary_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id uuid REFERENCES public.itineraries(id),
  day_number integer NOT NULL,
  title text,
  description text,
  image_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.16 Bookings (pemesanan)
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code text NOT NULL UNIQUE,
  user_id uuid REFERENCES public.profiles(id),
  package_id uuid REFERENCES public.packages(id),
  departure_id uuid REFERENCES public.package_departures(id),
  total_price numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'draft',
  notes text,
  pic_id uuid,
  pic_type text DEFAULT 'pusat',
  created_at timestamp with time zone DEFAULT now()
);

-- 3.17 Booking Rooms (kamar dalam booking)
CREATE TABLE IF NOT EXISTS public.booking_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id),
  room_type text NOT NULL,
  quantity integer NOT NULL,
  price numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.18 Booking Pilgrims (data jemaah per booking)
CREATE TABLE IF NOT EXISTS public.booking_pilgrims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id),
  name text NOT NULL,
  nik text,
  passport_number text,
  passport_expiry date,
  birth_date date,
  gender text,
  phone text,
  email text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.19 Payments (pembayaran)
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id),
  amount numeric NOT NULL,
  payment_type text DEFAULT 'full',
  payment_method text,
  status text DEFAULT 'pending',
  proof_url text,
  paid_at timestamp with time zone,
  deadline timestamp with time zone,
  verified_by uuid,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.20 Notifications (notifikasi)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  booking_id uuid REFERENCES public.bookings(id),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.21 Coupons (kupon diskon)
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL,
  value numeric NOT NULL,
  min_purchase numeric DEFAULT 0,
  max_uses integer,
  used_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  expired_at date,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.22 Blog Posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text,
  excerpt text,
  image_url text,
  author text,
  category text,
  is_published boolean DEFAULT false,
  published_at timestamp with time zone,
  seo_title text,
  seo_description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3.23 FAQs
CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.24 Gallery
CREATE TABLE IF NOT EXISTS public.gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  title text,
  description text,
  category text DEFAULT 'umroh',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.25 Testimonials
CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content text NOT NULL,
  photo_url text,
  rating integer DEFAULT 5,
  location text,
  package_name text,
  travel_date date,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.26 Services (layanan yang ditampilkan di homepage)
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'star',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.27 Advantages (keunggulan yang ditampilkan di homepage)
CREATE TABLE IF NOT EXISTS public.advantages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  icon text DEFAULT 'check-circle',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.28 Guide Steps (langkah panduan booking)
CREATE TABLE IF NOT EXISTS public.guide_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_number integer NOT NULL,
  title text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'circle',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.29 Navigation Items (menu navigasi dinamis)
CREATE TABLE IF NOT EXISTS public.navigation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  url text NOT NULL,
  parent_id uuid REFERENCES public.navigation_items(id),
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  open_in_new_tab boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.30 Floating Buttons (tombol floating WA, dll)
CREATE TABLE IF NOT EXISTS public.floating_buttons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  platform text NOT NULL,
  url text,
  icon text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.31 Pages (halaman CMS)
CREATE TABLE IF NOT EXISTS public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  slug text NOT NULL UNIQUE,
  content text,
  seo_title text,
  seo_description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.32 Sections (page builder sections)
CREATE TABLE IF NOT EXISTS public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug text,
  section_type text,
  data jsonb,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.33 Settings (key-value settings)
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3.34 Site Settings (JSON settings dengan kategori)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  category text NOT NULL,
  value jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(key, category)
);


-- ============================================================
-- 4. ENABLE ROW LEVEL SECURITY (semua tabel)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muthawifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_departures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departure_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_pilgrims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
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
-- 5. RLS POLICIES (seluruh tabel)
-- ============================================================

-- ==================== PROFILES ====================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ==================== USER ROLES ====================
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== BRANCHES ====================
DROP POLICY IF EXISTS "Public can read branches" ON public.branches;
CREATE POLICY "Public can read branches" ON public.branches
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage branches" ON public.branches;
CREATE POLICY "Admins can manage branches" ON public.branches
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== AGENTS ====================
DROP POLICY IF EXISTS "Public can read agents" ON public.agents;
CREATE POLICY "Public can read agents" ON public.agents
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage agents" ON public.agents;
CREATE POLICY "Admins can manage agents" ON public.agents
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== AIRLINES ====================
DROP POLICY IF EXISTS "Public can read airlines" ON public.airlines;
CREATE POLICY "Public can read airlines" ON public.airlines
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage airlines" ON public.airlines;
CREATE POLICY "Admins can manage airlines" ON public.airlines
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== AIRPORTS ====================
DROP POLICY IF EXISTS "Public can read airports" ON public.airports;
CREATE POLICY "Public can read airports" ON public.airports
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage airports" ON public.airports;
CREATE POLICY "Admins can manage airports" ON public.airports
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== HOTELS ====================
DROP POLICY IF EXISTS "Public can read hotels" ON public.hotels;
CREATE POLICY "Public can read hotels" ON public.hotels
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage hotels" ON public.hotels;
CREATE POLICY "Admins can manage hotels" ON public.hotels
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== MUTHAWIFS ====================
DROP POLICY IF EXISTS "Public can read muthawifs" ON public.muthawifs;
CREATE POLICY "Public can read muthawifs" ON public.muthawifs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage muthawifs" ON public.muthawifs;
CREATE POLICY "Admins can manage muthawifs" ON public.muthawifs
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== PACKAGE CATEGORIES ====================
DROP POLICY IF EXISTS "Public can read package categories" ON public.package_categories;
CREATE POLICY "Public can read package categories" ON public.package_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.package_categories;
CREATE POLICY "Admins can manage categories" ON public.package_categories
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== PACKAGES ====================
DROP POLICY IF EXISTS "Public can read packages" ON public.packages;
CREATE POLICY "Public can read packages" ON public.packages
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage packages" ON public.packages;
CREATE POLICY "Admins can manage packages" ON public.packages
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== PACKAGE COMMISSIONS ====================
DROP POLICY IF EXISTS "Public can read package commissions" ON public.package_commissions;
CREATE POLICY "Public can read package commissions" ON public.package_commissions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage package commissions" ON public.package_commissions;
CREATE POLICY "Admins can manage package commissions" ON public.package_commissions
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== PACKAGE DEPARTURES ====================
DROP POLICY IF EXISTS "Public can read departures" ON public.package_departures;
CREATE POLICY "Public can read departures" ON public.package_departures
  FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Admins can manage departures" ON public.package_departures;
CREATE POLICY "Admins can manage departures" ON public.package_departures
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== DEPARTURE PRICES ====================
DROP POLICY IF EXISTS "Public can read departure prices" ON public.departure_prices;
CREATE POLICY "Public can read departure prices" ON public.departure_prices
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage prices" ON public.departure_prices;
CREATE POLICY "Admins can manage prices" ON public.departure_prices
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== ITINERARIES ====================
DROP POLICY IF EXISTS "Public can read itineraries" ON public.itineraries;
CREATE POLICY "Public can read itineraries" ON public.itineraries
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage itineraries" ON public.itineraries;
CREATE POLICY "Admins can manage itineraries" ON public.itineraries
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== ITINERARY DAYS ====================
DROP POLICY IF EXISTS "Public can read itinerary days" ON public.itinerary_days;
CREATE POLICY "Public can read itinerary days" ON public.itinerary_days
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage itinerary days" ON public.itinerary_days;
CREATE POLICY "Admins can manage itinerary days" ON public.itinerary_days
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== BOOKINGS ====================
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = user_id AND status = 'draft');

DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
CREATE POLICY "Admins can manage all bookings" ON public.bookings
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== BOOKING ROOMS ====================
DROP POLICY IF EXISTS "Users can view own booking rooms" ON public.booking_rooms;
CREATE POLICY "Users can view own booking rooms" ON public.booking_rooms
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM bookings WHERE bookings.id = booking_rooms.booking_id AND bookings.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can create booking rooms" ON public.booking_rooms;
CREATE POLICY "Users can create booking rooms" ON public.booking_rooms
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM bookings WHERE bookings.id = booking_rooms.booking_id AND bookings.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins can manage booking rooms" ON public.booking_rooms;
CREATE POLICY "Admins can manage booking rooms" ON public.booking_rooms
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== BOOKING PILGRIMS ====================
DROP POLICY IF EXISTS "Users can view own pilgrims" ON public.booking_pilgrims;
CREATE POLICY "Users can view own pilgrims" ON public.booking_pilgrims
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM bookings WHERE bookings.id = booking_pilgrims.booking_id AND bookings.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can create pilgrims" ON public.booking_pilgrims;
CREATE POLICY "Users can create pilgrims" ON public.booking_pilgrims
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM bookings WHERE bookings.id = booking_pilgrims.booking_id AND bookings.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins can manage pilgrims" ON public.booking_pilgrims;
CREATE POLICY "Admins can manage pilgrims" ON public.booking_pilgrims
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== PAYMENTS ====================
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can create payments" ON public.payments;
CREATE POLICY "Users can create payments" ON public.payments
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;
CREATE POLICY "Admins can manage payments" ON public.payments
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== NOTIFICATIONS ====================
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can create notifications" ON public.notifications;
CREATE POLICY "Service role can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (is_admin(auth.uid()) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
CREATE POLICY "Admins can manage all notifications" ON public.notifications
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== COUPONS ====================
DROP POLICY IF EXISTS "Public can read active coupons" ON public.coupons;
CREATE POLICY "Public can read active coupons" ON public.coupons
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons" ON public.coupons
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== BLOG POSTS ====================
DROP POLICY IF EXISTS "Public can read published blog posts" ON public.blog_posts;
CREATE POLICY "Public can read published blog posts" ON public.blog_posts
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Admins can manage blog posts" ON public.blog_posts;
CREATE POLICY "Admins can manage blog posts" ON public.blog_posts
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== FAQS ====================
DROP POLICY IF EXISTS "Anyone can view active FAQs" ON public.faqs;
CREATE POLICY "Anyone can view active FAQs" ON public.faqs
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage FAQs" ON public.faqs;
CREATE POLICY "Admins can manage FAQs" ON public.faqs
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== GALLERY ====================
DROP POLICY IF EXISTS "Public can read gallery" ON public.gallery;
CREATE POLICY "Public can read gallery" ON public.gallery
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage gallery" ON public.gallery;
CREATE POLICY "Admins can manage gallery" ON public.gallery
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== TESTIMONIALS ====================
DROP POLICY IF EXISTS "Public can read testimonials" ON public.testimonials;
CREATE POLICY "Public can read testimonials" ON public.testimonials
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage testimonials" ON public.testimonials;
CREATE POLICY "Admins can manage testimonials" ON public.testimonials
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== SERVICES ====================
DROP POLICY IF EXISTS "Public can read active services" ON public.services;
CREATE POLICY "Public can read active services" ON public.services
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
CREATE POLICY "Admins can manage services" ON public.services
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== ADVANTAGES ====================
DROP POLICY IF EXISTS "Public can read advantages" ON public.advantages;
CREATE POLICY "Public can read advantages" ON public.advantages
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage advantages" ON public.advantages;
CREATE POLICY "Admins can manage advantages" ON public.advantages
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== GUIDE STEPS ====================
DROP POLICY IF EXISTS "Public can read guide steps" ON public.guide_steps;
CREATE POLICY "Public can read guide steps" ON public.guide_steps
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage guide steps" ON public.guide_steps;
CREATE POLICY "Admins can manage guide steps" ON public.guide_steps
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== NAVIGATION ITEMS ====================
DROP POLICY IF EXISTS "Public can read active navigation items" ON public.navigation_items;
CREATE POLICY "Public can read active navigation items" ON public.navigation_items
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage navigation items" ON public.navigation_items;
CREATE POLICY "Admins can manage navigation items" ON public.navigation_items
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== FLOATING BUTTONS ====================
DROP POLICY IF EXISTS "Anyone can view active floating buttons" ON public.floating_buttons;
CREATE POLICY "Anyone can view active floating buttons" ON public.floating_buttons
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage floating buttons" ON public.floating_buttons;
CREATE POLICY "Admins can manage floating buttons" ON public.floating_buttons
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== PAGES ====================
DROP POLICY IF EXISTS "Public can read pages" ON public.pages;
CREATE POLICY "Public can read pages" ON public.pages
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage pages" ON public.pages;
CREATE POLICY "Admins can manage pages" ON public.pages
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== SECTIONS ====================
DROP POLICY IF EXISTS "Public can read sections" ON public.sections;
CREATE POLICY "Public can read sections" ON public.sections
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage sections" ON public.sections;
CREATE POLICY "Admins can manage sections" ON public.sections
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== SETTINGS ====================
DROP POLICY IF EXISTS "Public can read settings" ON public.settings;
CREATE POLICY "Public can read settings" ON public.settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
CREATE POLICY "Admins can manage settings" ON public.settings
  FOR ALL USING (is_admin(auth.uid()));

-- ==================== SITE SETTINGS ====================
DROP POLICY IF EXISTS "Public can read site settings" ON public.site_settings;
CREATE POLICY "Public can read site settings" ON public.site_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;
CREATE POLICY "Admins can manage site settings" ON public.site_settings
  FOR ALL USING (is_admin(auth.uid()));


-- ============================================================
-- 6. TRIGGERS
-- ============================================================

-- Auto-create profile saat user signup via auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-update blog_posts.updated_at
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Auto-update site_settings.updated_at
DROP TRIGGER IF EXISTS update_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- FIX #3: Gunakan AFTER UPDATE OF status (lebih efisien, hanya trigger saat kolom status berubah)
DROP TRIGGER IF EXISTS on_booking_status_change ON public.bookings;
CREATE TRIGGER on_booking_status_change
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_departure_quota_on_booking_paid();


-- ============================================================
-- 7. STORAGE BUCKETS & POLICIES
-- ============================================================

-- Buat bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('cms-images', 'cms-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('testimonials', 'testimonials', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('blog', 'blog', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read
DROP POLICY IF EXISTS "Public read all buckets" ON storage.objects;
CREATE POLICY "Public read all buckets" ON storage.objects
  FOR SELECT USING (true);

-- Storage policies: authenticated upload payment proofs
DROP POLICY IF EXISTS "Auth users can upload payment proofs" ON storage.objects;
CREATE POLICY "Auth users can upload payment proofs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'payment-proofs' AND auth.role() = 'authenticated');

-- Storage policies: authenticated upload avatars
DROP POLICY IF EXISTS "Auth users can upload avatars" ON storage.objects;
CREATE POLICY "Auth users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- FIX #2: Gunakan is_admin() alih-alih query langsung ke user_roles
-- Storage policies: admin upload CMS content
DROP POLICY IF EXISTS "Admins can upload cms images" ON storage.objects;
CREATE POLICY "Admins can upload cms images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('cms-images', 'gallery', 'testimonials', 'blog')
    AND is_admin(auth.uid())
  );

-- Storage policies: admin delete
DROP POLICY IF EXISTS "Admins can delete storage objects" ON storage.objects;
CREATE POLICY "Admins can delete storage objects" ON storage.objects
  FOR DELETE USING (is_admin(auth.uid()));

-- Storage policies: authenticated update own avatar
DROP POLICY IF EXISTS "Auth users can update own avatar" ON storage.objects;
CREATE POLICY "Auth users can update own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND auth.role() = 'authenticated'
  );

-- Storage policies: admin update CMS objects
DROP POLICY IF EXISTS "Admins can update cms objects" ON storage.objects;
CREATE POLICY "Admins can update cms objects" ON storage.objects
  FOR UPDATE USING (
    bucket_id IN ('cms-images', 'gallery', 'testimonials', 'blog')
    AND is_admin(auth.uid())
  );


-- ============================================================
-- 8. REALTIME (opsional, aktifkan jika diperlukan)
-- ============================================================

-- Aktifkan realtime untuk notifikasi dan booking
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;


-- ============================================================
-- SELESAI! File ini berisi:
-- • 6 functions
-- • 34 tabel
-- • 34 tabel dengan RLS aktif
-- • 70+ RLS policies
-- • 4 triggers
-- • 6 storage buckets + 6 storage policies
-- 3 PERBAIKAN DITERAPKAN:
--   #1 UNIQUE(package_id, pic_type) pada package_commissions
--   #2 is_admin() pada storage policies (bukan query langsung)
--   #3 AFTER UPDATE OF status pada trigger booking (lebih efisien)
-- ============================================================

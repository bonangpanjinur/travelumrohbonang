-- ============================================================================
-- UMROHPLUS — Database Schema Lengkap
-- Sistem Manajemen Travel Umroh
-- Terakhir diperbarui: 2026-02-09
-- ============================================================================
--
-- DAFTAR ISI:
--   1. Functions
--   2. Tabel — User & Role
--   3. Tabel — Master Data
--   4. Tabel — Paket & Keberangkatan
--   5. Tabel — Booking & Pembayaran
--   6. Tabel — CMS & Website
--   7. Triggers
--   8. Row Level Security (RLS)
--   9. Storage Buckets
--
-- ALUR UTAMA:
--   User Registrasi → Profile otomatis dibuat (trigger)
--   User Pilih Paket → Pilih Keberangkatan → Pilih Kamar → Isi Data Jemaah
--   → Pilih PIC (Pusat/Cabang/Agen) → Booking dibuat (status: draft)
--   → Upload Bukti Bayar → Admin Verifikasi → Status: paid
--   → Kuota keberangkatan otomatis berkurang (trigger)
--
-- ROLE:
--   - super_admin / admin  : Akses penuh ke semua data & fitur admin
--   - user (default)       : Bisa booking, lihat data sendiri
--
-- ============================================================================


-- ============================================================================
-- 1. FUNCTIONS
-- ============================================================================

-- Cek apakah user adalah admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
  )
$$;

-- Cek apakah user memiliki role tertentu
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Generate kode booking unik: UMR-YYMMDD-XXXX
CREATE OR REPLACE FUNCTION public.generate_booking_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
BEGIN
  new_code := 'UMR-' || TO_CHAR(NOW(), 'YYMMDD') || '-'
              || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 4));
  RETURN new_code;
END;
$$;

-- Auto-create profile saat user baru mendaftar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Kurangi/kembalikan kuota keberangkatan saat status booking berubah
CREATE OR REPLACE FUNCTION public.update_departure_quota_on_booking_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pilgrim_count INTEGER;
BEGIN
  -- === BOOKING DIBAYAR → kurangi kuota ===
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
       WHERE id = NEW.departure_id
         AND remaining_quota >= pilgrim_count;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Kuota keberangkatan tidak mencukupi';
      END IF;
    END IF;
  END IF;

  -- === BOOKING DIBATALKAN dari paid → kembalikan kuota ===
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


-- ============================================================================
-- 2. TABEL — USER & ROLE
-- ============================================================================

-- Profil user (dibuat otomatis via trigger saat registrasi)
CREATE TABLE public.profiles (
  id          uuid        NOT NULL PRIMARY KEY,   -- = auth.users.id
  name        text        NOT NULL,
  email       text        NOT NULL,
  phone       text,
  avatar_url  text,
  created_at  timestamptz DEFAULT now()
);

-- Role user — TERPISAH dari profiles untuk keamanan
-- Role yang tersedia: 'super_admin', 'admin'
-- User tanpa role = user biasa (jemaah)
CREATE TABLE public.user_roles (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL,               -- referensi ke auth.users
  role        text        NOT NULL,
  created_at  timestamptz DEFAULT now()
);


-- ============================================================================
-- 3. TABEL — MASTER DATA
-- ============================================================================

-- Maskapai penerbangan
CREATE TABLE public.airlines (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL,
  logo_url    text,
  created_at  timestamptz DEFAULT now()
);

-- Bandara keberangkatan
CREATE TABLE public.airports (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL,
  code        text,                               -- IATA code: CGK, SUB, dll
  city        text,
  created_at  timestamptz DEFAULT now()
);

-- Hotel (Makkah & Madinah)
CREATE TABLE public.hotels (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL,
  city        text,                               -- 'makkah' atau 'madinah'
  star        integer,                            -- bintang 1-5
  created_at  timestamptz DEFAULT now()
);

-- Muthawif (pembimbing ibadah di tanah suci)
CREATE TABLE public.muthawifs (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL,
  phone       text,
  photo_url   text,
  created_at  timestamptz DEFAULT now()
);

-- Cabang perusahaan
CREATE TABLE public.branches (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL,
  address     text,
  phone       text,
  is_active   boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Agen penjualan (terhubung ke cabang)
CREATE TABLE public.agents (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name               text        NOT NULL,
  phone              text,
  branch_id          uuid        REFERENCES public.branches(id),
  commission_percent numeric     DEFAULT 0,
  is_active          boolean     DEFAULT true,
  created_at         timestamptz DEFAULT now()
);

-- Kategori paket (bisa hierarki via parent_id)
CREATE TABLE public.package_categories (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL,
  description text,
  parent_id   uuid        REFERENCES public.package_categories(id),
  sort_order  integer     DEFAULT 0,
  is_active   boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now()
);


-- ============================================================================
-- 4. TABEL — PAKET & KEBERANGKATAN
-- ============================================================================

-- Paket umroh
CREATE TABLE public.packages (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title              text        NOT NULL,
  slug               text        NOT NULL UNIQUE,
  description        text,
  image_url          text,
  package_type       text,                        -- 'umroh', 'haji', dll
  duration_days      integer     DEFAULT 9,
  minimum_dp         numeric     DEFAULT 0,       -- minimum DP (Rp)
  dp_deadline_days   integer     DEFAULT 30,      -- hari batas bayar DP setelah booking
  full_deadline_days integer     DEFAULT 7,       -- hari batas pelunasan sebelum berangkat
  category_id        uuid        REFERENCES public.package_categories(id),
  airline_id         uuid        REFERENCES public.airlines(id),
  airport_id         uuid        REFERENCES public.airports(id),
  hotel_makkah_id    uuid        REFERENCES public.hotels(id),
  hotel_madinah_id   uuid        REFERENCES public.hotels(id),
  is_active          boolean     DEFAULT true,
  created_at         timestamptz DEFAULT now()
);

-- Jadwal keberangkatan per paket
CREATE TABLE public.package_departures (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id      uuid        REFERENCES public.packages(id),
  departure_date  date        NOT NULL,
  return_date     date,
  quota           integer     NOT NULL,           -- total kuota
  remaining_quota integer     NOT NULL,           -- sisa kuota (auto berkurang saat paid)
  muthawif_id     uuid        REFERENCES public.muthawifs(id),
  status          text        DEFAULT 'active',   -- 'active', 'closed', 'departed'
  created_at      timestamptz DEFAULT now()
);

-- Harga per tipe kamar per keberangkatan
-- Tipe kamar: 'quad' (4 org), 'triple' (3 org), 'double' (2 org), 'single' (1 org)
CREATE TABLE public.departure_prices (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id  uuid        REFERENCES public.package_departures(id),
  room_type     text        NOT NULL,
  price         numeric     NOT NULL,
  created_at    timestamptz DEFAULT now()
);

-- Komisi per paket per tipe PIC (Person In Charge)
-- pic_type: 'cabang', 'agen', 'karyawan'
CREATE TABLE public.package_commissions (
  id                uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id        uuid        NOT NULL REFERENCES public.packages(id),
  pic_type          text        NOT NULL,
  commission_amount numeric     NOT NULL DEFAULT 0,  -- nominal per jemaah (Rp)
  created_at        timestamptz DEFAULT now(),
  UNIQUE (package_id, pic_type)
);

-- Itinerary (jadwal perjalanan) per keberangkatan
CREATE TABLE public.itineraries (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id  uuid        REFERENCES public.package_departures(id),
  title         text,
  notes         text,
  is_active     boolean     DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- Detail hari per itinerary
CREATE TABLE public.itinerary_days (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  itinerary_id  uuid        REFERENCES public.itineraries(id),
  day_number    integer     NOT NULL,
  title         text,
  description   text,
  image_url     text,
  created_at    timestamptz DEFAULT now()
);


-- ============================================================================
-- 5. TABEL — BOOKING & PEMBAYARAN
-- ============================================================================

-- Booking utama
-- Alur status: draft → waiting_payment → paid → cancelled
CREATE TABLE public.bookings (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_code  text        NOT NULL UNIQUE,       -- auto: UMR-YYMMDD-XXXX
  user_id       uuid        REFERENCES public.profiles(id),
  package_id    uuid        REFERENCES public.packages(id),
  departure_id  uuid        REFERENCES public.package_departures(id),
  total_price   numeric     NOT NULL DEFAULT 0,
  status        text        DEFAULT 'draft',
  pic_type      text        DEFAULT 'pusat',       -- 'pusat', 'cabang', 'agen', 'karyawan'
  pic_id        uuid,                              -- ID cabang/agen/karyawan terkait
  notes         text,
  created_at    timestamptz DEFAULT now()
);

-- Kamar yang dipesan per booking
CREATE TABLE public.booking_rooms (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id  uuid        REFERENCES public.bookings(id),
  room_type   text        NOT NULL,
  quantity    integer     NOT NULL,
  price       numeric     NOT NULL,                -- harga per pax
  subtotal    numeric     NOT NULL,                -- quantity × price
  created_at  timestamptz DEFAULT now()
);

-- Data jemaah per booking
CREATE TABLE public.booking_pilgrims (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id      uuid        REFERENCES public.bookings(id),
  name            text        NOT NULL,
  gender          text,                            -- 'L' (Laki-laki) atau 'P' (Perempuan)
  nik             text,                            -- Nomor Induk Kependudukan
  birth_date      date,
  phone           text,
  email           text,
  passport_number text,
  passport_expiry date,
  created_at      timestamptz DEFAULT now()
);

-- Pembayaran (bisa multi-payment: DP + cicilan + pelunasan)
-- Alur: pending → paid / expired
CREATE TABLE public.payments (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id      uuid        REFERENCES public.bookings(id),
  payment_type    text        DEFAULT 'full',      -- 'dp', 'installment', 'full'
  amount          numeric     NOT NULL,
  status          text        DEFAULT 'pending',   -- 'pending', 'paid', 'expired'
  payment_method  text,                            -- 'transfer', 'cash', dll
  proof_url       text,                            -- URL bukti transfer (storage)
  deadline        timestamptz,                     -- batas waktu pembayaran
  paid_at         timestamptz,
  verified_by     uuid,                            -- admin yang memverifikasi
  verified_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- Notifikasi user
CREATE TABLE public.notifications (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL,
  booking_id  uuid        REFERENCES public.bookings(id),
  type        text        NOT NULL,                -- 'booking', 'payment', 'reminder', 'info'
  title       text        NOT NULL,
  message     text        NOT NULL,
  is_read     boolean     DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- Kupon diskon
CREATE TABLE public.coupons (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code          text        NOT NULL UNIQUE,
  discount_type text        NOT NULL,              -- 'percent' atau 'fixed'
  value         numeric     NOT NULL,              -- nilai diskon
  min_purchase  numeric     DEFAULT 0,             -- minimal pembelian
  max_uses      integer,                           -- batas pemakaian (null = unlimited)
  used_count    integer     DEFAULT 0,
  expired_at    date,
  is_active     boolean     DEFAULT true,
  created_at    timestamptz DEFAULT now()
);


-- ============================================================================
-- 6. TABEL — CMS & WEBSITE
-- ============================================================================

-- Artikel blog
CREATE TABLE public.blog_posts (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title           text        NOT NULL,
  slug            text        NOT NULL UNIQUE,
  excerpt         text,
  content         text,
  image_url       text,
  category        text,
  author          text,
  is_published    boolean     DEFAULT false,
  published_at    timestamptz,
  seo_title       text,
  seo_description text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Halaman statis (tentang kami, syarat & ketentuan, dll)
CREATE TABLE public.pages (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title           text,
  slug            text        NOT NULL UNIQUE,
  content         text,
  seo_title       text,
  seo_description text,
  is_active       boolean     DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

-- Testimoni pelanggan
CREATE TABLE public.testimonials (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text        NOT NULL,
  content       text        NOT NULL,
  photo_url     text,
  rating        integer     DEFAULT 5,
  location      text,
  package_name  text,
  travel_date   date,
  sort_order    integer     DEFAULT 0,
  is_active     boolean     DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- Galeri foto
CREATE TABLE public.gallery (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text,
  description text,
  image_url   text        NOT NULL,
  category    text        DEFAULT 'umroh',
  sort_order  integer     DEFAULT 0,
  is_active   boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- FAQ (Pertanyaan yang Sering Diajukan)
CREATE TABLE public.faqs (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question    text        NOT NULL,
  answer      text        NOT NULL,
  sort_order  integer     DEFAULT 0,
  is_active   boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Navigasi menu website
CREATE TABLE public.navigation_items (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label           text        NOT NULL,
  url             text        NOT NULL,
  parent_id       uuid        REFERENCES public.navigation_items(id),
  sort_order      integer     DEFAULT 0,
  is_active       boolean     DEFAULT true,
  open_in_new_tab boolean     DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

-- Tombol floating (WhatsApp, Telegram, dll)
CREATE TABLE public.floating_buttons (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label       text        NOT NULL,
  platform    text        NOT NULL,                -- 'whatsapp', 'telegram', 'phone'
  url         text,
  icon        text,
  sort_order  integer     DEFAULT 0,
  is_active   boolean     DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- Layanan unggulan
CREATE TABLE public.services (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text        NOT NULL,
  description text,
  icon        text        DEFAULT 'star',
  sort_order  integer     DEFAULT 0,
  is_active   boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Keunggulan perusahaan
CREATE TABLE public.advantages (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text        NOT NULL,
  icon        text        DEFAULT 'check-circle',
  sort_order  integer     DEFAULT 0,
  is_active   boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Langkah panduan booking
CREATE TABLE public.guide_steps (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_number integer     NOT NULL,
  title       text        NOT NULL,
  description text,
  icon        text        DEFAULT 'circle',
  is_active   boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Section builder (halaman dinamis)
CREATE TABLE public.sections (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_slug     text,
  section_type  text,
  data          jsonb,
  sort_order    integer     DEFAULT 0,
  is_active     boolean     DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- Pengaturan situs (branding, SEO, sosmed, dll) — JSON
CREATE TABLE public.site_settings (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category    text        NOT NULL,                -- 'general', 'seo', 'social'
  key         text        NOT NULL,
  value       jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Pengaturan sederhana (key-value string)
CREATE TABLE public.settings (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key         text        NOT NULL UNIQUE,
  value       text,
  created_at  timestamptz DEFAULT now()
);


-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Auto-create profile saat user registrasi
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update kuota saat booking dibayar/dibatalkan
CREATE TRIGGER on_booking_status_change
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_departure_quota_on_booking_paid();

-- Auto-update updated_at pada blog_posts
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-update updated_at pada site_settings
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- ---- PROFILES ----
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"    ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles"  ON public.profiles FOR SELECT USING (is_admin(auth.uid()));

-- ---- USER ROLES ----
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles"      ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage user roles"  ON public.user_roles FOR ALL   USING (is_admin(auth.uid()));

-- ---- MASTER DATA (admin kelola penuh, public baca) ----
ALTER TABLE public.airlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage airlines"  ON public.airlines FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read airlines"    ON public.airlines FOR SELECT USING (true);

ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage airports"  ON public.airports FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read airports"    ON public.airports FOR SELECT USING (true);

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage hotels"    ON public.hotels FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read hotels"      ON public.hotels FOR SELECT USING (true);

ALTER TABLE public.muthawifs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage muthawifs" ON public.muthawifs FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read muthawifs"   ON public.muthawifs FOR SELECT USING (true);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage branches"  ON public.branches FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read branches"    ON public.branches FOR SELECT USING (is_active = true);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage agents"    ON public.agents FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read agents"      ON public.agents FOR SELECT USING (is_active = true);

ALTER TABLE public.package_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage categories"        ON public.package_categories FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read package categories"  ON public.package_categories FOR SELECT USING (true);

-- ---- PAKET & KEBERANGKATAN ----
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage packages"  ON public.packages FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read packages"    ON public.packages FOR SELECT USING (is_active = true);

ALTER TABLE public.package_departures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage departures"  ON public.package_departures FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read departures"    ON public.package_departures FOR SELECT USING (status = 'active');

ALTER TABLE public.departure_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage prices"          ON public.departure_prices FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read departure prices"  ON public.departure_prices FOR SELECT USING (true);

ALTER TABLE public.package_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage package commissions" ON public.package_commissions FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read package commissions"   ON public.package_commissions FOR SELECT USING (true);

ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage itineraries" ON public.itineraries FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read itineraries"   ON public.itineraries FOR SELECT USING (is_active = true);

ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage itinerary days" ON public.itinerary_days FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read itinerary days"   ON public.itinerary_days FOR SELECT USING (true);

-- ---- BOOKING ----
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all bookings" ON public.bookings FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Users can create bookings"      ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own bookings"    ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own bookings"  ON public.bookings FOR UPDATE USING (auth.uid() = user_id AND status = 'draft');

ALTER TABLE public.booking_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage booking rooms"  ON public.booking_rooms FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users can create booking rooms"   ON public.booking_rooms FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_rooms.booking_id AND bookings.user_id = auth.uid()));
CREATE POLICY "Users can view own booking rooms" ON public.booking_rooms FOR SELECT
  USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_rooms.booking_id AND bookings.user_id = auth.uid()));

ALTER TABLE public.booking_pilgrims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage pilgrims"  ON public.booking_pilgrims FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users can create pilgrims"   ON public.booking_pilgrims FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_pilgrims.booking_id AND bookings.user_id = auth.uid()));
CREATE POLICY "Users can view own pilgrims" ON public.booking_pilgrims FOR SELECT
  USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_pilgrims.booking_id AND bookings.user_id = auth.uid()));

-- ---- PEMBAYARAN ----
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage payments"  ON public.payments FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users can create payments"   ON public.payments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid()));
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid()));

-- ---- NOTIFIKASI ----
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all notifications"   ON public.notifications FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Users can view own notifications"      ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications"    ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can create notifications" ON public.notifications FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR auth.uid() = user_id);

-- ---- KUPON ----
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage coupons"       ON public.coupons FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read active coupons"  ON public.coupons FOR SELECT USING (is_active = true);

-- ---- CMS & WEBSITE ----
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage blog posts"          ON public.blog_posts FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read published blog posts"  ON public.blog_posts FOR SELECT USING (is_published = true);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage pages"   ON public.pages FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read pages"     ON public.pages FOR SELECT USING (is_active = true);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage testimonials"  ON public.testimonials FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read testimonials"    ON public.testimonials FOR SELECT USING (is_active = true);

ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage gallery" ON public.gallery FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read gallery"   ON public.gallery FOR SELECT USING (is_active = true);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage FAQs"      ON public.faqs FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Anyone can view active FAQs" ON public.faqs FOR SELECT USING (is_active = true);

ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage navigation items"       ON public.navigation_items FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read active navigation items"  ON public.navigation_items FOR SELECT USING (is_active = true);

ALTER TABLE public.floating_buttons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage floating buttons"       ON public.floating_buttons FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Anyone can view active floating buttons"  ON public.floating_buttons FOR SELECT USING (is_active = true);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage services"       ON public.services FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read active services"  ON public.services FOR SELECT USING (is_active = true);

ALTER TABLE public.advantages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage advantages"  ON public.advantages FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read advantages"    ON public.advantages FOR SELECT USING (is_active = true);

ALTER TABLE public.guide_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage guide steps" ON public.guide_steps FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read guide steps"   ON public.guide_steps FOR SELECT USING (is_active = true);

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage sections"  ON public.sections FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read sections"    ON public.sections FOR SELECT USING (is_active = true);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage site settings" ON public.site_settings FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read site settings"   ON public.site_settings FOR SELECT USING (true);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage settings"  ON public.settings FOR ALL    USING (is_admin(auth.uid()));
CREATE POLICY "Public can read settings"    ON public.settings FOR SELECT USING (true);


-- ============================================================================
-- 9. STORAGE BUCKETS
-- ============================================================================
-- Bucket            | Public | Keterangan
-- ------------------|--------|----------------------------------
-- payment-proofs    | Yes    | Bukti transfer pembayaran
-- cms-images        | Yes    | Gambar untuk CMS (paket, halaman)
-- gallery           | Yes    | Foto galeri website
-- testimonials      | Yes    | Foto testimoni pelanggan
-- blog              | Yes    | Gambar artikel blog
-- avatars           | Yes    | Foto profil user


-- ============================================================================
-- SELESAI
-- ============================================================================

-- =============================================================
-- ⚠️ LEGACY / HISTORICAL SNAPSHOT — bukan sumber kebenaran schema.
-- Sumber kebenaran saat ini: lib/db/src/schema/*.ts (Drizzle) untuk struktur
-- tabel, dan supabase/migrations/*.sql untuk perubahan yang benar-benar
-- diterapkan (applied) ke Supabase. File ini disimpan sebagai referensi
-- historis saja — lihat sql/schema/README.md sebelum menjalankan ulang.
-- =============================================================
--  UmrohPlus — Supabase SQL Schema
--  Generate dari Drizzle ORM schema (lib/db/src/schema/)
--  Jalankan sekali di Supabase SQL Editor (idempotent)
-- =============================================================

-- Aktifkan ekstensi yang dibutuhkan
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- 1. AUTH — sessions & users
-- =============================================================

CREATE TABLE IF NOT EXISTS sessions (
  sid     VARCHAR PRIMARY KEY,
  sess    JSONB    NOT NULL,
  expire  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             VARCHAR UNIQUE,
  first_name        VARCHAR,
  last_name         VARCHAR,
  profile_image_url VARCHAR,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 2. PROFILES
-- =============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id                UUID PRIMARY KEY,
  name              TEXT        NOT NULL,
  email             TEXT        NOT NULL,
  phone             TEXT,
  avatar_url        TEXT,
  branch_id         TEXT,
  totp_enabled      BOOLEAN     NOT NULL DEFAULT false,
  totp_secret       TEXT,
  totp_backup_codes TEXT,
  created_at        TIMESTAMPTZ
);

-- =============================================================
-- 3. MASTER DATA
-- =============================================================

CREATE TABLE IF NOT EXISTS package_categories (
  id                TEXT PRIMARY KEY,
  name              TEXT    NOT NULL,
  description       TEXT,
  parent_id         TEXT,
  icon              TEXT,
  show_extra_hotels BOOLEAN NOT NULL DEFAULT false,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  sort_order        INTEGER,
  created_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS hotels (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  city        TEXT,
  stars       INTEGER,
  image_url   TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS airlines (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  code       TEXT,
  logo_url   TEXT,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS airports (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  code       TEXT,
  city       TEXT,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS branches (
  id            TEXT PRIMARY KEY,
  name          TEXT    NOT NULL,
  slug          TEXT,
  address       TEXT,
  phone         TEXT,
  email         TEXT,
  city          TEXT,
  region        TEXT,
  postal_code   TEXT,
  country       TEXT,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  opening_hours TEXT,
  image_url     TEXT,
  map_url       TEXT,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS muthawifs (
  id         TEXT PRIMARY KEY,
  name       TEXT    NOT NULL,
  phone      TEXT,
  photo_url  TEXT,
  bio        TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS currencies (
  id          TEXT PRIMARY KEY,
  code        TEXT    NOT NULL,
  name        TEXT,
  symbol      TEXT,
  rate_to_idr INTEGER,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ
);

-- =============================================================
-- 4. PACKAGES
-- =============================================================

CREATE TABLE IF NOT EXISTS packages (
  id                TEXT PRIMARY KEY,
  title             TEXT    NOT NULL,
  slug              TEXT    NOT NULL,
  description       TEXT,
  image_url         TEXT,
  duration_days     INTEGER,
  package_type      TEXT,
  category_id       TEXT,
  hotel_makkah_id   TEXT,
  hotel_madinah_id  TEXT,
  airline_id        TEXT,
  airport_id        TEXT,
  minimum_dp        INTEGER,
  dp_deadline_days  INTEGER,
  full_deadline_days INTEGER,
  is_active         BOOLEAN,
  created_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS package_departures (
  id              TEXT PRIMARY KEY,
  package_id      TEXT,
  departure_date  TEXT NOT NULL,
  return_date     TEXT,
  quota           INTEGER NOT NULL,
  remaining_quota INTEGER NOT NULL,
  status          TEXT,
  muthawif_id     TEXT,
  created_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS departure_prices (
  id           TEXT PRIMARY KEY,
  departure_id TEXT,
  room_type    TEXT    NOT NULL,
  price        INTEGER NOT NULL,
  created_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS departure_gallery (
  id           TEXT PRIMARY KEY,
  departure_id TEXT    NOT NULL,
  image_url    TEXT    NOT NULL,
  title        TEXT,
  description  TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS package_costs (
  id            TEXT PRIMARY KEY,
  package_id    TEXT      NOT NULL,
  departure_id  TEXT,
  category      TEXT,
  item_name     TEXT      NOT NULL,
  qty           NUMERIC,
  unit          TEXT,
  unit_cost     NUMERIC,
  currency_code TEXT,
  is_per_pax    BOOLEAN   NOT NULL DEFAULT false,
  is_active     BOOLEAN   NOT NULL DEFAULT true,
  notes         TEXT,
  sort_order    INTEGER   NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS package_commissions (
  id                TEXT PRIMARY KEY,
  package_id        TEXT    NOT NULL,
  label             TEXT,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS package_hotels (
  id         TEXT PRIMARY KEY,
  package_id TEXT    NOT NULL,
  hotel_id   TEXT    NOT NULL,
  city       TEXT,
  label      TEXT,
  sort_order INTEGER,
  created_at TIMESTAMPTZ
);

-- =============================================================
-- 5. AGENTS
-- =============================================================

CREATE TABLE IF NOT EXISTS agents (
  id                 TEXT PRIMARY KEY,
  user_id            UUID,
  branch_id          TEXT,
  name               TEXT    NOT NULL,
  phone              TEXT,
  email              TEXT,
  referral_code      TEXT,
  commission_percent NUMERIC,
  monthly_target     INTEGER,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_roles (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    UUID NOT NULL,
  role       TEXT NOT NULL,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS agent_commissions (
  id         TEXT PRIMARY KEY,
  booking_id TEXT    NOT NULL,
  agent_id   TEXT    NOT NULL,
  amount     INTEGER NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS agent_withdrawals (
  id           TEXT PRIMARY KEY,
  agent_id     TEXT    NOT NULL,
  amount       INTEGER NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'pending',
  bank_details TEXT,
  created_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id            TEXT PRIMARY KEY,
  agent_id      TEXT,
  referral_code TEXT,
  ip            TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ
);

-- =============================================================
-- 6. BOOKINGS
-- =============================================================

CREATE TABLE IF NOT EXISTS bookings (
  id             TEXT PRIMARY KEY,
  booking_code   TEXT    NOT NULL,
  user_id        UUID,
  package_id     TEXT,
  departure_id   TEXT,
  branch_id      TEXT,
  agent_id       TEXT,
  pic_id         TEXT,
  pic_type       TEXT,
  status         TEXT,
  total_price    INTEGER NOT NULL,
  currency       TEXT    NOT NULL,
  payment_scheme TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS booking_rooms (
  id         TEXT    PRIMARY KEY,
  booking_id TEXT    NOT NULL,
  room_type  TEXT    NOT NULL,
  price      NUMERIC NOT NULL,
  quantity   INTEGER NOT NULL,
  subtotal   NUMERIC NOT NULL,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS booking_pilgrims (
  id               TEXT PRIMARY KEY,
  booking_id       TEXT NOT NULL,
  name             TEXT NOT NULL,
  phone            TEXT,
  email            TEXT,
  gender           TEXT,
  nik              TEXT,
  birth_date       TEXT,
  passport_number  TEXT,
  passport_expiry  TEXT,
  created_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pilgrim_documents (
  id            TEXT PRIMARY KEY,
  pilgrim_id    TEXT NOT NULL,
  booking_id    TEXT NOT NULL,
  document_type TEXT NOT NULL,
  -- "passport" | "visa" | "health_certificate" | "mahram_letter" | "ktp" | "photo"
  status        TEXT NOT NULL DEFAULT 'pending',
  -- "pending" | "submitted" | "verified" | "rejected"
  file_url      TEXT,
  notes         TEXT,
  submitted_at  TIMESTAMPTZ,
  verified_at   TIMESTAMPTZ,
  verified_by   TEXT,
  created_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS booking_payments (
  id               TEXT PRIMARY KEY,
  booking_id       TEXT    NOT NULL,
  type             TEXT    NOT NULL,
  -- "dp" | "installment" | "settlement"
  amount           INTEGER NOT NULL,
  paid_at          TIMESTAMPTZ NOT NULL,
  method           TEXT,
  reference_number TEXT,
  notes            TEXT,
  recorded_by      TEXT,
  is_voided        BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ
);

-- =============================================================
-- 7. PAYMENTS
-- =============================================================

CREATE TABLE IF NOT EXISTS payments (
  id             TEXT PRIMARY KEY,
  booking_id     TEXT    NOT NULL,
  payment_method TEXT,
  amount         INTEGER NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'pending',
  proof_url      TEXT,
  payment_type   TEXT,
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payment_proof_access_logs (
  id         TEXT PRIMARY KEY,
  user_id    UUID,
  booking_id TEXT,
  payment_id TEXT,
  context    TEXT,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS financial_transactions (
  id               TEXT    PRIMARY KEY,
  booking_id       TEXT,
  category         TEXT    NOT NULL,
  type             TEXT    NOT NULL,
  -- "income" | "expense"
  amount           NUMERIC NOT NULL,
  description      TEXT,
  reference_number TEXT,
  transaction_date TIMESTAMPTZ,
  recorded_by      TEXT,
  created_at       TIMESTAMPTZ
);

-- =============================================================
-- 8. CMS
-- =============================================================

CREATE TABLE IF NOT EXISTS testimonials (
  id           TEXT PRIMARY KEY,
  name         TEXT    NOT NULL,
  location     TEXT,
  package_name TEXT,
  photo_url    TEXT,
  rating       INTEGER,
  content      TEXT,
  travel_date  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  sort_order   INTEGER,
  created_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pilgrim_testimonials (
  id          TEXT PRIMARY KEY,
  booking_id  TEXT    NOT NULL,
  user_id     UUID    NOT NULL,
  rating      INTEGER,
  message     TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS package_reviews (
  id          TEXT PRIMARY KEY,
  package_id  TEXT    NOT NULL,
  user_id     UUID    NOT NULL,
  rating      INTEGER,
  title       TEXT,
  comment     TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS wishlists (
  id         TEXT PRIMARY KEY,
  user_id    UUID NOT NULL,
  package_id TEXT NOT NULL,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id              TEXT PRIMARY KEY,
  title           TEXT    NOT NULL,
  slug            TEXT    NOT NULL,
  excerpt         TEXT,
  content         TEXT,
  image_url       TEXT,
  category        TEXT,
  author          TEXT,
  seo_title       TEXT,
  seo_description TEXT,
  is_published    BOOLEAN NOT NULL DEFAULT false,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS gallery (
  id          TEXT PRIMARY KEY,
  image_url   TEXT    NOT NULL,
  title       TEXT,
  description TEXT,
  category    TEXT,
  sort_order  INTEGER,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS faqs (
  id         TEXT PRIMARY KEY,
  question   TEXT    NOT NULL,
  answer     TEXT    NOT NULL,
  scope      TEXT,
  package_id TEXT,
  sort_order INTEGER,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pages (
  id              TEXT PRIMARY KEY,
  slug            TEXT    NOT NULL,
  title           TEXT    NOT NULL,
  content         TEXT,
  seo_title       TEXT,
  seo_description TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS manasik_materials (
  id            TEXT PRIMARY KEY,
  title         TEXT    NOT NULL,
  description   TEXT,
  type          TEXT,
  file_url      TEXT,
  thumbnail_url TEXT,
  sort_order    INTEGER,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS services (
  id          TEXT PRIMARY KEY,
  title       TEXT    NOT NULL,
  description TEXT,
  icon        TEXT,
  sort_order  INTEGER,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS guide_steps (
  id          TEXT PRIMARY KEY,
  step_number INTEGER NOT NULL,
  title       TEXT    NOT NULL,
  description TEXT,
  icon        TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS advantages (
  id         TEXT PRIMARY KEY,
  title      TEXT    NOT NULL,
  icon       TEXT,
  sort_order INTEGER,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS navigation_items (
  id            TEXT PRIMARY KEY,
  label         TEXT    NOT NULL,
  url           TEXT    NOT NULL,
  parent_id     TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  open_in_new_tab BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS floating_buttons (
  id         TEXT PRIMARY KEY,
  platform   TEXT    NOT NULL,
  label      TEXT    NOT NULL,
  url        TEXT,
  icon       TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ
);

-- =============================================================
-- 9. SEO & SETTINGS
-- =============================================================

CREATE TABLE IF NOT EXISTS site_settings (
  id         TEXT PRIMARY KEY,
  key        TEXT  NOT NULL,
  category   TEXT,
  value      JSONB,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS seo_overrides (
  id                 TEXT PRIMARY KEY,
  path               TEXT    NOT NULL,
  title              TEXT,
  description        TEXT,
  og_image           TEXT,
  canonical_override TEXT,
  noindex            BOOLEAN NOT NULL DEFAULT false,
  keywords           TEXT,
  created_at         TIMESTAMPTZ
);

-- =============================================================
-- 10. LOGS
-- =============================================================

CREATE TABLE IF NOT EXISTS request_log (
  id         TEXT PRIMARY KEY,
  ip         TEXT,
  endpoint   TEXT NOT NULL,
  user_id    UUID,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS error_logs (
  id         TEXT PRIMARY KEY,
  user_id    UUID,
  level      TEXT NOT NULL,
  message    TEXT NOT NULL,
  stack      TEXT,
  url        TEXT,
  user_agent TEXT,
  context    JSONB,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  user_id     UUID,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  metadata    JSONB,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pilgrim_doc_access_logs (
  id           TEXT PRIMARY KEY,
  user_id      UUID,
  pilgrim_id   TEXT,
  doc_type     TEXT,
  storage_path TEXT,
  context      TEXT,
  created_at   TIMESTAMPTZ
);

-- =============================================================
-- 11. CRM
-- =============================================================

CREATE TABLE IF NOT EXISTS leads (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  phone            TEXT,
  email            TEXT,
  source           TEXT,
  status           TEXT NOT NULL DEFAULT 'new',
  package_interest TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS lead_follow_ups (
  id             TEXT PRIMARY KEY,
  lead_id        TEXT NOT NULL,
  follow_up_date TIMESTAMPTZ,
  type           TEXT,
  notes          TEXT,
  is_done        BOOLEAN NOT NULL DEFAULT false,
  done_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS coupons (
  id            TEXT PRIMARY KEY,
  code          TEXT    NOT NULL,
  discount_type TEXT    NOT NULL,
  value         INTEGER NOT NULL,
  min_purchase  INTEGER,
  max_uses      INTEGER,
  used_count    INTEGER NOT NULL DEFAULT 0,
  expired_at    TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS loyalty_balances (
  id           TEXT PRIMARY KEY,
  user_id      UUID    NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS loyalty_points (
  id          TEXT PRIMARY KEY,
  user_id     UUID    NOT NULL,
  points      INTEGER NOT NULL,
  source      TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS integration_secrets (
  id         TEXT PRIMARY KEY,
  provider   TEXT    NOT NULL,
  config     JSONB,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ
);

-- =============================================================
-- 12. CONTRACTS & KOMUNIKASI
-- =============================================================

CREATE TABLE IF NOT EXISTS contracts (
  id                 TEXT PRIMARY KEY,
  booking_id         TEXT NOT NULL,
  user_id            UUID NOT NULL,
  html_content       TEXT,
  signature_data_url TEXT,
  signed_at          TIMESTAMPTZ,
  signer_name        TEXT,
  created_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id          TEXT PRIMARY KEY,
  booking_id  TEXT NOT NULL,
  sender_id   TEXT,
  sender_role TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    UUID    NOT NULL,
  title      TEXT    NOT NULL,
  message    TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS refund_requests (
  id              TEXT PRIMARY KEY,
  user_id         UUID    NOT NULL,
  booking_id      TEXT    NOT NULL,
  reason          TEXT,
  amount          INTEGER,
  bank_name       TEXT,
  bank_account    TEXT,
  account_holder  TEXT,
  status          TEXT    NOT NULL DEFAULT 'pending',
  admin_notes     TEXT,
  processed_by    TEXT,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ
);

-- =============================================================
-- 13. ITINERARIES
-- =============================================================

CREATE TABLE IF NOT EXISTS itineraries (
  id           TEXT PRIMARY KEY,
  departure_id TEXT    NOT NULL,
  title        TEXT,
  notes        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS itinerary_days (
  id            TEXT PRIMARY KEY,
  itinerary_id  TEXT    NOT NULL,
  day_number    INTEGER NOT NULL,
  title         TEXT,
  description   TEXT,
  image_url     TEXT,
  created_at    TIMESTAMPTZ
);

-- =============================================================
-- 14. TENANT / MULTI-SITE
-- =============================================================

CREATE TABLE IF NOT EXISTS tenant_sites (
  id                 TEXT PRIMARY KEY,
  owner_id           TEXT,
  subdomain          TEXT NOT NULL,
  custom_domain      TEXT,
  site_name          TEXT,
  tagline            TEXT,
  logo_url           TEXT,
  primary_color      TEXT,
  secondary_color    TEXT,
  hero_image_url     TEXT,
  hero_title         TEXT,
  hero_subtitle      TEXT,
  about_text         TEXT,
  whatsapp_number    TEXT,
  phone              TEXT,
  email              TEXT,
  address            TEXT,
  instagram_url      TEXT,
  facebook_url       TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  template           TEXT,
  gsc_verification   TEXT,
  seo_default_image  TEXT,
  branch_id          TEXT,
  agent_id           TEXT,
  created_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tenant_site_packages (
  id             TEXT PRIMARY KEY,
  tenant_site_id TEXT    NOT NULL,
  package_id     TEXT    NOT NULL,
  is_featured    BOOLEAN NOT NULL DEFAULT false,
  sort_order     INTEGER,
  created_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS slug_redirects (
  id             TEXT PRIMARY KEY,
  tenant_site_id TEXT,
  resource_type  TEXT NOT NULL,
  old_slug       TEXT NOT NULL,
  new_slug       TEXT NOT NULL,
  created_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS template_upgrade_orders (
  id               TEXT PRIMARY KEY,
  tenant_site_id   TEXT NOT NULL,
  requested_by     TEXT NOT NULL,
  current_template TEXT,
  target_template  TEXT,
  price            INTEGER,
  status           TEXT NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ
);

-- =============================================================
-- INDEXES TAMBAHAN (performa query umum)
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_packages_slug         ON packages (slug);
CREATE INDEX IF NOT EXISTS idx_packages_is_active    ON packages (is_active);
CREATE INDEX IF NOT EXISTS idx_departures_package_id ON package_departures (package_id);
CREATE INDEX IF NOT EXISTS idx_departure_prices_dep  ON departure_prices (departure_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id      ON bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status       ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_code         ON bookings (booking_code);
CREATE INDEX IF NOT EXISTS idx_booking_pilgrims_bk   ON booking_pilgrims (booking_id);
CREATE INDEX IF NOT EXISTS idx_pilgrim_docs_pilgrim  ON pilgrim_documents (pilgrim_id);
CREATE INDEX IF NOT EXISTS idx_pilgrim_docs_booking  ON pilgrim_documents (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_payments_bk   ON booking_payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id   ON payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email        ON profiles (email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id    ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_site_settings_key     ON site_settings (key);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug       ON blog_posts (slug);
CREATE INDEX IF NOT EXISTS idx_faqs_scope            ON faqs (scope);
CREATE INDEX IF NOT EXISTS idx_leads_status          ON leads (status);
CREATE INDEX IF NOT EXISTS idx_agents_referral_code  ON agents (referral_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity     ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications (user_id, is_read);

-- ── FOREIGN KEY CONSTRAINTS ──────────────────────────────────────────────────
-- Run-safe: use DROP CONSTRAINT IF EXISTS before ADD to allow re-running.

-- package_categories (self-reference parent)
ALTER TABLE package_categories DROP CONSTRAINT IF EXISTS fk_package_categories_parent;
ALTER TABLE package_categories ADD CONSTRAINT fk_package_categories_parent
  FOREIGN KEY (parent_id) REFERENCES package_categories(id) ON DELETE SET NULL;

-- packages → master data
ALTER TABLE packages DROP CONSTRAINT IF EXISTS fk_packages_category;
ALTER TABLE packages ADD CONSTRAINT fk_packages_category
  FOREIGN KEY (category_id) REFERENCES package_categories(id) ON DELETE SET NULL;

ALTER TABLE packages DROP CONSTRAINT IF EXISTS fk_packages_hotel_makkah;
ALTER TABLE packages ADD CONSTRAINT fk_packages_hotel_makkah
  FOREIGN KEY (hotel_makkah_id) REFERENCES hotels(id) ON DELETE SET NULL;

ALTER TABLE packages DROP CONSTRAINT IF EXISTS fk_packages_hotel_madinah;
ALTER TABLE packages ADD CONSTRAINT fk_packages_hotel_madinah
  FOREIGN KEY (hotel_madinah_id) REFERENCES hotels(id) ON DELETE SET NULL;

ALTER TABLE packages DROP CONSTRAINT IF EXISTS fk_packages_airline;
ALTER TABLE packages ADD CONSTRAINT fk_packages_airline
  FOREIGN KEY (airline_id) REFERENCES airlines(id) ON DELETE SET NULL;

ALTER TABLE packages DROP CONSTRAINT IF EXISTS fk_packages_airport;
ALTER TABLE packages ADD CONSTRAINT fk_packages_airport
  FOREIGN KEY (airport_id) REFERENCES airports(id) ON DELETE SET NULL;

-- package_departures → packages / muthawifs
ALTER TABLE package_departures DROP CONSTRAINT IF EXISTS fk_departures_package;
ALTER TABLE package_departures ADD CONSTRAINT fk_departures_package
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE;

ALTER TABLE package_departures DROP CONSTRAINT IF EXISTS fk_departures_muthawif;
ALTER TABLE package_departures ADD CONSTRAINT fk_departures_muthawif
  FOREIGN KEY (muthawif_id) REFERENCES muthawifs(id) ON DELETE SET NULL;

-- departure_prices / gallery → package_departures
ALTER TABLE departure_prices DROP CONSTRAINT IF EXISTS fk_departure_prices_departure;
ALTER TABLE departure_prices ADD CONSTRAINT fk_departure_prices_departure
  FOREIGN KEY (departure_id) REFERENCES package_departures(id) ON DELETE CASCADE;

ALTER TABLE departure_gallery DROP CONSTRAINT IF EXISTS fk_departure_gallery_departure;
ALTER TABLE departure_gallery ADD CONSTRAINT fk_departure_gallery_departure
  FOREIGN KEY (departure_id) REFERENCES package_departures(id) ON DELETE CASCADE;

-- package_hotels → packages / hotels
ALTER TABLE package_hotels DROP CONSTRAINT IF EXISTS fk_package_hotels_package;
ALTER TABLE package_hotels ADD CONSTRAINT fk_package_hotels_package
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE;

ALTER TABLE package_hotels DROP CONSTRAINT IF EXISTS fk_package_hotels_hotel;
ALTER TABLE package_hotels ADD CONSTRAINT fk_package_hotels_hotel
  FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE;

-- package_costs / commissions → packages / departures
ALTER TABLE package_costs DROP CONSTRAINT IF EXISTS fk_package_costs_package;
ALTER TABLE package_costs ADD CONSTRAINT fk_package_costs_package
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE;

ALTER TABLE package_costs DROP CONSTRAINT IF EXISTS fk_package_costs_departure;
ALTER TABLE package_costs ADD CONSTRAINT fk_package_costs_departure
  FOREIGN KEY (departure_id) REFERENCES package_departures(id) ON DELETE SET NULL;

ALTER TABLE package_commissions DROP CONSTRAINT IF EXISTS fk_package_commissions_package;
ALTER TABLE package_commissions ADD CONSTRAINT fk_package_commissions_package
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE;

-- bookings → packages / departures / branches / auth.users
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS fk_bookings_user;
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS fk_bookings_package;
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_package
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS fk_bookings_departure;
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_departure
  FOREIGN KEY (departure_id) REFERENCES package_departures(id) ON DELETE SET NULL;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS fk_bookings_branch;
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_branch
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS fk_bookings_agent;
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_agent
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL;

-- booking sub-tables → bookings
ALTER TABLE booking_rooms DROP CONSTRAINT IF EXISTS fk_booking_rooms_booking;
ALTER TABLE booking_rooms ADD CONSTRAINT fk_booking_rooms_booking
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

ALTER TABLE booking_pilgrims DROP CONSTRAINT IF EXISTS fk_booking_pilgrims_booking;
ALTER TABLE booking_pilgrims ADD CONSTRAINT fk_booking_pilgrims_booking
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

ALTER TABLE pilgrim_documents DROP CONSTRAINT IF EXISTS fk_pilgrim_docs_pilgrim;
ALTER TABLE pilgrim_documents ADD CONSTRAINT fk_pilgrim_docs_pilgrim
  FOREIGN KEY (pilgrim_id) REFERENCES booking_pilgrims(id) ON DELETE CASCADE;

ALTER TABLE pilgrim_documents DROP CONSTRAINT IF EXISTS fk_pilgrim_docs_booking;
ALTER TABLE pilgrim_documents ADD CONSTRAINT fk_pilgrim_docs_booking
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

ALTER TABLE booking_payments DROP CONSTRAINT IF EXISTS fk_booking_payments_booking;
ALTER TABLE booking_payments ADD CONSTRAINT fk_booking_payments_booking
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

-- payments → bookings
ALTER TABLE payments DROP CONSTRAINT IF EXISTS fk_payments_booking;
ALTER TABLE payments ADD CONSTRAINT fk_payments_booking
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

ALTER TABLE payment_proof_access_logs DROP CONSTRAINT IF EXISTS fk_payment_proof_logs_booking;
ALTER TABLE payment_proof_access_logs ADD CONSTRAINT fk_payment_proof_logs_booking
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

ALTER TABLE payment_proof_access_logs DROP CONSTRAINT IF EXISTS fk_payment_proof_logs_payment;
ALTER TABLE payment_proof_access_logs ADD CONSTRAINT fk_payment_proof_logs_payment
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS fk_financial_transactions_booking;
ALTER TABLE financial_transactions ADD CONSTRAINT fk_financial_transactions_booking
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

-- agents → branches / auth.users
ALTER TABLE agents DROP CONSTRAINT IF EXISTS fk_agents_user;
ALTER TABLE agents ADD CONSTRAINT fk_agents_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE agents DROP CONSTRAINT IF EXISTS fk_agents_branch;
ALTER TABLE agents ADD CONSTRAINT fk_agents_branch
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;

-- agent sub-tables
ALTER TABLE agent_commissions DROP CONSTRAINT IF EXISTS fk_agent_commissions_booking;
ALTER TABLE agent_commissions ADD CONSTRAINT fk_agent_commissions_booking
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

ALTER TABLE agent_commissions DROP CONSTRAINT IF EXISTS fk_agent_commissions_agent;
ALTER TABLE agent_commissions ADD CONSTRAINT fk_agent_commissions_agent
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

ALTER TABLE agent_withdrawals DROP CONSTRAINT IF EXISTS fk_agent_withdrawals_agent;
ALTER TABLE agent_withdrawals ADD CONSTRAINT fk_agent_withdrawals_agent
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

ALTER TABLE affiliate_clicks DROP CONSTRAINT IF EXISTS fk_affiliate_clicks_agent;
ALTER TABLE affiliate_clicks ADD CONSTRAINT fk_affiliate_clicks_agent
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL;

-- contracts / chat / refunds → bookings
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS fk_contracts_booking;
ALTER TABLE contracts ADD CONSTRAINT fk_contracts_booking
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS fk_chat_messages_booking;
ALTER TABLE chat_messages ADD CONSTRAINT fk_chat_messages_booking
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

ALTER TABLE refund_requests DROP CONSTRAINT IF EXISTS fk_refund_requests_booking;
ALTER TABLE refund_requests ADD CONSTRAINT fk_refund_requests_booking
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

-- CMS → packages / bookings
ALTER TABLE pilgrim_testimonials DROP CONSTRAINT IF EXISTS fk_pilgrim_testimonials_booking;
ALTER TABLE pilgrim_testimonials ADD CONSTRAINT fk_pilgrim_testimonials_booking
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

ALTER TABLE package_reviews DROP CONSTRAINT IF EXISTS fk_package_reviews_package;
ALTER TABLE package_reviews ADD CONSTRAINT fk_package_reviews_package
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE;

ALTER TABLE wishlists DROP CONSTRAINT IF EXISTS fk_wishlists_package;
ALTER TABLE wishlists ADD CONSTRAINT fk_wishlists_package
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE;

ALTER TABLE faqs DROP CONSTRAINT IF EXISTS fk_faqs_package;
ALTER TABLE faqs ADD CONSTRAINT fk_faqs_package
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL;

-- tenant
ALTER TABLE tenant_site_packages DROP CONSTRAINT IF EXISTS fk_tenant_site_packages_site;
ALTER TABLE tenant_site_packages ADD CONSTRAINT fk_tenant_site_packages_site
  FOREIGN KEY (tenant_site_id) REFERENCES tenant_sites(id) ON DELETE CASCADE;

ALTER TABLE tenant_site_packages DROP CONSTRAINT IF EXISTS fk_tenant_site_packages_package;
ALTER TABLE tenant_site_packages ADD CONSTRAINT fk_tenant_site_packages_package
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE;

ALTER TABLE slug_redirects DROP CONSTRAINT IF EXISTS fk_slug_redirects_site;
ALTER TABLE slug_redirects ADD CONSTRAINT fk_slug_redirects_site
  FOREIGN KEY (tenant_site_id) REFERENCES tenant_sites(id) ON DELETE CASCADE;

ALTER TABLE template_upgrade_orders DROP CONSTRAINT IF EXISTS fk_template_upgrade_orders_site;
ALTER TABLE template_upgrade_orders ADD CONSTRAINT fk_template_upgrade_orders_site
  FOREIGN KEY (tenant_site_id) REFERENCES tenant_sites(id) ON DELETE CASCADE;

-- itineraries → departures
ALTER TABLE itineraries DROP CONSTRAINT IF EXISTS fk_itineraries_departure;
ALTER TABLE itineraries ADD CONSTRAINT fk_itineraries_departure
  FOREIGN KEY (departure_id) REFERENCES package_departures(id) ON DELETE CASCADE;

ALTER TABLE itinerary_days DROP CONSTRAINT IF EXISTS fk_itinerary_days_itinerary;
ALTER TABLE itinerary_days ADD CONSTRAINT fk_itinerary_days_itinerary
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE;

-- CRM
ALTER TABLE lead_follow_ups DROP CONSTRAINT IF EXISTS fk_lead_follow_ups_lead;
ALTER TABLE lead_follow_ups ADD CONSTRAINT fk_lead_follow_ups_lead
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

-- auth (user_roles / profiles → auth.users)
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS fk_user_roles_user;
ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS fk_profiles_user;
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_user
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_notifications_user;
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── UNIQUE CONSTRAINTS (idempotent) ─────────────────────────────────────────
ALTER TABLE packages        DROP CONSTRAINT IF EXISTS uq_packages_slug;
ALTER TABLE packages        ADD  CONSTRAINT uq_packages_slug        UNIQUE (slug);

ALTER TABLE blog_posts      DROP CONSTRAINT IF EXISTS uq_blog_posts_slug;
ALTER TABLE blog_posts      ADD  CONSTRAINT uq_blog_posts_slug      UNIQUE (slug);

ALTER TABLE pages           DROP CONSTRAINT IF EXISTS uq_pages_slug;
ALTER TABLE pages           ADD  CONSTRAINT uq_pages_slug           UNIQUE (slug);

ALTER TABLE seo_overrides   DROP CONSTRAINT IF EXISTS uq_seo_overrides_path;
ALTER TABLE seo_overrides   ADD  CONSTRAINT uq_seo_overrides_path   UNIQUE (path);

ALTER TABLE coupons         DROP CONSTRAINT IF EXISTS uq_coupons_code;
ALTER TABLE coupons         ADD  CONSTRAINT uq_coupons_code         UNIQUE (code);

ALTER TABLE user_roles      DROP CONSTRAINT IF EXISTS uq_user_roles_user_id;
ALTER TABLE user_roles      ADD  CONSTRAINT uq_user_roles_user_id   UNIQUE (user_id);

ALTER TABLE bookings        DROP CONSTRAINT IF EXISTS uq_bookings_booking_code;
ALTER TABLE bookings        ADD  CONSTRAINT uq_bookings_booking_code UNIQUE (booking_code);

ALTER TABLE currencies      DROP CONSTRAINT IF EXISTS uq_currencies_code;
ALTER TABLE currencies      ADD  CONSTRAINT uq_currencies_code      UNIQUE (code);

ALTER TABLE tenant_sites    DROP CONSTRAINT IF EXISTS uq_tenant_sites_subdomain;
ALTER TABLE tenant_sites    ADD  CONSTRAINT uq_tenant_sites_subdomain UNIQUE (subdomain);

ALTER TABLE branches  DROP CONSTRAINT IF EXISTS uq_branches_slug;
ALTER TABLE branches  ADD  CONSTRAINT uq_branches_slug  UNIQUE (slug);

ALTER TABLE profiles  DROP CONSTRAINT IF EXISTS uq_profiles_email;
ALTER TABLE profiles  ADD  CONSTRAINT uq_profiles_email UNIQUE (email);

-- =============================================================
-- FK: users → auth.users  (public.users mirrors auth identities)
-- =============================================================
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_auth;
ALTER TABLE users ADD CONSTRAINT fk_users_auth
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

-- ── Helper functions ─────────────────────────────────────────

-- Returns the role of the currently authenticated user.
-- SECURITY DEFINER runs as the function owner (postgres) so it can
-- bypass RLS on user_roles without an infinite loop.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(get_my_role() IN ('admin','super_admin'), false);
$$;

CREATE OR REPLACE FUNCTION public.is_agent_or_above()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(get_my_role() IN ('agent','admin','super_admin'), false);
$$;

-- ── Enable RLS on every table ─────────────────────────────────

ALTER TABLE sessions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE airlines                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE airports                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE muthawifs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies                ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_departures        ENABLE ROW LEVEL SECURITY;
ALTER TABLE departure_prices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE departure_gallery         ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_costs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_commissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_hotels            ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_commissions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_withdrawals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_rooms             ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_pilgrims          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilgrim_documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_proof_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials              ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilgrim_testimonials      ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_reviews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE manasik_materials         ENABLE ROW LEVEL SECURITY;
ALTER TABLE services                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_steps               ENABLE ROW LEVEL SECURITY;
ALTER TABLE advantages                ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE floating_buttons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_overrides             ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_log               ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilgrim_doc_access_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_follow_ups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_balances          ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points            ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_secrets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries               ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_days            ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_sites              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_site_packages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE slug_redirects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_upgrade_orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons                   ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- POLICIES
-- Naming convention: <table>_<role>_<action>
-- =============================================================

-- ── 1. PUBLIC READ — no auth needed (landing page, catalog) ──

-- packages: active only for public, admins see all
DROP POLICY IF EXISTS packages_public_read   ON packages;
DROP POLICY IF EXISTS packages_admin_all     ON packages;
CREATE POLICY packages_public_read   ON packages FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY packages_admin_all     ON packages FOR ALL    TO authenticated       USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS package_categories_public_read ON package_categories;
DROP POLICY IF EXISTS package_categories_admin_all   ON package_categories;
CREATE POLICY package_categories_public_read ON package_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY package_categories_admin_all   ON package_categories FOR ALL    TO authenticated       USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS package_departures_public_read ON package_departures;
DROP POLICY IF EXISTS package_departures_admin_all   ON package_departures;
CREATE POLICY package_departures_public_read ON package_departures FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY package_departures_admin_all   ON package_departures FOR ALL    TO authenticated       USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS departure_prices_public_read ON departure_prices;
DROP POLICY IF EXISTS departure_prices_admin_all   ON departure_prices;
CREATE POLICY departure_prices_public_read ON departure_prices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY departure_prices_admin_all   ON departure_prices FOR ALL    TO authenticated       USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS departure_gallery_public_read ON departure_gallery;
DROP POLICY IF EXISTS departure_gallery_admin_all   ON departure_gallery;
CREATE POLICY departure_gallery_public_read ON departure_gallery FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY departure_gallery_admin_all   ON departure_gallery FOR ALL    TO authenticated       USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS package_hotels_public_read ON package_hotels;
DROP POLICY IF EXISTS package_hotels_admin_all   ON package_hotels;
CREATE POLICY package_hotels_public_read ON package_hotels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY package_hotels_admin_all   ON package_hotels FOR ALL    TO authenticated       USING (is_admin()) WITH CHECK (is_admin());


DROP POLICY IF EXISTS package_costs_auth_read ON package_costs;
DROP POLICY IF EXISTS package_costs_admin_all ON package_costs;
CREATE POLICY package_costs_auth_read ON package_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY package_costs_admin_all ON package_costs FOR ALL    TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS package_commissions_admin_all ON package_commissions;
CREATE POLICY package_commissions_admin_all ON package_commissions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Master data: public read, admin write
DROP POLICY IF EXISTS hotels_public_read ON hotels;     DROP POLICY IF EXISTS hotels_admin_all ON hotels;
DROP POLICY IF EXISTS airlines_public_read ON airlines; DROP POLICY IF EXISTS airlines_admin_all ON airlines;
DROP POLICY IF EXISTS airports_public_read ON airports; DROP POLICY IF EXISTS airports_admin_all ON airports;
DROP POLICY IF EXISTS muthawifs_public_read ON muthawifs; DROP POLICY IF EXISTS muthawifs_admin_all ON muthawifs;
DROP POLICY IF EXISTS branches_public_read ON branches; DROP POLICY IF EXISTS branches_admin_all ON branches;
DROP POLICY IF EXISTS currencies_public_read ON currencies; DROP POLICY IF EXISTS currencies_admin_all ON currencies;

CREATE POLICY hotels_public_read     ON hotels     FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY hotels_admin_all       ON hotels     FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY airlines_public_read   ON airlines   FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY airlines_admin_all     ON airlines   FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY airports_public_read   ON airports   FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY airports_admin_all     ON airports   FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY muthawifs_public_read  ON muthawifs  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY muthawifs_admin_all    ON muthawifs  FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY branches_public_read   ON branches   FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY branches_admin_all     ON branches   FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY currencies_public_read ON currencies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY currencies_admin_all   ON currencies FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());

-- CMS: public read, admin write
DROP POLICY IF EXISTS testimonials_public_read       ON testimonials;       DROP POLICY IF EXISTS testimonials_admin_all       ON testimonials;
DROP POLICY IF EXISTS blog_posts_public_read         ON blog_posts;         DROP POLICY IF EXISTS blog_posts_admin_all         ON blog_posts;
DROP POLICY IF EXISTS gallery_public_read            ON gallery;            DROP POLICY IF EXISTS gallery_admin_all            ON gallery;
DROP POLICY IF EXISTS faqs_public_read               ON faqs;               DROP POLICY IF EXISTS faqs_admin_all               ON faqs;
DROP POLICY IF EXISTS pages_public_read              ON pages;              DROP POLICY IF EXISTS pages_admin_all              ON pages;
DROP POLICY IF EXISTS manasik_materials_public_read  ON manasik_materials;  DROP POLICY IF EXISTS manasik_materials_admin_all  ON manasik_materials;
DROP POLICY IF EXISTS services_public_read           ON services;           DROP POLICY IF EXISTS services_admin_all           ON services;
DROP POLICY IF EXISTS guide_steps_public_read        ON guide_steps;        DROP POLICY IF EXISTS guide_steps_admin_all        ON guide_steps;
DROP POLICY IF EXISTS advantages_public_read         ON advantages;         DROP POLICY IF EXISTS advantages_admin_all         ON advantages;
DROP POLICY IF EXISTS navigation_items_public_read   ON navigation_items;   DROP POLICY IF EXISTS navigation_items_admin_all   ON navigation_items;
DROP POLICY IF EXISTS floating_buttons_public_read   ON floating_buttons;   DROP POLICY IF EXISTS floating_buttons_admin_all   ON floating_buttons;
DROP POLICY IF EXISTS site_settings_public_read      ON site_settings;      DROP POLICY IF EXISTS site_settings_admin_all      ON site_settings;
DROP POLICY IF EXISTS seo_overrides_public_read      ON seo_overrides;      DROP POLICY IF EXISTS seo_overrides_admin_all      ON seo_overrides;
DROP POLICY IF EXISTS slug_redirects_public_read     ON slug_redirects;     DROP POLICY IF EXISTS slug_redirects_admin_all     ON slug_redirects;
DROP POLICY IF EXISTS tenant_sites_public_read       ON tenant_sites;       DROP POLICY IF EXISTS tenant_sites_admin_all       ON tenant_sites;
DROP POLICY IF EXISTS tenant_site_packages_public_read ON tenant_site_packages; DROP POLICY IF EXISTS tenant_site_packages_admin_all ON tenant_site_packages;
DROP POLICY IF EXISTS itineraries_public_read        ON itineraries;        DROP POLICY IF EXISTS itineraries_admin_all        ON itineraries;
DROP POLICY IF EXISTS itinerary_days_public_read     ON itinerary_days;     DROP POLICY IF EXISTS itinerary_days_admin_all     ON itinerary_days;

CREATE POLICY testimonials_public_read      ON testimonials      FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY testimonials_admin_all        ON testimonials      FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY blog_posts_public_read        ON blog_posts        FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY blog_posts_admin_read_all     ON blog_posts        FOR SELECT TO authenticated        USING (is_admin());
CREATE POLICY blog_posts_admin_all          ON blog_posts        FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY gallery_public_read           ON gallery           FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY gallery_admin_all             ON gallery           FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY faqs_public_read              ON faqs              FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY faqs_admin_all                ON faqs              FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY pages_public_read             ON pages             FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pages_admin_all               ON pages             FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY manasik_materials_public_read ON manasik_materials FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY manasik_materials_admin_all   ON manasik_materials FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY services_public_read          ON services          FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY services_admin_all            ON services          FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY guide_steps_public_read       ON guide_steps       FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY guide_steps_admin_all         ON guide_steps       FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY advantages_public_read        ON advantages        FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY advantages_admin_all          ON advantages        FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY navigation_items_public_read  ON navigation_items  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY navigation_items_admin_all    ON navigation_items  FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY floating_buttons_public_read  ON floating_buttons  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY floating_buttons_admin_all    ON floating_buttons  FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY site_settings_public_read     ON site_settings     FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY site_settings_admin_all       ON site_settings     FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY seo_overrides_public_read     ON seo_overrides     FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY seo_overrides_admin_all       ON seo_overrides     FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY slug_redirects_public_read    ON slug_redirects    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY slug_redirects_admin_all      ON slug_redirects    FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY tenant_sites_public_read      ON tenant_sites      FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY tenant_sites_admin_all        ON tenant_sites      FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY tenant_site_packages_public_read ON tenant_site_packages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY tenant_site_packages_admin_all   ON tenant_site_packages FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY itineraries_public_read       ON itineraries       FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY itineraries_admin_all         ON itineraries       FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY itinerary_days_public_read    ON itinerary_days    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY itinerary_days_admin_all      ON itinerary_days    FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());

-- ── 2. USER ROLES ─────────────────────────────────────────────
-- Users can read their own role; only super_admin can manage all

DROP POLICY IF EXISTS user_roles_read_own    ON user_roles;
DROP POLICY IF EXISTS user_roles_admin_all   ON user_roles;
CREATE POLICY user_roles_read_own  ON user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR get_my_role() = 'super_admin');
CREATE POLICY user_roles_admin_all ON user_roles FOR ALL    TO authenticated
  USING (get_my_role() = 'super_admin') WITH CHECK (get_my_role() = 'super_admin');

-- ── 3. PROFILES & USERS ──────────────────────────────────────

DROP POLICY IF EXISTS profiles_read_own   ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
DROP POLICY IF EXISTS profiles_admin_all  ON profiles;
CREATE POLICY profiles_read_own   ON profiles FOR SELECT TO authenticated USING (id = auth.uid() OR is_admin());
CREATE POLICY profiles_insert_own ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update_own ON profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR is_admin());
CREATE POLICY profiles_admin_all  ON profiles FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS users_read_own  ON users;
DROP POLICY IF EXISTS users_admin_all ON users;
CREATE POLICY users_read_own  ON users FOR SELECT TO authenticated USING (id = auth.uid() OR is_admin());
CREATE POLICY users_admin_all ON users FOR ALL    TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- sessions: managed by server only (service role bypasses RLS)
DROP POLICY IF EXISTS sessions_deny_direct ON sessions;
CREATE POLICY sessions_deny_direct ON sessions FOR ALL TO authenticated USING (false);

-- ── 4. BOOKINGS ───────────────────────────────────────────────
-- Buyer sees own; agent sees bookings tied to them; admin sees all

DROP POLICY IF EXISTS bookings_read_own   ON bookings;
DROP POLICY IF EXISTS bookings_agent_read ON bookings;
DROP POLICY IF EXISTS bookings_admin_all  ON bookings;
DROP POLICY IF EXISTS bookings_insert_own ON bookings;
DROP POLICY IF EXISTS bookings_update_own ON bookings;

CREATE POLICY bookings_read_own   ON bookings FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY bookings_agent_read ON bookings FOR SELECT TO authenticated
  USING (is_agent_or_above());
CREATE POLICY bookings_insert_own ON bookings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_agent_or_above());
CREATE POLICY bookings_update_own ON bookings FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR is_admin());
CREATE POLICY bookings_admin_all  ON bookings FOR DELETE TO authenticated
  USING (is_admin());

-- booking sub-tables: follow parent booking ownership
DROP POLICY IF EXISTS booking_rooms_read     ON booking_rooms;     DROP POLICY IF EXISTS booking_rooms_admin_all     ON booking_rooms;
DROP POLICY IF EXISTS booking_pilgrims_read  ON booking_pilgrims;  DROP POLICY IF EXISTS booking_pilgrims_admin_all  ON booking_pilgrims;
DROP POLICY IF EXISTS pilgrim_documents_read ON pilgrim_documents; DROP POLICY IF EXISTS pilgrim_documents_admin_all ON pilgrim_documents;
DROP POLICY IF EXISTS booking_payments_read  ON booking_payments;  DROP POLICY IF EXISTS booking_payments_admin_all  ON booking_payments;
DROP POLICY IF EXISTS payments_read          ON payments;           DROP POLICY IF EXISTS payments_admin_all          ON payments;

CREATE POLICY booking_rooms_read      ON booking_rooms     FOR SELECT TO authenticated
  USING (is_agent_or_above() OR booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid()));
CREATE POLICY booking_rooms_admin_all ON booking_rooms     FOR ALL    TO authenticated USING (is_agent_or_above()) WITH CHECK (is_agent_or_above());

CREATE POLICY booking_pilgrims_read      ON booking_pilgrims  FOR SELECT TO authenticated
  USING (is_agent_or_above() OR booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid()));
CREATE POLICY booking_pilgrims_admin_all ON booking_pilgrims  FOR ALL    TO authenticated USING (is_agent_or_above()) WITH CHECK (is_agent_or_above());

CREATE POLICY pilgrim_documents_read      ON pilgrim_documents FOR SELECT TO authenticated
  USING (is_agent_or_above() OR booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid()));
CREATE POLICY pilgrim_documents_admin_all ON pilgrim_documents FOR ALL    TO authenticated USING (is_agent_or_above()) WITH CHECK (is_agent_or_above());

CREATE POLICY booking_payments_read      ON booking_payments  FOR SELECT TO authenticated
  USING (is_agent_or_above() OR booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid()));
CREATE POLICY booking_payments_admin_all ON booking_payments  FOR ALL    TO authenticated USING (is_agent_or_above()) WITH CHECK (is_agent_or_above());

CREATE POLICY payments_read      ON payments FOR SELECT TO authenticated
  USING (is_agent_or_above() OR booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid()));
CREATE POLICY payments_admin_all ON payments FOR ALL    TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- payment_proof_access_logs: insert own, admin reads all
DROP POLICY IF EXISTS ppal_insert_own ON payment_proof_access_logs;
DROP POLICY IF EXISTS ppal_admin_read ON payment_proof_access_logs;
CREATE POLICY ppal_insert_own ON payment_proof_access_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY ppal_admin_read ON payment_proof_access_logs FOR SELECT TO authenticated USING (is_admin());

-- financial_transactions: admin only
DROP POLICY IF EXISTS financial_transactions_admin_all ON financial_transactions;
CREATE POLICY financial_transactions_admin_all ON financial_transactions FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ── 5. AGENTS ─────────────────────────────────────────────────

DROP POLICY IF EXISTS agents_read_own    ON agents;
DROP POLICY IF EXISTS agents_admin_all   ON agents;
DROP POLICY IF EXISTS agents_public_read ON agents;
CREATE POLICY agents_public_read ON agents FOR SELECT TO authenticated USING (true);  -- authenticated can lookup agents
CREATE POLICY agents_admin_all   ON agents FOR ALL    TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS agent_commissions_read_own  ON agent_commissions;
DROP POLICY IF EXISTS agent_commissions_admin_all ON agent_commissions;
CREATE POLICY agent_commissions_read_own  ON agent_commissions FOR SELECT TO authenticated
  USING (is_admin() OR agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY agent_commissions_admin_all ON agent_commissions FOR ALL    TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS agent_withdrawals_read_own  ON agent_withdrawals;
DROP POLICY IF EXISTS agent_withdrawals_insert_own ON agent_withdrawals;
DROP POLICY IF EXISTS agent_withdrawals_admin_all ON agent_withdrawals;
CREATE POLICY agent_withdrawals_read_own   ON agent_withdrawals FOR SELECT TO authenticated
  USING (is_admin() OR agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY agent_withdrawals_insert_own ON agent_withdrawals FOR INSERT TO authenticated
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()) OR is_admin());
CREATE POLICY agent_withdrawals_admin_all  ON agent_withdrawals FOR UPDATE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS affiliate_clicks_insert ON affiliate_clicks;
DROP POLICY IF EXISTS affiliate_clicks_admin_read ON affiliate_clicks;
CREATE POLICY affiliate_clicks_insert    ON affiliate_clicks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY affiliate_clicks_admin_read ON affiliate_clicks FOR SELECT TO authenticated USING (is_admin());

-- ── 6. USER CONTENT (own data only) ──────────────────────────

-- notifications
DROP POLICY IF EXISTS notifications_own     ON notifications;
DROP POLICY IF EXISTS notifications_admin_all ON notifications;
CREATE POLICY notifications_own      ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY notifications_update_own ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY notifications_admin_all ON notifications FOR ALL    TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- wishlists
DROP POLICY IF EXISTS wishlists_own ON wishlists;
CREATE POLICY wishlists_own ON wishlists FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- package_reviews: users insert own, public sees approved
DROP POLICY IF EXISTS package_reviews_public_read ON package_reviews;
DROP POLICY IF EXISTS package_reviews_own_insert  ON package_reviews;
DROP POLICY IF EXISTS package_reviews_admin_all   ON package_reviews;
CREATE POLICY package_reviews_public_read ON package_reviews FOR SELECT TO anon, authenticated USING (is_approved = true);
CREATE POLICY package_reviews_auth_read   ON package_reviews FOR SELECT TO authenticated        USING (user_id = auth.uid() OR is_admin());
CREATE POLICY package_reviews_own_insert  ON package_reviews FOR INSERT TO authenticated        WITH CHECK (user_id = auth.uid());
CREATE POLICY package_reviews_admin_all   ON package_reviews FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());

-- pilgrim_testimonials: same pattern
DROP POLICY IF EXISTS pilgrim_testimonials_public_read ON pilgrim_testimonials;
DROP POLICY IF EXISTS pilgrim_testimonials_own_insert  ON pilgrim_testimonials;
DROP POLICY IF EXISTS pilgrim_testimonials_admin_all   ON pilgrim_testimonials;
CREATE POLICY pilgrim_testimonials_public_read ON pilgrim_testimonials FOR SELECT TO anon, authenticated USING (is_approved = true);
CREATE POLICY pilgrim_testimonials_own_read    ON pilgrim_testimonials FOR SELECT TO authenticated        USING (user_id = auth.uid() OR is_admin());
CREATE POLICY pilgrim_testimonials_own_insert  ON pilgrim_testimonials FOR INSERT TO authenticated        WITH CHECK (user_id = auth.uid());
CREATE POLICY pilgrim_testimonials_admin_all   ON pilgrim_testimonials FOR ALL    TO authenticated        USING (is_admin()) WITH CHECK (is_admin());

-- loyalty
DROP POLICY IF EXISTS loyalty_balances_own    ON loyalty_balances;
DROP POLICY IF EXISTS loyalty_balances_admin  ON loyalty_balances;
DROP POLICY IF EXISTS loyalty_points_own      ON loyalty_points;
DROP POLICY IF EXISTS loyalty_points_admin    ON loyalty_points;
CREATE POLICY loyalty_balances_own   ON loyalty_balances FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
CREATE POLICY loyalty_balances_admin ON loyalty_balances FOR ALL    TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY loyalty_points_own     ON loyalty_points   FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
CREATE POLICY loyalty_points_admin   ON loyalty_points   FOR ALL    TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- refund_requests
DROP POLICY IF EXISTS refund_requests_own       ON refund_requests;
DROP POLICY IF EXISTS refund_requests_admin_all ON refund_requests;
CREATE POLICY refund_requests_own       ON refund_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
CREATE POLICY refund_requests_insert_own ON refund_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY refund_requests_admin_all ON refund_requests FOR ALL    TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- contracts
DROP POLICY IF EXISTS contracts_own       ON contracts;
DROP POLICY IF EXISTS contracts_admin_all ON contracts;
CREATE POLICY contracts_own       ON contracts FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
CREATE POLICY contracts_update_own ON contracts FOR UPDATE TO authenticated USING (user_id = auth.uid() OR is_admin());
CREATE POLICY contracts_admin_all ON contracts FOR ALL    TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- chat_messages
DROP POLICY IF EXISTS chat_messages_booking_parties ON chat_messages;
DROP POLICY IF EXISTS chat_messages_admin_all       ON chat_messages;
CREATE POLICY chat_messages_booking_parties ON chat_messages FOR SELECT TO authenticated
  USING (is_agent_or_above() OR booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid()));
CREATE POLICY chat_messages_insert ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (is_agent_or_above() OR booking_id IN (SELECT id FROM bookings WHERE user_id = auth.uid()));
CREATE POLICY chat_messages_admin_all ON chat_messages FOR DELETE TO authenticated USING (is_admin());

-- ── 7. CRM — agent & admin only ──────────────────────────────

DROP POLICY IF EXISTS leads_agent_all ON leads;
DROP POLICY IF EXISTS lead_follow_ups_agent_all ON lead_follow_ups;
CREATE POLICY leads_agent_all          ON leads           FOR ALL TO authenticated USING (is_agent_or_above()) WITH CHECK (is_agent_or_above());
CREATE POLICY lead_follow_ups_agent_all ON lead_follow_ups FOR ALL TO authenticated USING (is_agent_or_above()) WITH CHECK (is_agent_or_above());

-- coupons: authenticated read, admin write
DROP POLICY IF EXISTS coupons_auth_read ON coupons;
DROP POLICY IF EXISTS coupons_admin_all ON coupons;
CREATE POLICY coupons_auth_read ON coupons FOR SELECT TO authenticated USING (is_active = true OR is_admin());
CREATE POLICY coupons_admin_all ON coupons FOR ALL    TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ── 8. LOGS — insert by system, read by admin ─────────────────

DROP POLICY IF EXISTS request_log_insert    ON request_log;
DROP POLICY IF EXISTS request_log_admin_read ON request_log;
DROP POLICY IF EXISTS error_logs_insert     ON error_logs;
DROP POLICY IF EXISTS error_logs_admin_read ON error_logs;
DROP POLICY IF EXISTS audit_logs_insert     ON audit_logs;
DROP POLICY IF EXISTS audit_logs_admin_read ON audit_logs;
DROP POLICY IF EXISTS pilgrim_doc_access_logs_insert ON pilgrim_doc_access_logs;
DROP POLICY IF EXISTS pilgrim_doc_access_logs_admin  ON pilgrim_doc_access_logs;

CREATE POLICY request_log_insert     ON request_log  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY request_log_admin_read ON request_log  FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY error_logs_insert      ON error_logs   FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY error_logs_admin_read  ON error_logs   FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY audit_logs_insert      ON audit_logs   FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY audit_logs_admin_read  ON audit_logs   FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY pilgrim_doc_access_logs_insert ON pilgrim_doc_access_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY pilgrim_doc_access_logs_admin  ON pilgrim_doc_access_logs FOR SELECT TO authenticated USING (is_admin());

-- ── 9. SENSITIVE — admin / super_admin only ───────────────────

DROP POLICY IF EXISTS integration_secrets_admin ON integration_secrets;
DROP POLICY IF EXISTS template_upgrade_orders_own ON template_upgrade_orders;
DROP POLICY IF EXISTS template_upgrade_orders_admin ON template_upgrade_orders;

CREATE POLICY integration_secrets_admin      ON integration_secrets     FOR ALL TO authenticated USING (get_my_role() = 'super_admin') WITH CHECK (get_my_role() = 'super_admin');
CREATE POLICY template_upgrade_orders_own    ON template_upgrade_orders FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY template_upgrade_orders_admin  ON template_upgrade_orders FOR ALL    TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- =============================================================
-- JWT HOOK — tambahkan user_role ke token Supabase
-- Aktifkan di: Supabase → Authentication → Hooks → custom_access_token
-- =============================================================
CREATE OR REPLACE FUNCTION public.custom_jwt_claims(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id  uuid;
  user_role text;
  claims   jsonb;
BEGIN
  user_id := (event ->> 'user_id')::uuid;
  SELECT role INTO user_role FROM public.user_roles WHERE user_roles.user_id = user_id LIMIT 1;
  claims := event -> 'claims';
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    claims := jsonb_set(claims, '{app_metadata}',
      COALESCE(claims -> 'app_metadata', '{}'::jsonb) || jsonb_build_object('role', user_role));
  END IF;
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

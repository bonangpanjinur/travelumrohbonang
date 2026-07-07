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
  id                VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id                VARCHAR PRIMARY KEY,
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
  id         TEXT PRIMARY KEY,
  name       TEXT    NOT NULL,
  address    TEXT,
  phone      TEXT,
  email      TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ
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
  user_id            TEXT,
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
  user_id    TEXT NOT NULL,
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
  user_id        TEXT,
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
  user_id    TEXT,
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
  user_id     TEXT    NOT NULL,
  rating      INTEGER,
  message     TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS package_reviews (
  id          TEXT PRIMARY KEY,
  package_id  TEXT    NOT NULL,
  user_id     TEXT    NOT NULL,
  rating      INTEGER,
  title       TEXT,
  comment     TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS wishlists (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
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
  user_id    TEXT,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS error_logs (
  id         TEXT PRIMARY KEY,
  user_id    TEXT,
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
  user_id     TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  metadata    JSONB,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pilgrim_doc_access_logs (
  id           TEXT PRIMARY KEY,
  user_id      TEXT,
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
  user_id      TEXT    NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS loyalty_points (
  id          TEXT PRIMARY KEY,
  user_id     TEXT    NOT NULL,
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
  user_id            TEXT NOT NULL,
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
  user_id    TEXT    NOT NULL,
  title      TEXT    NOT NULL,
  message    TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS refund_requests (
  id              TEXT PRIMARY KEY,
  user_id         TEXT    NOT NULL,
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

-- =============================================================================
-- FIX ALL TABLES — Satu file, aman dijalankan berkali-kali
-- =============================================================================
-- Cara pakai: Supabase Dashboard → SQL Editor → New Query → paste → Run
--
-- Script ini:
-- • SECTION A – Tambah kolom yang mungkin kurang di tabel yang sudah ada
-- • SECTION B – Buat tabel yang belum ada sama sekali
-- • Tidak ada RLS policy (untuk menghindari konflik tipe uuid/text)
-- • Semua operasi pakai IF NOT EXISTS / DO block agar aman diulang
-- =============================================================================

-- =============================================================================
-- SECTION A: TAMBAH KOLOM YANG KURANG DI TABEL EXISTING
-- =============================================================================

-- payment_gateway_transactions (tabel ini sudah ada tapi column-nya kurang)
ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS gateway                  text;
ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS order_id                 text;
ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS gateway_transaction_id   text;
ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS payment_method           text;
ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS bank_code                text;
ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS va_number                text;
ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS customer_name            text;
ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS customer_email           text;
ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS expiry_time              timestamp with time zone;
ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS paid_at                  timestamp with time zone;
ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS raw_response             text;
ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS updated_at               timestamp with time zone;

-- payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_method  text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_type    text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS proof_url       text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_at         timestamp with time zone;

-- bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS agent_id       text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pic_id         text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pic_type       text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_scheme text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS branch_id      text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS departure_id   text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS currency       text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS notes          text;

-- booking_pilgrims
ALTER TABLE public.booking_pilgrims ADD COLUMN IF NOT EXISTS gender           text;
ALTER TABLE public.booking_pilgrims ADD COLUMN IF NOT EXISTS nik              text;
ALTER TABLE public.booking_pilgrims ADD COLUMN IF NOT EXISTS birth_date       text;
ALTER TABLE public.booking_pilgrims ADD COLUMN IF NOT EXISTS nationality      text;
ALTER TABLE public.booking_pilgrims ADD COLUMN IF NOT EXISTS passport_number  text;
ALTER TABLE public.booking_pilgrims ADD COLUMN IF NOT EXISTS passport_expiry  text;
ALTER TABLE public.booking_pilgrims ADD COLUMN IF NOT EXISTS room_type        text;
ALTER TABLE public.booking_pilgrims ADD COLUMN IF NOT EXISTS phone            text;
ALTER TABLE public.booking_pilgrims ADD COLUMN IF NOT EXISTS email            text;

-- contracts
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS html_content        text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signature_data_url  text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signed_at            timestamp with time zone;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signer_name          text;

-- refund_requests
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS bank_name      text;
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS bank_account   text;
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS account_holder text;
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS admin_notes    text;
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS processed_by   text;
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS processed_at   timestamp with time zone;

-- package_departures
ALTER TABLE public.package_departures ADD COLUMN IF NOT EXISTS muthawif_id     text;
ALTER TABLE public.package_departures ADD COLUMN IF NOT EXISTS return_date      text;
ALTER TABLE public.package_departures ADD COLUMN IF NOT EXISTS remaining_quota  integer;

-- packages
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS hotel_makkah_id    text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS hotel_madinah_id   text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS airline_id         text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS airport_id         text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS package_type       text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS category_id        text;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS minimum_dp         integer;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS dp_deadline_days   integer;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS full_deadline_days integer;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS duration_days      integer;

-- profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone              text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url         text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch_id          text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS totp_enabled       boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS totp_secret        text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS totp_backup_codes  text;

-- branches
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS slug          text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS region        text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS postal_code   text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS country       text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS latitude      double precision;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS longitude     double precision;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS opening_hours text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS image_url     text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS map_url       text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS description   text;

-- hotels
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS stars       integer;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS image_url   text;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS description  text;

-- user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- =============================================================================
-- SECTION B: BUAT TABEL YANG BELUM ADA
-- =============================================================================
-- Urutan: tabel independen → dependensi → child tables

-- ── Master / independen ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.currencies (
    id          text PRIMARY KEY,
    code        text NOT NULL,
    name        text,
    symbol      text,
    rate_to_idr integer,
    is_default  boolean NOT NULL DEFAULT false,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.airlines (
    id         text PRIMARY KEY,
    name       text NOT NULL,
    code       text,
    logo_url   text,
    created_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.airports (
    id         text PRIMARY KEY,
    name       text NOT NULL,
    code       text,
    city       text,
    created_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.muthawifs (
    id         text PRIMARY KEY,
    name       text NOT NULL,
    phone      text,
    photo_url  text,
    bio        text,
    is_active  boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.package_categories (
    id               text PRIMARY KEY,
    name             text NOT NULL,
    description      text,
    parent_id        text REFERENCES public.package_categories(id) ON DELETE SET NULL,
    icon             text,
    show_extra_hotels boolean NOT NULL DEFAULT false,
    is_active        boolean NOT NULL DEFAULT true,
    sort_order       integer,
    created_at       timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_package_categories_is_active ON public.package_categories (is_active);
CREATE INDEX IF NOT EXISTS idx_package_categories_parent_id ON public.package_categories (parent_id);

CREATE TABLE IF NOT EXISTS public.integration_secrets (
    id         text PRIMARY KEY,
    provider   text NOT NULL,
    config     jsonb,
    is_active  boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_integration_secrets_provider ON public.integration_secrets (provider);

CREATE TABLE IF NOT EXISTS public.leads (
    id               text PRIMARY KEY,
    name             text NOT NULL,
    phone            text,
    email            text,
    source           text,
    status           text NOT NULL DEFAULT 'new',
    package_interest text,
    notes            text,
    created_at       timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads (status);

CREATE TABLE IF NOT EXISTS public.loyalty_balances (
    id           text PRIMARY KEY,
    user_id      text NOT NULL,
    total_points integer NOT NULL DEFAULT 0,
    created_at   timestamp with time zone
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_loyalty_balances_user_id ON public.loyalty_balances (user_id);

CREATE TABLE IF NOT EXISTS public.loyalty_points (
    id          text PRIMARY KEY,
    user_id     text NOT NULL,
    points      integer NOT NULL,
    source      text,
    description text,
    created_at  timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user_id ON public.loyalty_points (user_id);

CREATE TABLE IF NOT EXISTS public.request_log (
    id         text PRIMARY KEY,
    ip         text,
    endpoint   text NOT NULL,
    user_id    text,
    created_at timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_request_log_created_at ON public.request_log (created_at);
CREATE INDEX IF NOT EXISTS idx_request_log_user_id    ON public.request_log (user_id);

CREATE TABLE IF NOT EXISTS public.error_logs (
    id         text PRIMARY KEY,
    user_id    text,
    level      text NOT NULL,
    message    text NOT NULL,
    stack      text,
    url        text,
    user_agent text,
    context    jsonb,
    created_at timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_level       ON public.error_logs (level);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id          text PRIMARY KEY,
    user_id     text,
    action      text NOT NULL,
    entity_type text,
    entity_id   text,
    metadata    jsonb,
    user_agent  text,
    created_at  timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);

CREATE TABLE IF NOT EXISTS public.seo_overrides (
    id                 text PRIMARY KEY,
    path               text NOT NULL,
    title              text,
    description        text,
    og_image           text,
    canonical_override text,
    noindex            boolean NOT NULL DEFAULT false,
    keywords           text,
    created_at         timestamp with time zone
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_seo_overrides_path ON public.seo_overrides (path);

CREATE TABLE IF NOT EXISTS public.role_menu_permissions (
    id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    role       text NOT NULL,
    menu_key   text NOT NULL,
    enabled    boolean NOT NULL DEFAULT true,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_role_menu_permissions ON public.role_menu_permissions (role, menu_key);
CREATE INDEX IF NOT EXISTS idx_rmp_role ON public.role_menu_permissions (role);

-- ── CMS / Content ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.blog_posts (
    id              text PRIMARY KEY,
    title           text NOT NULL,
    slug            text NOT NULL,
    excerpt         text,
    content         text,
    image_url       text,
    category        text,
    author          text,
    seo_title       text,
    seo_description text,
    is_published    boolean NOT NULL DEFAULT false,
    published_at    timestamp with time zone,
    created_at      timestamp with time zone
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_blog_posts_slug ON public.blog_posts (slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_is_published ON public.blog_posts (is_published);

CREATE TABLE IF NOT EXISTS public.pages (
    id              text PRIMARY KEY,
    slug            text NOT NULL,
    title           text NOT NULL,
    content         text,
    seo_title       text,
    seo_description text,
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamp with time zone
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pages_slug ON public.pages (slug);

CREATE TABLE IF NOT EXISTS public.gallery (
    id          text PRIMARY KEY,
    image_url   text NOT NULL,
    title       text,
    description text,
    category    text,
    sort_order  integer,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.faqs (
    id         text PRIMARY KEY,
    question   text NOT NULL,
    answer     text NOT NULL,
    scope      text,
    package_id text,
    sort_order integer,
    is_active  boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_faqs_scope      ON public.faqs (scope);
CREATE INDEX IF NOT EXISTS idx_faqs_package_id ON public.faqs (package_id);

CREATE TABLE IF NOT EXISTS public.services (
    id          text PRIMARY KEY,
    title       text NOT NULL,
    description text,
    icon        text,
    sort_order  integer,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.guide_steps (
    id          text PRIMARY KEY,
    step_number integer NOT NULL,
    title       text NOT NULL,
    description text,
    icon        text,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.advantages (
    id         text PRIMARY KEY,
    title      text NOT NULL,
    icon       text,
    sort_order integer,
    is_active  boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.navigation_items (
    id              text PRIMARY KEY,
    label           text NOT NULL,
    url             text NOT NULL,
    parent_id       text REFERENCES public.navigation_items(id) ON DELETE SET NULL,
    sort_order      integer NOT NULL DEFAULT 0,
    is_active       boolean NOT NULL DEFAULT true,
    open_in_new_tab boolean NOT NULL DEFAULT false,
    created_at      timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_navigation_items_parent_id ON public.navigation_items (parent_id);

CREATE TABLE IF NOT EXISTS public.floating_buttons (
    id         text PRIMARY KEY,
    platform   text NOT NULL,
    label      text NOT NULL,
    url        text,
    icon       text,
    is_active  boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.manasik_materials (
    id            text PRIMARY KEY,
    title         text NOT NULL,
    description   text,
    type          text,
    file_url      text,
    thumbnail_url text,
    sort_order    integer,
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamp with time zone
);

-- ── Tenant ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tenant_sites (
    id               text PRIMARY KEY,
    owner_id         text,
    subdomain        text NOT NULL,
    custom_domain    text,
    site_name        text,
    tagline          text,
    logo_url         text,
    primary_color    text,
    secondary_color  text,
    hero_image_url   text,
    hero_title       text,
    hero_subtitle    text,
    about_text       text,
    whatsapp_number  text,
    phone            text,
    email            text,
    address          text,
    instagram_url    text,
    facebook_url     text,
    is_active        boolean NOT NULL DEFAULT true,
    template         text,
    gsc_verification text,
    seo_default_image text,
    branch_id        text,
    agent_id         text,
    created_at       timestamp with time zone
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_sites_subdomain   ON public.tenant_sites (subdomain);
CREATE INDEX        IF NOT EXISTS idx_tenant_sites_custom_domain ON public.tenant_sites (custom_domain);
CREATE INDEX        IF NOT EXISTS idx_tenant_sites_is_active      ON public.tenant_sites (is_active);

-- ── Agents ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agents (
    id                  text PRIMARY KEY,
    user_id             text,
    branch_id           text,
    name                text NOT NULL,
    phone               text,
    email               text,
    referral_code       text,
    commission_percent  numeric,
    monthly_target      integer,
    is_active           boolean NOT NULL DEFAULT true,
    created_at          timestamp with time zone
);

-- ── Depends on packages / agents / branches ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.wishlists (
    id         text PRIMARY KEY,
    user_id    text NOT NULL,
    package_id text NOT NULL,
    created_at timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_wishlists_package_id ON public.wishlists (package_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id    ON public.wishlists (user_id);

CREATE TABLE IF NOT EXISTS public.package_commissions (
    id                text PRIMARY KEY,
    package_id        text NOT NULL,
    label             text,
    commission_amount numeric NOT NULL DEFAULT 0,
    created_at        timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_package_commissions_package_id ON public.package_commissions (package_id);

CREATE TABLE IF NOT EXISTS public.package_costs (
    id            text PRIMARY KEY,
    package_id    text NOT NULL,
    departure_id  text,
    category      text,
    item_name     text NOT NULL,
    qty           numeric,
    unit          text,
    unit_cost     numeric,
    currency_code text,
    is_per_pax    boolean NOT NULL DEFAULT false,
    is_active     boolean NOT NULL DEFAULT true,
    notes         text,
    sort_order    integer NOT NULL DEFAULT 0,
    created_at    timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_package_costs_package_id   ON public.package_costs (package_id);
CREATE INDEX IF NOT EXISTS idx_package_costs_departure_id ON public.package_costs (departure_id);

CREATE TABLE IF NOT EXISTS public.package_reviews (
    id          text PRIMARY KEY,
    package_id  text NOT NULL,
    user_id     text NOT NULL,
    rating      integer,
    title       text,
    comment     text,
    is_approved boolean NOT NULL DEFAULT false,
    created_at  timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_package_reviews_package_id ON public.package_reviews (package_id);

-- ── Depends on package_departures ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.departure_gallery (
    id           text PRIMARY KEY,
    departure_id text NOT NULL,
    image_url    text NOT NULL,
    title        text,
    description  text,
    sort_order   integer NOT NULL DEFAULT 0,
    created_at   timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_departure_gallery_departure_id ON public.departure_gallery (departure_id);

CREATE TABLE IF NOT EXISTS public.itineraries (
    id           text PRIMARY KEY,
    departure_id text NOT NULL,
    title        text,
    notes        text,
    is_active    boolean NOT NULL DEFAULT true,
    created_at   timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_itineraries_departure_id ON public.itineraries (departure_id);

CREATE TABLE IF NOT EXISTS public.itinerary_days (
    id           text PRIMARY KEY,
    itinerary_id text NOT NULL,
    day_number   integer NOT NULL,
    title        text,
    description  text,
    image_url    text,
    created_at   timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_itinerary_days_itinerary_id ON public.itinerary_days (itinerary_id);

-- ── Depends on bookings ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.booking_payments (
    id               text PRIMARY KEY,
    booking_id       text NOT NULL,
    type             text NOT NULL,
    amount           integer NOT NULL,
    paid_at          timestamp with time zone NOT NULL,
    method           text,
    reference_number text,
    notes            text,
    recorded_by      text,
    is_voided        boolean NOT NULL DEFAULT false,
    created_at       timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_booking_payments_booking_id ON public.booking_payments (booking_id);

CREATE TABLE IF NOT EXISTS public.booking_rooms (
    id         text PRIMARY KEY,
    booking_id text NOT NULL,
    room_type  text NOT NULL,
    price      numeric NOT NULL,
    quantity   integer NOT NULL,
    subtotal   numeric NOT NULL,
    created_at timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_booking_rooms_booking_id ON public.booking_rooms (booking_id);

CREATE TABLE IF NOT EXISTS public.pilgrim_testimonials (
    id          text PRIMARY KEY,
    booking_id  text NOT NULL,
    user_id     text NOT NULL,
    rating      integer,
    message     text,
    is_approved boolean NOT NULL DEFAULT false,
    created_at  timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_pilgrim_testimonials_booking_id ON public.pilgrim_testimonials (booking_id);

CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id               text PRIMARY KEY,
    booking_id       text,
    category         text NOT NULL,
    type             text NOT NULL,
    amount           numeric NOT NULL,
    description      text,
    reference_number text,
    transaction_date timestamp with time zone,
    recorded_by      text,
    created_at       timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_booking_id ON public.financial_transactions (booking_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type        ON public.financial_transactions (type);

CREATE TABLE IF NOT EXISTS public.payment_proof_access_logs (
    id         text PRIMARY KEY,
    user_id    text,
    booking_id text,
    payment_id text,
    context    text,
    created_at timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_payment_proof_logs_booking_id ON public.payment_proof_access_logs (booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_proof_logs_user_id    ON public.payment_proof_access_logs (user_id);

-- ── Depends on booking_pilgrims / payments ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pilgrim_doc_access_logs (
    id           text PRIMARY KEY,
    user_id      text,
    pilgrim_id   text,
    doc_type     text,
    storage_path text,
    context      text,
    created_at   timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_pilgrim_doc_access_logs_user_id ON public.pilgrim_doc_access_logs (user_id);

-- ── Agent sub-tables ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agent_commissions (
    id         text PRIMARY KEY,
    booking_id text NOT NULL,
    agent_id   text NOT NULL,
    amount     integer NOT NULL,
    status     text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.agent_withdrawals (
    id             text PRIMARY KEY,
    agent_id       text NOT NULL,
    amount         integer NOT NULL,
    status         text NOT NULL DEFAULT 'requested',
    bank_name      text,
    bank_account   text,
    account_holder text,
    notes          text,
    admin_notes    text,
    proof_url      text,
    processed_by   text,
    processed_at   timestamp with time zone,
    created_at     timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
    id            text PRIMARY KEY,
    agent_id      text,
    referral_code text,
    ip            text,
    user_agent    text,
    created_at    timestamp with time zone
);

-- ── CRM ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lead_follow_ups (
    id             text PRIMARY KEY,
    lead_id        text NOT NULL,
    follow_up_date timestamp with time zone,
    type           text,
    notes          text,
    is_done        boolean NOT NULL DEFAULT false,
    done_at        timestamp with time zone,
    created_at     timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_lead_id ON public.lead_follow_ups (lead_id);

-- ── Tenant sub-tables ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tenant_site_packages (
    id             text PRIMARY KEY,
    tenant_site_id text NOT NULL,
    package_id     text NOT NULL,
    is_featured    boolean NOT NULL DEFAULT false,
    sort_order     integer,
    created_at     timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_tenant_site_packages_package_id ON public.tenant_site_packages (package_id);
CREATE INDEX IF NOT EXISTS idx_tenant_site_packages_site_id    ON public.tenant_site_packages (tenant_site_id);

CREATE TABLE IF NOT EXISTS public.slug_redirects (
    id             text PRIMARY KEY,
    tenant_site_id text,
    resource_type  text NOT NULL,
    old_slug       text NOT NULL,
    new_slug       text NOT NULL,
    created_at     timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_slug_redirects_old_slug ON public.slug_redirects (old_slug);
CREATE INDEX IF NOT EXISTS idx_slug_redirects_site_id  ON public.slug_redirects (tenant_site_id);

CREATE TABLE IF NOT EXISTS public.template_upgrade_orders (
    id             text PRIMARY KEY,
    tenant_site_id text NOT NULL,
    requested_by   text NOT NULL,
    current_template text,
    target_template  text,
    price          integer,
    status         text NOT NULL DEFAULT 'pending',
    created_at     timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_template_upgrade_orders_site_id ON public.template_upgrade_orders (tenant_site_id);

-- =============================================================================
-- SECTION C: INDEX PENTING YANG MUNGKIN BELUM ADA (untuk tabel existing)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_bookings_status      ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id     ON public.bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_package_id  ON public.bookings (package_id);
CREATE INDEX IF NOT EXISTS idx_payments_status      ON public.payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id  ON public.payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id   ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_site_settings_key    ON public.site_settings (key);

-- Unique index untuk bookings code (kalau belum ada)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_bookings_code') THEN
    CREATE UNIQUE INDEX uq_bookings_code ON public.bookings (booking_code);
  END IF;
END $$;

-- Unique index untuk branches slug (kalau belum ada)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_branches_slug') THEN
    CREATE UNIQUE INDEX uq_branches_slug ON public.branches (slug);
  END IF;
END $$;

-- Unique index untuk user_roles.user_id (kalau belum ada)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_user_roles_user_id') THEN
    CREATE UNIQUE INDEX uq_user_roles_user_id ON public.user_roles (user_id);
  END IF;
END $$;

-- =============================================================================
-- VERIFIKASI: Tampilkan semua tabel yang ada setelah migrasi
-- =============================================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

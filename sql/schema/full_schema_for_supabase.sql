-- =============================================================================
-- ⚠️ LEGACY / HISTORICAL SNAPSHOT — bukan sumber kebenaran schema.
-- Sumber kebenaran saat ini: lib/db/src/schema/*.ts (Drizzle) untuk struktur
-- tabel, dan supabase/migrations/*.sql untuk perubahan yang benar-benar
-- diterapkan (applied) ke Supabase. File ini disimpan sebagai referensi
-- historis saja — lihat sql/schema/README.md sebelum menjalankan ulang.
-- =============================================================================
-- MIGRATION LENGKAP — Semua tabel untuk Supabase
-- =============================================================================
-- CARA MENJALANKAN:
--   Supabase Dashboard → SQL Editor → New Query → paste semua ini → Run
--
-- Script ini AMAN (idempotent):
--   • Pakai IF NOT EXISTS → tidak menghapus data yang sudah ada
--   • Constraints dan index pakai IF NOT EXISTS juga
--   • Urutan: tabel tanpa FK dulu, baru tabel yang bergantung
-- =============================================================================

-- ============ TABEL INDEPENDEN (tidak butuh FK) ============

CREATE TABLE IF NOT EXISTS public.advantages (
    id text NOT NULL,
    title text NOT NULL,
    icon text,
    sort_order integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT advantages_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.airlines (
    id text NOT NULL,
    name text NOT NULL,
    code text,
    logo_url text,
    created_at timestamp with time zone,
    CONSTRAINT airlines_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.airports (
    id text NOT NULL,
    name text NOT NULL,
    code text,
    city text,
    created_at timestamp with time zone,
    CONSTRAINT airports_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id text NOT NULL,
    user_id text,
    action text NOT NULL,
    entity_type text,
    entity_id text,
    metadata jsonb,
    user_agent text,
    created_at timestamp with time zone,
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
    id text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    excerpt text,
    content text,
    image_url text,
    category text,
    author text,
    seo_title text,
    seo_description text,
    is_published boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone,
    created_at timestamp with time zone,
    CONSTRAINT blog_posts_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_blog_posts_slug ON public.blog_posts (slug);

CREATE TABLE IF NOT EXISTS public.branches (
    id text NOT NULL,
    name text NOT NULL,
    slug text,
    address text,
    phone text,
    email text,
    city text,
    region text,
    postal_code text,
    country text,
    latitude double precision,
    longitude double precision,
    opening_hours text,
    image_url text,
    map_url text,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT branches_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_branches_slug ON public.branches (slug);

CREATE TABLE IF NOT EXISTS public.coupons (
    id text NOT NULL,
    code text NOT NULL,
    discount_type text NOT NULL,
    value integer NOT NULL,
    min_purchase integer,
    max_uses integer,
    used_count integer DEFAULT 0 NOT NULL,
    expired_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT coupons_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_coupons_code ON public.coupons (code);

CREATE TABLE IF NOT EXISTS public.currencies (
    id text NOT NULL,
    code text NOT NULL,
    name text,
    symbol text,
    rate_to_idr integer,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT currencies_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_currencies_code ON public.currencies (code);

CREATE TABLE IF NOT EXISTS public.error_logs (
    id text NOT NULL,
    user_id text,
    level text NOT NULL,
    message text NOT NULL,
    stack text,
    url text,
    user_agent text,
    context jsonb,
    created_at timestamp with time zone,
    CONSTRAINT error_logs_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON public.error_logs (level);

CREATE TABLE IF NOT EXISTS public.floating_buttons (
    id text NOT NULL,
    platform text NOT NULL,
    label text NOT NULL,
    url text,
    icon text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT floating_buttons_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.gallery (
    id text NOT NULL,
    image_url text NOT NULL,
    title text,
    description text,
    category text,
    sort_order integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT gallery_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.guide_steps (
    id text NOT NULL,
    step_number integer NOT NULL,
    title text NOT NULL,
    description text,
    icon text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT guide_steps_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.hotels (
    id text NOT NULL,
    name text NOT NULL,
    city text,
    stars integer,
    image_url text,
    description text,
    created_at timestamp with time zone,
    CONSTRAINT hotels_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.integration_secrets (
    id text NOT NULL,
    provider text NOT NULL,
    config jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT integration_secrets_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_integration_secrets_provider ON public.integration_secrets (provider);

CREATE TABLE IF NOT EXISTS public.leads (
    id text NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    source text,
    status text DEFAULT 'new' NOT NULL,
    package_interest text,
    notes text,
    created_at timestamp with time zone,
    CONSTRAINT leads_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads (status);

CREATE TABLE IF NOT EXISTS public.manasik_materials (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    type text,
    file_url text,
    thumbnail_url text,
    sort_order integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT manasik_materials_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.muthawifs (
    id text NOT NULL,
    name text NOT NULL,
    phone text,
    photo_url text,
    bio text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT muthawifs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id text NOT NULL,
    user_id text NOT NULL,
    title text NOT NULL,
    message text,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT notifications_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read ON public.notifications (user_id, is_read);

CREATE TABLE IF NOT EXISTS public.pages (
    id text NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    content text,
    seo_title text,
    seo_description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT pages_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pages_slug ON public.pages (slug);

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    avatar_url text,
    branch_id text,
    totp_enabled boolean DEFAULT false NOT NULL,
    totp_secret text,
    totp_backup_codes text,
    created_at timestamp with time zone,
    CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_email ON public.profiles (email);

CREATE TABLE IF NOT EXISTS public.request_log (
    id text NOT NULL,
    ip text,
    endpoint text NOT NULL,
    user_id text,
    created_at timestamp with time zone,
    CONSTRAINT request_log_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_request_log_created_at ON public.request_log (created_at);
CREATE INDEX IF NOT EXISTS idx_request_log_user_id ON public.request_log (user_id);

CREATE TABLE IF NOT EXISTS public.role_menu_permissions (
    id text DEFAULT gen_random_uuid()::text NOT NULL,
    role text NOT NULL,
    menu_key text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT role_menu_permissions_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_role_menu_permissions ON public.role_menu_permissions (role, menu_key);
CREATE INDEX IF NOT EXISTS idx_rmp_role ON public.role_menu_permissions (role);

CREATE TABLE IF NOT EXISTS public.seo_overrides (
    id text NOT NULL,
    path text NOT NULL,
    title text,
    description text,
    og_image text,
    canonical_override text,
    noindex boolean DEFAULT false NOT NULL,
    keywords text,
    created_at timestamp with time zone,
    CONSTRAINT seo_overrides_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_seo_overrides_path ON public.seo_overrides (path);

CREATE TABLE IF NOT EXISTS public.services (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    icon text,
    sort_order integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT services_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.site_settings (
    id text NOT NULL,
    key text NOT NULL,
    category text,
    value jsonb,
    created_at timestamp with time zone,
    CONSTRAINT site_settings_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON public.site_settings (key);
CREATE INDEX IF NOT EXISTS idx_site_settings_key_category ON public.site_settings (key, category);

CREATE TABLE IF NOT EXISTS public.testimonials (
    id text NOT NULL,
    name text NOT NULL,
    location text,
    package_name text,
    photo_url text,
    rating integer,
    content text,
    travel_date text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer,
    created_at timestamp with time zone,
    CONSTRAINT testimonials_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_roles_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);

-- ============ TABEL LEVEL 1 (bergantung pada tabel di atas) ============

CREATE TABLE IF NOT EXISTS public.agents (
    id text NOT NULL,
    user_id text,
    branch_id text,
    name text NOT NULL,
    phone text,
    email text,
    referral_code text,
    commission_percent numeric,
    monthly_target integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT agents_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.faqs (
    id text NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    scope text,
    package_id text,
    sort_order integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT faqs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id text NOT NULL,
    booking_id text,
    category text NOT NULL,
    type text NOT NULL,
    amount numeric NOT NULL,
    description text,
    reference_number text,
    transaction_date timestamp with time zone,
    recorded_by text,
    created_at timestamp with time zone,
    CONSTRAINT financial_transactions_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON public.financial_transactions (type);

CREATE TABLE IF NOT EXISTS public.lead_follow_ups (
    id text NOT NULL,
    lead_id text NOT NULL,
    follow_up_date timestamp with time zone,
    type text,
    notes text,
    is_done boolean DEFAULT false NOT NULL,
    done_at timestamp with time zone,
    created_at timestamp with time zone,
    CONSTRAINT lead_follow_ups_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_lead_id ON public.lead_follow_ups (lead_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lead_follow_ups_lead_id_leads_id_fk') THEN
    ALTER TABLE public.lead_follow_ups ADD CONSTRAINT lead_follow_ups_lead_id_leads_id_fk
      FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.loyalty_balances (
    id text NOT NULL,
    user_id text NOT NULL,
    total_points integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT loyalty_balances_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_loyalty_balances_user_id ON public.loyalty_balances (user_id);

CREATE TABLE IF NOT EXISTS public.loyalty_points (
    id text NOT NULL,
    user_id text NOT NULL,
    points integer NOT NULL,
    source text,
    description text,
    created_at timestamp with time zone,
    CONSTRAINT loyalty_points_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user_id ON public.loyalty_points (user_id);

CREATE TABLE IF NOT EXISTS public.navigation_items (
    id text NOT NULL,
    label text NOT NULL,
    url text NOT NULL,
    parent_id text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    open_in_new_tab boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT navigation_items_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_navigation_items_parent_id ON public.navigation_items (parent_id);

CREATE TABLE IF NOT EXISTS public.package_categories (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    parent_id text,
    icon text,
    show_extra_hotels boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer,
    created_at timestamp with time zone,
    CONSTRAINT package_categories_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_package_categories_is_active ON public.package_categories (is_active);
CREATE INDEX IF NOT EXISTS idx_package_categories_parent_id ON public.package_categories (parent_id);

CREATE TABLE IF NOT EXISTS public.tenant_sites (
    id text NOT NULL,
    owner_id text,
    subdomain text NOT NULL,
    custom_domain text,
    site_name text,
    tagline text,
    logo_url text,
    primary_color text,
    secondary_color text,
    hero_image_url text,
    hero_title text,
    hero_subtitle text,
    about_text text,
    whatsapp_number text,
    phone text,
    email text,
    address text,
    instagram_url text,
    facebook_url text,
    is_active boolean DEFAULT true NOT NULL,
    template text,
    gsc_verification text,
    seo_default_image text,
    branch_id text,
    agent_id text,
    created_at timestamp with time zone,
    CONSTRAINT tenant_sites_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_sites_subdomain ON public.tenant_sites (subdomain);
CREATE INDEX IF NOT EXISTS idx_tenant_sites_custom_domain ON public.tenant_sites (custom_domain);
CREATE INDEX IF NOT EXISTS idx_tenant_sites_is_active ON public.tenant_sites (is_active);

-- ============ TABEL LEVEL 2 (bergantung pada level 1) ============

CREATE TABLE IF NOT EXISTS public.packages (
    id text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    description text,
    image_url text,
    duration_days integer,
    package_type text,
    category_id text,
    hotel_makkah_id text,
    hotel_madinah_id text,
    airline_id text,
    airport_id text,
    minimum_dp integer,
    dp_deadline_days integer,
    full_deadline_days integer,
    is_active boolean,
    created_at timestamp with time zone,
    CONSTRAINT packages_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_packages_slug ON public.packages (slug);
CREATE INDEX IF NOT EXISTS idx_packages_category_id ON public.packages (category_id);
CREATE INDEX IF NOT EXISTS idx_packages_is_active ON public.packages (is_active);

CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
    id text NOT NULL,
    agent_id text,
    referral_code text,
    ip text,
    user_agent text,
    created_at timestamp with time zone,
    CONSTRAINT affiliate_clicks_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.agent_withdrawals (
    id text NOT NULL,
    agent_id text NOT NULL,
    amount integer NOT NULL,
    status text DEFAULT 'requested' NOT NULL,
    bank_name text,
    bank_account text,
    account_holder text,
    notes text,
    admin_notes text,
    proof_url text,
    processed_by text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone,
    CONSTRAINT agent_withdrawals_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.slug_redirects (
    id text NOT NULL,
    tenant_site_id text,
    resource_type text NOT NULL,
    old_slug text NOT NULL,
    new_slug text NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT slug_redirects_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_slug_redirects_old_slug ON public.slug_redirects (old_slug);
CREATE INDEX IF NOT EXISTS idx_slug_redirects_site_id ON public.slug_redirects (tenant_site_id);

CREATE TABLE IF NOT EXISTS public.template_upgrade_orders (
    id text NOT NULL,
    tenant_site_id text NOT NULL,
    requested_by text NOT NULL,
    current_template text,
    target_template text,
    price integer,
    status text DEFAULT 'pending' NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT template_upgrade_orders_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_template_upgrade_orders_site_id ON public.template_upgrade_orders (tenant_site_id);

-- ============ TABEL LEVEL 3 (bergantung pada packages) ============

CREATE TABLE IF NOT EXISTS public.bookings (
    id text NOT NULL,
    booking_code text NOT NULL,
    user_id text,
    package_id text,
    departure_id text,
    branch_id text,
    agent_id text,
    pic_id text,
    pic_type text,
    status text,
    total_price integer NOT NULL,
    currency text NOT NULL,
    payment_scheme text,
    notes text,
    created_at timestamp with time zone,
    CONSTRAINT bookings_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_code ON public.bookings (booking_code);
CREATE INDEX IF NOT EXISTS idx_bookings_agent_id ON public.bookings (agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_departure_id ON public.bookings (departure_id);
CREATE INDEX IF NOT EXISTS idx_bookings_package_id ON public.bookings (package_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings (user_id);

CREATE TABLE IF NOT EXISTS public.package_commissions (
    id text NOT NULL,
    package_id text NOT NULL,
    label text,
    commission_amount numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT package_commissions_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_package_commissions_package_id ON public.package_commissions (package_id);

CREATE TABLE IF NOT EXISTS public.package_costs (
    id text NOT NULL,
    package_id text NOT NULL,
    departure_id text,
    category text,
    item_name text NOT NULL,
    qty numeric,
    unit text,
    unit_cost numeric,
    currency_code text,
    is_per_pax boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT package_costs_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_package_costs_departure_id ON public.package_costs (departure_id);
CREATE INDEX IF NOT EXISTS idx_package_costs_package_id ON public.package_costs (package_id);

CREATE TABLE IF NOT EXISTS public.package_departures (
    id text NOT NULL,
    package_id text NOT NULL,
    departure_date text NOT NULL,
    return_date text,
    quota integer NOT NULL,
    remaining_quota integer NOT NULL,
    status text,
    muthawif_id text,
    created_at timestamp with time zone,
    CONSTRAINT package_departures_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_departures_package_id ON public.package_departures (package_id);
CREATE INDEX IF NOT EXISTS idx_departures_status ON public.package_departures (status);

CREATE TABLE IF NOT EXISTS public.package_hotels (
    id text NOT NULL,
    package_id text NOT NULL,
    hotel_id text NOT NULL,
    city text,
    label text,
    sort_order integer,
    created_at timestamp with time zone,
    CONSTRAINT package_hotels_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_package_hotels_hotel_id ON public.package_hotels (hotel_id);
CREATE INDEX IF NOT EXISTS idx_package_hotels_package_id ON public.package_hotels (package_id);

CREATE TABLE IF NOT EXISTS public.package_reviews (
    id text NOT NULL,
    package_id text NOT NULL,
    user_id text NOT NULL,
    rating integer,
    title text,
    comment text,
    is_approved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT package_reviews_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_package_reviews_package_id ON public.package_reviews (package_id);

CREATE TABLE IF NOT EXISTS public.tenant_site_packages (
    id text NOT NULL,
    tenant_site_id text NOT NULL,
    package_id text NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    sort_order integer,
    created_at timestamp with time zone,
    CONSTRAINT tenant_site_packages_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_tenant_site_packages_package_id ON public.tenant_site_packages (package_id);
CREATE INDEX IF NOT EXISTS idx_tenant_site_packages_site_id ON public.tenant_site_packages (tenant_site_id);

CREATE TABLE IF NOT EXISTS public.wishlists (
    id text NOT NULL,
    user_id text NOT NULL,
    package_id text NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT wishlists_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_wishlists_package_id ON public.wishlists (package_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON public.wishlists (user_id);

-- ============ TABEL LEVEL 4 (bergantung pada bookings / departures) ============

CREATE TABLE IF NOT EXISTS public.booking_payments (
    id text NOT NULL,
    booking_id text NOT NULL,
    type text NOT NULL,
    amount integer NOT NULL,
    paid_at timestamp with time zone NOT NULL,
    method text,
    reference_number text,
    notes text,
    recorded_by text,
    is_voided boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT booking_payments_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_booking_payments_booking_id ON public.booking_payments (booking_id);

CREATE TABLE IF NOT EXISTS public.booking_pilgrims (
    id text NOT NULL,
    booking_id text NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    gender text,
    nik text,
    birth_date text,
    nationality text,
    passport_number text,
    passport_expiry text,
    room_type text,
    created_at timestamp with time zone,
    CONSTRAINT booking_pilgrims_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_booking_pilgrims_booking_id ON public.booking_pilgrims (booking_id);

CREATE TABLE IF NOT EXISTS public.booking_rooms (
    id text NOT NULL,
    booking_id text NOT NULL,
    room_type text NOT NULL,
    price numeric NOT NULL,
    quantity integer NOT NULL,
    subtotal numeric NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT booking_rooms_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_booking_rooms_booking_id ON public.booking_rooms (booking_id);

CREATE TABLE IF NOT EXISTS public.agent_commissions (
    id text NOT NULL,
    booking_id text NOT NULL,
    agent_id text NOT NULL,
    amount integer NOT NULL,
    status text DEFAULT 'pending' NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT agent_commissions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id text NOT NULL,
    booking_id text NOT NULL,
    sender_id text,
    sender_role text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT chat_messages_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_booking_id ON public.chat_messages (booking_id);

CREATE TABLE IF NOT EXISTS public.contracts (
    id text NOT NULL,
    booking_id text NOT NULL,
    user_id text NOT NULL,
    html_content text,
    signature_data_url text,
    signed_at timestamp with time zone,
    signer_name text,
    created_at timestamp with time zone,
    CONSTRAINT contracts_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_contracts_booking_id ON public.contracts (booking_id);
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON public.contracts (user_id);

CREATE TABLE IF NOT EXISTS public.departure_gallery (
    id text NOT NULL,
    departure_id text NOT NULL,
    image_url text NOT NULL,
    title text,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT departure_gallery_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_departure_gallery_departure_id ON public.departure_gallery (departure_id);

CREATE TABLE IF NOT EXISTS public.departure_prices (
    id text NOT NULL,
    departure_id text NOT NULL,
    room_type text NOT NULL,
    price integer NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT departure_prices_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_departure_prices_departure_id ON public.departure_prices (departure_id);

CREATE TABLE IF NOT EXISTS public.itineraries (
    id text NOT NULL,
    departure_id text NOT NULL,
    title text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT itineraries_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_itineraries_departure_id ON public.itineraries (departure_id);

CREATE TABLE IF NOT EXISTS public.payments (
    id text NOT NULL,
    booking_id text NOT NULL,
    payment_method text,
    amount integer NOT NULL,
    status text DEFAULT 'pending' NOT NULL,
    proof_url text,
    payment_type text,
    paid_at timestamp with time zone,
    created_at timestamp with time zone,
    CONSTRAINT payments_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments (status);

CREATE TABLE IF NOT EXISTS public.payment_gateway_transactions (
    id text NOT NULL,
    booking_id text,
    gateway text NOT NULL,
    order_id text NOT NULL,
    gateway_transaction_id text,
    amount integer NOT NULL,
    payment_method text,
    bank_code text,
    va_number text,
    status text DEFAULT 'pending' NOT NULL,
    customer_name text,
    customer_email text,
    expiry_time timestamp with time zone,
    paid_at timestamp with time zone,
    raw_response text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT payment_gateway_transactions_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_pgt_booking_id ON public.payment_gateway_transactions (booking_id);
CREATE INDEX IF NOT EXISTS idx_pgt_order_id ON public.payment_gateway_transactions (order_id);
CREATE INDEX IF NOT EXISTS idx_pgt_status ON public.payment_gateway_transactions (status);

CREATE TABLE IF NOT EXISTS public.refund_requests (
    id text NOT NULL,
    user_id text NOT NULL,
    booking_id text NOT NULL,
    reason text,
    amount integer,
    bank_name text,
    bank_account text,
    account_holder text,
    status text DEFAULT 'pending' NOT NULL,
    admin_notes text,
    processed_by text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone,
    CONSTRAINT refund_requests_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_refund_requests_booking_id ON public.refund_requests (booking_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_user_id ON public.refund_requests (user_id);

-- ============ TABEL LEVEL 5 ============

CREATE TABLE IF NOT EXISTS public.itinerary_days (
    id text NOT NULL,
    itinerary_id text NOT NULL,
    day_number integer NOT NULL,
    title text,
    description text,
    image_url text,
    created_at timestamp with time zone,
    CONSTRAINT itinerary_days_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_itinerary_days_itinerary_id ON public.itinerary_days (itinerary_id);

CREATE TABLE IF NOT EXISTS public.pilgrim_documents (
    id text NOT NULL,
    pilgrim_id text NOT NULL,
    booking_id text NOT NULL,
    document_type text NOT NULL,
    status text DEFAULT 'pending' NOT NULL,
    file_url text,
    notes text,
    submitted_at timestamp with time zone,
    verified_at timestamp with time zone,
    verified_by text,
    created_at timestamp with time zone,
    CONSTRAINT pilgrim_documents_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_pilgrim_docs_booking_id ON public.pilgrim_documents (booking_id);
CREATE INDEX IF NOT EXISTS idx_pilgrim_docs_pilgrim_id ON public.pilgrim_documents (pilgrim_id);

CREATE TABLE IF NOT EXISTS public.pilgrim_testimonials (
    id text NOT NULL,
    booking_id text NOT NULL,
    user_id text NOT NULL,
    rating integer,
    message text,
    is_approved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone,
    CONSTRAINT pilgrim_testimonials_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_pilgrim_testimonials_booking_id ON public.pilgrim_testimonials (booking_id);

CREATE TABLE IF NOT EXISTS public.payment_proof_access_logs (
    id text NOT NULL,
    user_id text,
    booking_id text,
    payment_id text,
    context text,
    created_at timestamp with time zone,
    CONSTRAINT payment_proof_access_logs_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_payment_proof_logs_booking_id ON public.payment_proof_access_logs (booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_proof_logs_user_id ON public.payment_proof_access_logs (user_id);

CREATE TABLE IF NOT EXISTS public.pilgrim_doc_access_logs (
    id text NOT NULL,
    user_id text,
    pilgrim_id text,
    doc_type text,
    storage_path text,
    context text,
    created_at timestamp with time zone,
    CONSTRAINT pilgrim_doc_access_logs_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_pilgrim_doc_access_logs_user_id ON public.pilgrim_doc_access_logs (user_id);

-- ============ VERIFIKASI AKHIR ============
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

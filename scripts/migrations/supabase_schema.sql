-- Auto-generated schema for UmrohPlus based on existing Supabase types.ts
-- Run this in the Supabase SQL Editor for your project.
create extension if not exists pgcrypto;

create table if not exists public."advantages" (
  "created_at" timestamptz default now(),
  "icon" text,
  "id" uuid primary key default gen_random_uuid(),
  "is_active" boolean,
  "sort_order" numeric,
  "title" text not null
);

create table if not exists public."affiliate_clicks" (
  "agent_id" uuid not null,
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "ip" text,
  "landing_path" text,
  "referral_code" text,
  "user_agent" text
);

create table if not exists public."agent_commissions" (
  "agent_id" uuid not null,
  "amount" numeric not null,
  "booking_id" uuid not null,
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "notes" text,
  "paid_at" timestamptz,
  "status" text not null,
  "updated_at" timestamptz default now()
);

create table if not exists public."agent_withdrawals" (
  "account_holder" text not null,
  "admin_notes" text,
  "agent_id" uuid not null,
  "amount" numeric not null,
  "bank_account" text not null,
  "bank_name" text not null,
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "notes" text,
  "processed_at" timestamptz,
  "processed_by" text,
  "proof_url" text,
  "status" text not null,
  "updated_at" timestamptz default now()
);

create table if not exists public."agents" (
  "branch_id" uuid,
  "commission_percent" numeric,
  "created_at" timestamptz default now(),
  "email" text,
  "id" uuid primary key default gen_random_uuid(),
  "is_active" boolean,
  "monthly_target" numeric,
  "name" text not null,
  "phone" text,
  "referral_code" text,
  "user_id" uuid
);

create table if not exists public."airlines" (
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "logo_url" text,
  "name" text not null
);

create table if not exists public."airports" (
  "city" text,
  "code" text,
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "name" text not null
);

create table if not exists public."audit_logs" (
  "action" text not null,
  "created_at" timestamptz default now(),
  "entity_id" uuid,
  "entity_type" text,
  "id" uuid primary key default gen_random_uuid(),
  "ip" text,
  "metadata" jsonb,
  "user_agent" text,
  "user_id" uuid
);

create table if not exists public."blog_posts" (
  "author" text,
  "category" text,
  "content" text,
  "created_at" timestamptz default now(),
  "excerpt" text,
  "id" uuid primary key default gen_random_uuid(),
  "image_url" text,
  "is_published" boolean,
  "published_at" timestamptz,
  "seo_description" text,
  "seo_title" text,
  "slug" text not null,
  "title" text not null,
  "updated_at" timestamptz default now()
);

create table if not exists public."booking_pilgrims" (
  "birth_date" text,
  "booking_id" uuid,
  "created_at" timestamptz default now(),
  "email" text,
  "gender" text,
  "id" uuid primary key default gen_random_uuid(),
  "name" text not null,
  "nationality" text,
  "nik" text,
  "passport_expiry" text,
  "passport_number" text,
  "phone" text,
  "room_type" text
);

create table if not exists public."booking_rooms" (
  "booking_id" uuid,
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "price" numeric not null,
  "quantity" numeric not null,
  "room_type" text not null,
  "subtotal" numeric not null
);

create table if not exists public."bookings" (
  "agent_id" uuid,
  "booking_code" text not null,
  "branch_id" uuid,
  "created_at" timestamptz default now(),
  "currency" text not null,
  "departure_id" uuid,
  "id" uuid primary key default gen_random_uuid(),
  "notes" text,
  "package_id" uuid,
  "payment_scheme" text,
  "pic_id" uuid,
  "pic_type" text,
  "status" text,
  "total_price" numeric not null,
  "user_id" uuid
);

create table if not exists public."branches" (
  "address" text,
  "city" text,
  "country" text,
  "created_at" timestamptz default now(),
  "description" text,
  "email" text,
  "id" uuid primary key default gen_random_uuid(),
  "image_url" text,
  "is_active" boolean,
  "latitude" numeric,
  "longitude" numeric,
  "map_url" text,
  "name" text not null,
  "opening_hours" text,
  "phone" text,
  "postal_code" text,
  "region" text,
  "slug" text
);

create table if not exists public."chat_messages" (
  "booking_id" uuid not null,
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "is_read" boolean not null,
  "message" text not null,
  "sender_id" uuid not null,
  "sender_role" text not null
);

create table if not exists public."check_ins" (
  "booking_id" uuid,
  "checked_in_at" timestamptz not null,
  "checked_in_by" text,
  "departure_id" uuid,
  "id" uuid primary key default gen_random_uuid(),
  "location" text,
  "notes" text,
  "pilgrim_id" uuid not null
);

create table if not exists public."contracts" (
  "booking_id" uuid not null,
  "created_at" timestamptz default now(),
  "html_content" text not null,
  "id" uuid primary key default gen_random_uuid(),
  "signature_data_url" text,
  "signed_at" timestamptz,
  "signer_ip" text,
  "signer_name" text,
  "updated_at" timestamptz default now(),
  "user_id" uuid not null
);

create table if not exists public."coupons" (
  "code" text not null,
  "created_at" timestamptz default now(),
  "discount_type" text not null,
  "expired_at" timestamptz,
  "id" uuid primary key default gen_random_uuid(),
  "is_active" boolean,
  "max_uses" numeric,
  "min_purchase" numeric,
  "used_count" numeric,
  "value" numeric not null
);

create table if not exists public."currencies" (
  "code" text not null,
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "is_active" boolean not null,
  "is_default" boolean not null,
  "name" text not null,
  "rate_to_idr" numeric not null,
  "symbol" text not null,
  "updated_at" timestamptz default now()
);

create table if not exists public."departure_gallery" (
  "caption" text,
  "created_at" timestamptz default now(),
  "departure_id" uuid not null,
  "id" uuid primary key default gen_random_uuid(),
  "image_url" text not null,
  "sort_order" numeric
);

create table if not exists public."departure_prices" (
  "created_at" timestamptz default now(),
  "departure_id" uuid,
  "id" uuid primary key default gen_random_uuid(),
  "price" numeric not null,
  "room_type" text not null
);

create table if not exists public."error_logs" (
  "context" jsonb,
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "level" text not null,
  "message" text not null,
  "stack" text,
  "url" text,
  "user_agent" text,
  "user_id" uuid
);

create table if not exists public."faqs" (
  "answer" text not null,
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "is_active" boolean,
  "package_id" uuid,
  "question" text not null,
  "scope" text not null,
  "sort_order" numeric
);

create table if not exists public."financial_transactions" (
  "amount" numeric not null,
  "booking_id" uuid,
  "category" text not null,
  "created_at" timestamptz default now(),
  "created_by" text,
  "description" text,
  "id" uuid primary key default gen_random_uuid(),
  "reference_number" text,
  "transaction_date" text not null,
  "type" text not null,
  "updated_at" timestamptz default now()
);

create table if not exists public."flight_details" (
  "airline" text,
  "arrival_airport" text,
  "arrival_time" text,
  "created_at" timestamptz default now(),
  "departure_airport" text,
  "departure_id" uuid not null,
  "departure_time" text,
  "flight_number" text,
  "flight_type" text not null,
  "gate" text,
  "id" uuid primary key default gen_random_uuid(),
  "notes" text,
  "terminal" text,
  "updated_at" timestamptz default now()
);

create table if not exists public."floating_buttons" (
  "created_at" timestamptz default now(),
  "icon" text,
  "id" uuid primary key default gen_random_uuid(),
  "is_active" boolean,
  "label" text not null,
  "platform" text not null,
  "sort_order" numeric,
  "url" text
);

create table if not exists public."gallery" (
  "category" text,
  "created_at" timestamptz default now(),
  "description" text,
  "id" uuid primary key default gen_random_uuid(),
  "image_url" text not null,
  "is_active" boolean,
  "sort_order" numeric,
  "title" text
);

create table if not exists public."guide_steps" (
  "created_at" timestamptz default now(),
  "description" text,
  "icon" text not null,
  "id" uuid primary key default gen_random_uuid(),
  "is_active" boolean,
  "step_number" numeric not null,
  "title" text not null
);

create table if not exists public."hotels" (
  "city" text,
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "name" text not null,
  "star" numeric
);

create table if not exists public."installment_schedules" (
  "amount" numeric not null,
  "booking_id" uuid not null,
  "created_at" timestamptz default now(),
  "due_date" timestamptz not null,
  "id" uuid primary key default gen_random_uuid(),
  "installment_number" numeric not null,
  "notes" text,
  "paid_at" timestamptz,
  "payment_id" uuid,
  "status" text not null,
  "updated_at" timestamptz default now()
);

create table if not exists public."integration_secrets" (
  "config" jsonb not null,
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "is_active" boolean not null,
  "notes" text,
  "provider" text not null,
  "updated_at" timestamptz default now()
);

create table if not exists public."itineraries" (
  "created_at" timestamptz default now(),
  "departure_id" uuid,
  "id" uuid primary key default gen_random_uuid(),
  "is_active" boolean,
  "notes" text,
  "title" text
);

create table if not exists public."itinerary_days" (
  "created_at" timestamptz default now(),
  "day_number" numeric not null,
  "description" text,
  "id" uuid primary key default gen_random_uuid(),
  "image_url" text,
  "itinerary_id" uuid,
  "title" text
);

create table if not exists public."lead_follow_ups" (
  "created_at" timestamptz default now(),
  "created_by" text,
  "done_at" timestamptz,
  "follow_up_date" text not null,
  "id" uuid primary key default gen_random_uuid(),
  "is_done" boolean,
  "lead_id" uuid not null,
  "notes" text,
  "type" text not null
);

create table if not exists public."leads" (
  "assigned_to" text,
  "created_at" timestamptz default now(),
  "email" text,
  "id" uuid primary key default gen_random_uuid(),
  "name" text not null,
  "notes" text,
  "package_interest" text,
  "phone" text,
  "source" text,
  "status" text not null,
  "updated_at" timestamptz default now()
);

create table if not exists public."loyalty_points" (
  "created_at" timestamptz default now(),
  "description" text,
  "id" uuid primary key default gen_random_uuid(),
  "points" numeric not null,
  "reference_id" uuid,
  "source" text not null,
  "user_id" uuid not null
);

create table if not exists public."manasik_materials" (
  "created_at" timestamptz default now(),
  "description" text,
  "file_url" text,
  "id" uuid primary key default gen_random_uuid(),
  "is_active" boolean,
  "package_id" uuid,
  "sort_order" numeric,
  "thumbnail_url" text,
  "title" text not null,
  "type" text not null
);

create table if not exists public."muthawifs" (
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "name" text not null,
  "phone" text,
  "photo_url" text
);

create table if not exists public."navigation_items" (
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "is_active" boolean,
  "label" text not null,
  "open_in_new_tab" boolean,
  "parent_id" uuid,
  "sort_order" numeric,
  "url" text not null
);

create table if not exists public."notifications" (
  "booking_id" uuid,
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "is_read" boolean,
  "message" text not null,
  "title" text not null,
  "type" text not null,
  "user_id" uuid not null
);

create table if not exists public."package_categories" (
  "created_at" timestamptz default now(),
  "description" text,
  "id" uuid primary key default gen_random_uuid(),
  "is_active" boolean,
  "name" text not null,
  "parent_id" uuid,
  "show_extra_hotels" boolean,
  "sort_order" numeric
);

create table if not exists public."package_commissions" (
  "commission_amount" numeric not null,
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "package_id" uuid not null,
  "pic_type" text not null
);

create table if not exists public."package_costs" (
  "category" text not null,
  "created_at" timestamptz default now(),
  "currency_code" text not null,
  "departure_id" uuid,
  "id" uuid primary key default gen_random_uuid(),
  "is_active" boolean not null,
  "is_per_pax" boolean not null,
  "item_name" text not null,
  "notes" text,
  "package_id" uuid not null,
  "qty" numeric not null,
  "sort_order" numeric,
  "unit" text,
  "unit_cost" numeric not null,
  "updated_at" timestamptz default now()
);

create table if not exists public."package_departures" (
  "created_at" timestamptz default now(),
  "departure_date" timestamptz not null,
  "id" uuid primary key default gen_random_uuid(),
  "muthawif_id" uuid,
  "package_id" uuid,
  "quota" numeric not null,
  "remaining_quota" numeric not null,
  "return_date" timestamptz,
  "status" text
);

create table if not exists public."package_hotels" (
  "created_at" timestamptz default now(),
  "hotel_id" uuid not null,
  "id" uuid primary key default gen_random_uuid(),
  "label" text,
  "package_id" uuid not null,
  "sort_order" numeric
);

create table if not exists public."package_reviews" (
  "booking_id" uuid,
  "comment" text,
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "is_approved" boolean not null,
  "package_id" uuid not null,
  "rating" numeric not null,
  "title" text,
  "updated_at" timestamptz default now(),
  "user_id" uuid not null
);

create table if not exists public."packages" (
  "airline_id" uuid,
  "airport_id" uuid,
  "category_id" uuid,
  "created_at" timestamptz default now(),
  "description" text,
  "dp_deadline_days" numeric,
  "duration_days" numeric,
  "full_deadline_days" numeric,
  "hotel_madinah_id" uuid,
  "hotel_makkah_id" uuid,
  "id" uuid primary key default gen_random_uuid(),
  "image_url" text,
  "is_active" boolean,
  "minimum_dp" numeric,
  "package_type" text,
  "slug" text not null,
  "title" text not null
);

create table if not exists public."pages" (
  "content" text,
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "is_active" boolean,
  "seo_description" text,
  "seo_title" text,
  "slug" text not null,
  "title" text
);

create table if not exists public."payment_gateway_transactions" (
  "amount" numeric not null,
  "bank_code" text,
  "booking_id" uuid,
  "callback_data" jsonb,
  "created_at" timestamptz default now(),
  "created_by" text,
  "expiry_time" text,
  "gateway" text not null,
  "gateway_transaction_id" uuid,
  "id" uuid primary key default gen_random_uuid(),
  "paid_at" timestamptz,
  "payment_id" uuid,
  "payment_method" text,
  "status" text not null,
  "updated_at" timestamptz default now(),
  "va_number" text
);

create table if not exists public."payment_proof_access_logs" (
  "context" text,
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "ip" text,
  "proof_path" text not null,
  "user_agent" text,
  "user_id" uuid
);

create table if not exists public."payments" (
  "amount" numeric not null,
  "booking_id" uuid,
  "created_at" timestamptz default now(),
  "deadline" text,
  "id" uuid primary key default gen_random_uuid(),
  "paid_at" timestamptz,
  "payment_method" text,
  "payment_type" text,
  "proof_url" text,
  "status" text,
  "verified_at" timestamptz,
  "verified_by" text
);

create table if not exists public."pilgrim_doc_access_logs" (
  "context" text,
  "created_at" timestamptz default now(),
  "doc_type" text,
  "id" uuid primary key default gen_random_uuid(),
  "ip" text,
  "pilgrim_id" uuid,
  "storage_path" text not null,
  "user_agent" text,
  "user_id" uuid
);

create table if not exists public."pilgrim_documents" (
  "created_at" timestamptz default now(),
  "doc_type" text not null,
  "expiry_date" text,
  "file_name" text,
  "file_url" text,
  "id" uuid primary key default gen_random_uuid(),
  "notes" text,
  "pilgrim_id" uuid not null,
  "status" text not null,
  "updated_at" timestamptz default now(),
  "verified_at" timestamptz,
  "verified_by" text
);

create table if not exists public."pilgrim_testimonials" (
  "booking_id" uuid not null,
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "is_published" boolean not null,
  "message" text,
  "photo_url" text,
  "rating" numeric not null,
  "updated_at" timestamptz default now(),
  "user_id" uuid not null
);

create table if not exists public."profiles" (
  "avatar_url" text,
  "branch_id" uuid,
  "created_at" timestamptz default now(),
  "email" text not null,
  "id" uuid primary key default gen_random_uuid(),
  "name" text not null,
  "phone" text,
  "totp_backup_codes" text,
  "totp_enabled" boolean not null,
  "totp_secret" text
);

create table if not exists public."refund_requests" (
  "account_holder" text,
  "admin_notes" text,
  "amount" numeric not null,
  "bank_account" text,
  "bank_name" text,
  "booking_id" uuid not null,
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "processed_at" timestamptz,
  "processed_by" text,
  "reason" text not null,
  "status" text not null,
  "updated_at" timestamptz default now(),
  "user_id" uuid not null
);

create table if not exists public."request_log" (
  "created_at" timestamptz default now(),
  "endpoint" text not null,
  "id" uuid primary key default gen_random_uuid(),
  "ip" text not null,
  "user_id" uuid
);

create table if not exists public."sections" (
  "created_at" timestamptz default now(),
  "data" jsonb,
  "id" uuid primary key default gen_random_uuid(),
  "is_active" boolean,
  "page_slug" text,
  "section_type" text,
  "sort_order" numeric
);

create table if not exists public."seo_audit_results" (
  "created_at" timestamptz default now(),
  "details" jsonb,
  "id" uuid primary key default gen_random_uuid(),
  "issue" text not null,
  "path" text not null,
  "severity" text not null
);

create table if not exists public."seo_overrides" (
  "canonical_override" text,
  "created_at" timestamptz default now(),
  "description" text,
  "id" uuid primary key default gen_random_uuid(),
  "keywords" text,
  "noindex" boolean not null,
  "og_image" text,
  "path" text not null,
  "title" text,
  "updated_at" timestamptz default now()
);

create table if not exists public."services" (
  "created_at" timestamptz default now(),
  "description" text,
  "icon" text not null,
  "id" uuid primary key default gen_random_uuid(),
  "is_active" boolean,
  "sort_order" numeric,
  "title" text not null
);

create table if not exists public."settings" (
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "key" text not null,
  "value" text
);

create table if not exists public."site_settings" (
  "category" text not null,
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "key" text not null,
  "updated_at" timestamptz default now(),
  "value" jsonb
);

create table if not exists public."slug_redirects" (
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "new_slug" text not null,
  "old_slug" text not null,
  "resource_type" text not null,
  "tenant_site_id" uuid
);

create table if not exists public."template_pricing" (
  "created_at" timestamptz default now(),
  "description" text,
  "id" uuid primary key default gen_random_uuid(),
  "is_active" boolean,
  "price" numeric not null,
  "template_name" text not null,
  "updated_at" timestamptz default now()
);

create table if not exists public."template_upgrade_orders" (
  "admin_notes" text,
  "confirmed_at" timestamptz,
  "confirmed_by" text,
  "created_at" timestamptz default now(),
  "current_template" text not null,
  "id" uuid primary key default gen_random_uuid(),
  "notes" text,
  "price" numeric not null,
  "proof_url" text,
  "requested_by" text not null,
  "status" text not null,
  "target_template" text not null,
  "tenant_site_id" uuid not null,
  "updated_at" timestamptz default now()
);

create table if not exists public."tenant_site_packages" (
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "is_featured" boolean,
  "package_id" uuid not null,
  "sort_order" numeric,
  "tenant_site_id" uuid not null
);

create table if not exists public."tenant_sites" (
  "about_text" text,
  "address" text,
  "agent_id" uuid,
  "branch_id" uuid,
  "created_at" timestamptz default now(),
  "custom_domain" text,
  "email" text,
  "enabled_modules" jsonb,
  "facebook_url" text,
  "gsc_verification" text,
  "hero_image_url" text,
  "hero_subtitle" text,
  "hero_title" text,
  "id" uuid primary key default gen_random_uuid(),
  "instagram_url" text,
  "is_active" boolean,
  "logo_url" text,
  "owner_id" uuid not null,
  "phone" text,
  "primary_color" text,
  "secondary_color" text,
  "seo_default_image" text,
  "site_name" text not null,
  "subdomain" text not null,
  "tagline" text,
  "template" text,
  "updated_at" timestamptz default now(),
  "whatsapp_number" text
);

create table if not exists public."testimonials" (
  "content" text not null,
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "is_active" boolean,
  "location" text,
  "name" text not null,
  "package_name" text,
  "photo_url" text,
  "rating" numeric,
  "sort_order" numeric,
  "travel_date" text
);

create table if not exists public."user_roles" (
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "role" text not null,
  "user_id" uuid not null
);

create table if not exists public."wishlists" (
  "created_at" timestamptz default now(),
  "id" uuid primary key default gen_random_uuid(),
  "package_id" uuid not null,
  "user_id" uuid not null
);

-- Enable RLS with permissive policies (tighten later for production)
alter table public."advantages" enable row level security;
alter table public."affiliate_clicks" enable row level security;
alter table public."agent_commissions" enable row level security;
alter table public."agent_withdrawals" enable row level security;
alter table public."agents" enable row level security;
alter table public."airlines" enable row level security;
alter table public."airports" enable row level security;
alter table public."audit_logs" enable row level security;
alter table public."blog_posts" enable row level security;
alter table public."booking_pilgrims" enable row level security;
alter table public."booking_rooms" enable row level security;
alter table public."bookings" enable row level security;
alter table public."branches" enable row level security;
alter table public."chat_messages" enable row level security;
alter table public."check_ins" enable row level security;
alter table public."contracts" enable row level security;
alter table public."coupons" enable row level security;
alter table public."currencies" enable row level security;
alter table public."departure_gallery" enable row level security;
alter table public."departure_prices" enable row level security;
alter table public."error_logs" enable row level security;
alter table public."faqs" enable row level security;
alter table public."financial_transactions" enable row level security;
alter table public."flight_details" enable row level security;
alter table public."floating_buttons" enable row level security;
alter table public."gallery" enable row level security;
alter table public."guide_steps" enable row level security;
alter table public."hotels" enable row level security;
alter table public."installment_schedules" enable row level security;
alter table public."integration_secrets" enable row level security;
alter table public."itineraries" enable row level security;
alter table public."itinerary_days" enable row level security;
alter table public."lead_follow_ups" enable row level security;
alter table public."leads" enable row level security;
alter table public."loyalty_points" enable row level security;
alter table public."manasik_materials" enable row level security;
alter table public."muthawifs" enable row level security;
alter table public."navigation_items" enable row level security;
alter table public."notifications" enable row level security;
alter table public."package_categories" enable row level security;
alter table public."package_commissions" enable row level security;
alter table public."package_costs" enable row level security;
alter table public."package_departures" enable row level security;
alter table public."package_hotels" enable row level security;
alter table public."package_reviews" enable row level security;
alter table public."packages" enable row level security;
alter table public."pages" enable row level security;
alter table public."payment_gateway_transactions" enable row level security;
alter table public."payment_proof_access_logs" enable row level security;
alter table public."payments" enable row level security;
alter table public."pilgrim_doc_access_logs" enable row level security;
alter table public."pilgrim_documents" enable row level security;
alter table public."pilgrim_testimonials" enable row level security;
alter table public."profiles" enable row level security;
alter table public."refund_requests" enable row level security;
alter table public."request_log" enable row level security;
alter table public."sections" enable row level security;
alter table public."seo_audit_results" enable row level security;
alter table public."seo_overrides" enable row level security;
alter table public."services" enable row level security;
alter table public."settings" enable row level security;
alter table public."site_settings" enable row level security;
alter table public."slug_redirects" enable row level security;
alter table public."template_pricing" enable row level security;
alter table public."template_upgrade_orders" enable row level security;
alter table public."tenant_site_packages" enable row level security;
alter table public."tenant_sites" enable row level security;
alter table public."testimonials" enable row level security;
alter table public."user_roles" enable row level security;
alter table public."wishlists" enable row level security;

drop policy if exists "public_all_advantages" on public."advantages";
create policy "public_all_advantages" on public."advantages" for all using (true) with check (true);

drop policy if exists "public_all_affiliate_clicks" on public."affiliate_clicks";
create policy "public_all_affiliate_clicks" on public."affiliate_clicks" for all using (true) with check (true);

drop policy if exists "public_all_agent_commissions" on public."agent_commissions";
create policy "public_all_agent_commissions" on public."agent_commissions" for all using (true) with check (true);

drop policy if exists "public_all_agent_withdrawals" on public."agent_withdrawals";
create policy "public_all_agent_withdrawals" on public."agent_withdrawals" for all using (true) with check (true);

drop policy if exists "public_all_agents" on public."agents";
create policy "public_all_agents" on public."agents" for all using (true) with check (true);

drop policy if exists "public_all_airlines" on public."airlines";
create policy "public_all_airlines" on public."airlines" for all using (true) with check (true);

drop policy if exists "public_all_airports" on public."airports";
create policy "public_all_airports" on public."airports" for all using (true) with check (true);

drop policy if exists "public_all_audit_logs" on public."audit_logs";
create policy "public_all_audit_logs" on public."audit_logs" for all using (true) with check (true);

drop policy if exists "public_all_blog_posts" on public."blog_posts";
create policy "public_all_blog_posts" on public."blog_posts" for all using (true) with check (true);

drop policy if exists "public_all_booking_pilgrims" on public."booking_pilgrims";
create policy "public_all_booking_pilgrims" on public."booking_pilgrims" for all using (true) with check (true);

drop policy if exists "public_all_booking_rooms" on public."booking_rooms";
create policy "public_all_booking_rooms" on public."booking_rooms" for all using (true) with check (true);

drop policy if exists "public_all_bookings" on public."bookings";
create policy "public_all_bookings" on public."bookings" for all using (true) with check (true);

drop policy if exists "public_all_branches" on public."branches";
create policy "public_all_branches" on public."branches" for all using (true) with check (true);

drop policy if exists "public_all_chat_messages" on public."chat_messages";
create policy "public_all_chat_messages" on public."chat_messages" for all using (true) with check (true);

drop policy if exists "public_all_check_ins" on public."check_ins";
create policy "public_all_check_ins" on public."check_ins" for all using (true) with check (true);

drop policy if exists "public_all_contracts" on public."contracts";
create policy "public_all_contracts" on public."contracts" for all using (true) with check (true);

drop policy if exists "public_all_coupons" on public."coupons";
create policy "public_all_coupons" on public."coupons" for all using (true) with check (true);

drop policy if exists "public_all_currencies" on public."currencies";
create policy "public_all_currencies" on public."currencies" for all using (true) with check (true);

drop policy if exists "public_all_departure_gallery" on public."departure_gallery";
create policy "public_all_departure_gallery" on public."departure_gallery" for all using (true) with check (true);

drop policy if exists "public_all_departure_prices" on public."departure_prices";
create policy "public_all_departure_prices" on public."departure_prices" for all using (true) with check (true);

drop policy if exists "public_all_error_logs" on public."error_logs";
create policy "public_all_error_logs" on public."error_logs" for all using (true) with check (true);

drop policy if exists "public_all_faqs" on public."faqs";
create policy "public_all_faqs" on public."faqs" for all using (true) with check (true);

drop policy if exists "public_all_financial_transactions" on public."financial_transactions";
create policy "public_all_financial_transactions" on public."financial_transactions" for all using (true) with check (true);

drop policy if exists "public_all_flight_details" on public."flight_details";
create policy "public_all_flight_details" on public."flight_details" for all using (true) with check (true);

drop policy if exists "public_all_floating_buttons" on public."floating_buttons";
create policy "public_all_floating_buttons" on public."floating_buttons" for all using (true) with check (true);

drop policy if exists "public_all_gallery" on public."gallery";
create policy "public_all_gallery" on public."gallery" for all using (true) with check (true);

drop policy if exists "public_all_guide_steps" on public."guide_steps";
create policy "public_all_guide_steps" on public."guide_steps" for all using (true) with check (true);

drop policy if exists "public_all_hotels" on public."hotels";
create policy "public_all_hotels" on public."hotels" for all using (true) with check (true);

drop policy if exists "public_all_installment_schedules" on public."installment_schedules";
create policy "public_all_installment_schedules" on public."installment_schedules" for all using (true) with check (true);

drop policy if exists "public_all_integration_secrets" on public."integration_secrets";
create policy "public_all_integration_secrets" on public."integration_secrets" for all using (true) with check (true);

drop policy if exists "public_all_itineraries" on public."itineraries";
create policy "public_all_itineraries" on public."itineraries" for all using (true) with check (true);

drop policy if exists "public_all_itinerary_days" on public."itinerary_days";
create policy "public_all_itinerary_days" on public."itinerary_days" for all using (true) with check (true);

drop policy if exists "public_all_lead_follow_ups" on public."lead_follow_ups";
create policy "public_all_lead_follow_ups" on public."lead_follow_ups" for all using (true) with check (true);

drop policy if exists "public_all_leads" on public."leads";
create policy "public_all_leads" on public."leads" for all using (true) with check (true);

drop policy if exists "public_all_loyalty_points" on public."loyalty_points";
create policy "public_all_loyalty_points" on public."loyalty_points" for all using (true) with check (true);

drop policy if exists "public_all_manasik_materials" on public."manasik_materials";
create policy "public_all_manasik_materials" on public."manasik_materials" for all using (true) with check (true);

drop policy if exists "public_all_muthawifs" on public."muthawifs";
create policy "public_all_muthawifs" on public."muthawifs" for all using (true) with check (true);

drop policy if exists "public_all_navigation_items" on public."navigation_items";
create policy "public_all_navigation_items" on public."navigation_items" for all using (true) with check (true);

drop policy if exists "public_all_notifications" on public."notifications";
create policy "public_all_notifications" on public."notifications" for all using (true) with check (true);

drop policy if exists "public_all_package_categories" on public."package_categories";
create policy "public_all_package_categories" on public."package_categories" for all using (true) with check (true);

drop policy if exists "public_all_package_commissions" on public."package_commissions";
create policy "public_all_package_commissions" on public."package_commissions" for all using (true) with check (true);

drop policy if exists "public_all_package_costs" on public."package_costs";
create policy "public_all_package_costs" on public."package_costs" for all using (true) with check (true);

drop policy if exists "public_all_package_departures" on public."package_departures";
create policy "public_all_package_departures" on public."package_departures" for all using (true) with check (true);

drop policy if exists "public_all_package_hotels" on public."package_hotels";
create policy "public_all_package_hotels" on public."package_hotels" for all using (true) with check (true);

drop policy if exists "public_all_package_reviews" on public."package_reviews";
create policy "public_all_package_reviews" on public."package_reviews" for all using (true) with check (true);

drop policy if exists "public_all_packages" on public."packages";
create policy "public_all_packages" on public."packages" for all using (true) with check (true);

drop policy if exists "public_all_pages" on public."pages";
create policy "public_all_pages" on public."pages" for all using (true) with check (true);

drop policy if exists "public_all_payment_gateway_transactions" on public."payment_gateway_transactions";
create policy "public_all_payment_gateway_transactions" on public."payment_gateway_transactions" for all using (true) with check (true);

drop policy if exists "public_all_payment_proof_access_logs" on public."payment_proof_access_logs";
create policy "public_all_payment_proof_access_logs" on public."payment_proof_access_logs" for all using (true) with check (true);

drop policy if exists "public_all_payments" on public."payments";
create policy "public_all_payments" on public."payments" for all using (true) with check (true);

drop policy if exists "public_all_pilgrim_doc_access_logs" on public."pilgrim_doc_access_logs";
create policy "public_all_pilgrim_doc_access_logs" on public."pilgrim_doc_access_logs" for all using (true) with check (true);

drop policy if exists "public_all_pilgrim_documents" on public."pilgrim_documents";
create policy "public_all_pilgrim_documents" on public."pilgrim_documents" for all using (true) with check (true);

drop policy if exists "public_all_pilgrim_testimonials" on public."pilgrim_testimonials";
create policy "public_all_pilgrim_testimonials" on public."pilgrim_testimonials" for all using (true) with check (true);

drop policy if exists "public_all_profiles" on public."profiles";
create policy "public_all_profiles" on public."profiles" for all using (true) with check (true);

drop policy if exists "public_all_refund_requests" on public."refund_requests";
create policy "public_all_refund_requests" on public."refund_requests" for all using (true) with check (true);

drop policy if exists "public_all_request_log" on public."request_log";
create policy "public_all_request_log" on public."request_log" for all using (true) with check (true);

drop policy if exists "public_all_sections" on public."sections";
create policy "public_all_sections" on public."sections" for all using (true) with check (true);

drop policy if exists "public_all_seo_audit_results" on public."seo_audit_results";
create policy "public_all_seo_audit_results" on public."seo_audit_results" for all using (true) with check (true);

drop policy if exists "public_all_seo_overrides" on public."seo_overrides";
create policy "public_all_seo_overrides" on public."seo_overrides" for all using (true) with check (true);

drop policy if exists "public_all_services" on public."services";
create policy "public_all_services" on public."services" for all using (true) with check (true);

drop policy if exists "public_all_settings" on public."settings";
create policy "public_all_settings" on public."settings" for all using (true) with check (true);

drop policy if exists "public_all_site_settings" on public."site_settings";
create policy "public_all_site_settings" on public."site_settings" for all using (true) with check (true);

drop policy if exists "public_all_slug_redirects" on public."slug_redirects";
create policy "public_all_slug_redirects" on public."slug_redirects" for all using (true) with check (true);

drop policy if exists "public_all_template_pricing" on public."template_pricing";
create policy "public_all_template_pricing" on public."template_pricing" for all using (true) with check (true);

drop policy if exists "public_all_template_upgrade_orders" on public."template_upgrade_orders";
create policy "public_all_template_upgrade_orders" on public."template_upgrade_orders" for all using (true) with check (true);

drop policy if exists "public_all_tenant_site_packages" on public."tenant_site_packages";
create policy "public_all_tenant_site_packages" on public."tenant_site_packages" for all using (true) with check (true);

drop policy if exists "public_all_tenant_sites" on public."tenant_sites";
create policy "public_all_tenant_sites" on public."tenant_sites" for all using (true) with check (true);

drop policy if exists "public_all_testimonials" on public."testimonials";
create policy "public_all_testimonials" on public."testimonials" for all using (true) with check (true);

drop policy if exists "public_all_user_roles" on public."user_roles";
create policy "public_all_user_roles" on public."user_roles" for all using (true) with check (true);

drop policy if exists "public_all_wishlists" on public."wishlists";
create policy "public_all_wishlists" on public."wishlists" for all using (true) with check (true);

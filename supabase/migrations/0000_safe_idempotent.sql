CREATE TABLE IF NOT EXISTS "departure_gallery" (
"id" text PRIMARY KEY NOT NULL,
"departure_id" text NOT NULL,
"image_url" text NOT NULL,
"caption" text,
"sort_order" integer DEFAULT 0 NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "departure_prices" (
"id" text PRIMARY KEY NOT NULL,
"departure_id" text NOT NULL,
"room_type" text NOT NULL,
"price" integer NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "package_commissions" (
"id" text PRIMARY KEY NOT NULL,
"package_id" text NOT NULL,
"label" text,
"commission_amount" numeric DEFAULT '0' NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "package_costs" (
"id" text PRIMARY KEY NOT NULL,
"package_id" text NOT NULL,
"departure_id" text,
"category" text,
"item_name" text NOT NULL,
"qty" numeric,
"unit" text,
"unit_cost" numeric,
"currency_code" text,
"is_per_pax" boolean DEFAULT false NOT NULL,
"is_active" boolean DEFAULT true NOT NULL,
"notes" text,
"sort_order" integer DEFAULT 0 NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "package_departures" (
"id" text PRIMARY KEY NOT NULL,
"package_id" text NOT NULL,
"departure_date" text NOT NULL,
"return_date" text,
"quota" integer NOT NULL,
"remaining_quota" integer NOT NULL,
"status" text,
"muthawif_id" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "packages" (
"id" text PRIMARY KEY NOT NULL,
"title" text NOT NULL,
"slug" text NOT NULL,
"description" text,
"image_url" text,
"duration_days" integer,
"package_type" text,
"category_id" text,
"hotel_makkah_id" text,
"hotel_madinah_id" text,
"airline_id" text,
"airport_id" text,
"minimum_dp" integer,
"dp_deadline_days" integer,
"full_deadline_days" integer,
"is_active" boolean,
"required_doc_types" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "booking_payments" (
"id" text PRIMARY KEY NOT NULL,
"booking_id" text NOT NULL,
"type" text NOT NULL,
"amount" integer NOT NULL,
"paid_at" timestamp with time zone NOT NULL,
"method" text,
"reference_number" text,
"notes" text,
"recorded_by" text,
"is_voided" boolean DEFAULT false NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "booking_pilgrims" (
"id" text PRIMARY KEY NOT NULL,
"booking_id" text NOT NULL,
"name" text NOT NULL,
"phone" text,
"email" text,
"gender" text,
"nik" text,
"birth_date" text,
"nationality" text,
"passport_number" text,
"passport_expiry" text,
"room_type" text,
"room_number" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "booking_rooms" (
"id" text PRIMARY KEY NOT NULL,
"booking_id" text NOT NULL,
"room_type" text NOT NULL,
"price" numeric NOT NULL,
"quantity" integer NOT NULL,
"subtotal" numeric NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "bookings" (
"id" text PRIMARY KEY NOT NULL,
"booking_code" text NOT NULL,
"user_id" text,
"package_id" text,
"departure_id" text,
"branch_id" text,
"agent_id" text,
"pic_id" text,
"pic_type" text,
"status" text,
"total_price" integer NOT NULL,
"currency" text NOT NULL,
"payment_scheme" text,
"notes" text,
"is_group_booking" boolean DEFAULT false NOT NULL,
"group_name" text,
"pic_name" text,
"pic_phone" text,
"pic_email" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "check_ins" (
"id" text PRIMARY KEY NOT NULL,
"pilgrim_id" text NOT NULL,
"booking_id" text,
"departure_id" text,
"location" text,
"notes" text,
"checked_in_by" text,
"checked_in_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "pilgrim_documents" (
"id" text PRIMARY KEY NOT NULL,
"pilgrim_id" text NOT NULL,
"booking_id" text NOT NULL,
"document_type" text NOT NULL,
"status" text DEFAULT 'pending' NOT NULL,
"file_url" text,
"notes" text,
"submitted_at" timestamp with time zone,
"verified_at" timestamp with time zone,
"verified_by" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "profiles" (
"id" uuid PRIMARY KEY NOT NULL,
"name" text NOT NULL,
"email" text NOT NULL,
"phone" text,
"avatar_url" text,
"branch_id" text,
"totp_enabled" boolean DEFAULT false NOT NULL,
"totp_secret" text,
"totp_backup_codes" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "airlines" (
"id" text PRIMARY KEY NOT NULL,
"name" text NOT NULL,
"code" text,
"logo_url" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "airports" (
"id" text PRIMARY KEY NOT NULL,
"name" text NOT NULL,
"code" text,
"city" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "branches" (
"id" text PRIMARY KEY NOT NULL,
"name" text NOT NULL,
"slug" text,
"address" text,
"phone" text,
"email" text,
"city" text,
"region" text,
"postal_code" text,
"country" text,
"latitude" double precision,
"longitude" double precision,
"opening_hours" text,
"image_url" text,
"map_url" text,
"description" text,
"is_active" boolean DEFAULT true NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "currencies" (
"id" text PRIMARY KEY NOT NULL,
"code" text NOT NULL,
"name" text,
"symbol" text,
"rate_to_idr" integer,
"is_default" boolean DEFAULT false NOT NULL,
"is_active" boolean DEFAULT true NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "equipment" (
"id" text PRIMARY KEY NOT NULL,
"name" text NOT NULL,
"category" text,
"description" text,
"image_url" text,
"is_active" boolean DEFAULT true NOT NULL,
"sort_order" integer,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "hotels" (
"id" text PRIMARY KEY NOT NULL,
"name" text NOT NULL,
"city" text,
"stars" integer,
"image_url" text,
"description" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "muthawifs" (
"id" text PRIMARY KEY NOT NULL,
"name" text NOT NULL,
"phone" text,
"photo_url" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "package_categories" (
"id" text PRIMARY KEY NOT NULL,
"name" text NOT NULL,
"description" text,
"parent_id" text,
"show_extra_hotels" boolean,
"is_active" boolean,
"sort_order" integer,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "package_hotels" (
"id" text PRIMARY KEY NOT NULL,
"package_id" text NOT NULL,
"hotel_id" text NOT NULL,
"label" text,
"sort_order" integer,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "affiliate_clicks" (
"id" text PRIMARY KEY NOT NULL,
"agent_id" text,
"referral_code" text,
"ip" text,
"user_agent" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "agent_commissions" (
"id" text PRIMARY KEY NOT NULL,
"booking_id" text NOT NULL,
"agent_id" text NOT NULL,
"amount" integer NOT NULL,
"status" text DEFAULT 'pending' NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "agent_withdrawals" (
"id" text PRIMARY KEY NOT NULL,
"agent_id" text NOT NULL,
"amount" integer NOT NULL,
"status" text DEFAULT 'requested' NOT NULL,
"bank_name" text,
"bank_account" text,
"account_holder" text,
"notes" text,
"admin_notes" text,
"proof_url" text,
"processed_by" text,
"processed_at" timestamp with time zone,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "agents" (
"id" text PRIMARY KEY NOT NULL,
"user_id" text,
"branch_id" text,
"name" text NOT NULL,
"phone" text,
"email" text,
"referral_code" text,
"commission_percent" numeric,
"monthly_target" integer,
"is_active" boolean DEFAULT true NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "role_menu_permissions" (
"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
"role" text NOT NULL,
"menu_key" text NOT NULL,
"enabled" boolean DEFAULT true NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "user_roles" (
"id" uuid PRIMARY KEY NOT NULL,
"user_id" uuid NOT NULL,
"role" text NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "financial_transactions" (
"id" text PRIMARY KEY NOT NULL,
"booking_id" text,
"category" text NOT NULL,
"type" text NOT NULL,
"amount" numeric NOT NULL,
"description" text,
"reference_number" text,
"transaction_date" timestamp with time zone,
"recorded_by" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "installment_schedules" (
"id" text PRIMARY KEY NOT NULL,
"booking_id" text NOT NULL,
"installment_number" integer NOT NULL,
"due_date" timestamp with time zone NOT NULL,
"amount" integer NOT NULL,
"status" text DEFAULT 'pending' NOT NULL,
"paid_at" timestamp with time zone,
"payment_gateway_order_id" text,
"notes" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "payment_gateway_transactions" (
"id" text PRIMARY KEY NOT NULL,
"booking_id" text,
"gateway" text NOT NULL,
"order_id" text NOT NULL,
"gateway_transaction_id" text,
"amount" integer NOT NULL,
"payment_method" text,
"bank_code" text,
"va_number" text,
"status" text DEFAULT 'pending' NOT NULL,
"customer_name" text,
"customer_email" text,
"expiry_time" timestamp with time zone,
"paid_at" timestamp with time zone,
"raw_response" text,
"installment_schedule_id" text,
"created_at" timestamp with time zone,
"updated_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "payment_proof_access_logs" (
"id" text PRIMARY KEY NOT NULL,
"user_id" text,
"booking_id" text,
"payment_id" text,
"context" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "payments" (
"id" text PRIMARY KEY NOT NULL,
"booking_id" text NOT NULL,
"payment_method" text,
"amount" integer NOT NULL,
"status" text DEFAULT 'pending' NOT NULL,
"proof_url" text,
"payment_type" text,
"paid_at" timestamp with time zone,
"created_at" timestamp with time zone,
"verified_by" text,
"verified_at" timestamp with time zone,
"rejection_reason" text
);
CREATE TABLE IF NOT EXISTS "advantages" (
"id" text PRIMARY KEY NOT NULL,
"title" text NOT NULL,
"icon" text,
"sort_order" integer,
"is_active" boolean DEFAULT true NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "blog_posts" (
"id" text PRIMARY KEY NOT NULL,
"title" text NOT NULL,
"slug" text NOT NULL,
"excerpt" text,
"content" text,
"image_url" text,
"category" text,
"author" text,
"seo_title" text,
"seo_description" text,
"is_published" boolean DEFAULT false NOT NULL,
"published_at" timestamp with time zone,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "faqs" (
"id" text PRIMARY KEY NOT NULL,
"question" text NOT NULL,
"answer" text NOT NULL,
"scope" text,
"package_id" text,
"sort_order" integer,
"is_active" boolean DEFAULT true NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "floating_buttons" (
"id" text PRIMARY KEY NOT NULL,
"platform" text NOT NULL,
"label" text NOT NULL,
"url" text,
"icon" text,
"is_active" boolean DEFAULT true NOT NULL,
"sort_order" integer DEFAULT 0 NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "gallery" (
"id" text PRIMARY KEY NOT NULL,
"image_url" text NOT NULL,
"title" text,
"description" text,
"category" text,
"sort_order" integer,
"is_active" boolean DEFAULT true NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "guide_steps" (
"id" text PRIMARY KEY NOT NULL,
"step_number" integer NOT NULL,
"title" text NOT NULL,
"description" text,
"icon" text,
"is_active" boolean DEFAULT true NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "manasik_materials" (
"id" text PRIMARY KEY NOT NULL,
"title" text NOT NULL,
"description" text,
"type" text,
"file_url" text,
"thumbnail_url" text,
"sort_order" integer,
"is_active" boolean DEFAULT true NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "navigation_items" (
"id" text PRIMARY KEY NOT NULL,
"label" text NOT NULL,
"url" text NOT NULL,
"parent_id" text,
"sort_order" integer DEFAULT 0 NOT NULL,
"is_active" boolean DEFAULT true NOT NULL,
"open_in_new_tab" boolean DEFAULT false NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "package_reviews" (
"id" text PRIMARY KEY NOT NULL,
"package_id" text NOT NULL,
"user_id" text NOT NULL,
"rating" integer,
"title" text,
"comment" text,
"is_approved" boolean DEFAULT false NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "pages" (
"id" text PRIMARY KEY NOT NULL,
"slug" text NOT NULL,
"title" text NOT NULL,
"content" text,
"seo_title" text,
"seo_description" text,
"is_active" boolean DEFAULT true NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "pilgrim_testimonials" (
"id" text PRIMARY KEY NOT NULL,
"booking_id" text NOT NULL,
"user_id" text NOT NULL,
"rating" integer,
"message" text,
"is_approved" boolean DEFAULT false NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "services" (
"id" text PRIMARY KEY NOT NULL,
"title" text NOT NULL,
"description" text,
"icon" text,
"sort_order" integer,
"is_active" boolean DEFAULT true NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "testimonials" (
"id" text PRIMARY KEY NOT NULL,
"name" text NOT NULL,
"location" text,
"package_name" text,
"photo_url" text,
"rating" integer,
"content" text,
"travel_date" text,
"is_active" boolean DEFAULT true NOT NULL,
"sort_order" integer,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "wishlists" (
"id" text PRIMARY KEY NOT NULL,
"user_id" text NOT NULL,
"package_id" text NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "slug_redirects" (
"id" text PRIMARY KEY NOT NULL,
"tenant_site_id" text,
"resource_type" text NOT NULL,
"old_slug" text NOT NULL,
"new_slug" text NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "template_upgrade_orders" (
"id" text PRIMARY KEY NOT NULL,
"tenant_site_id" text NOT NULL,
"requested_by" text NOT NULL,
"current_template" text,
"target_template" text,
"price" integer,
"status" text DEFAULT 'pending' NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "tenant_site_packages" (
"id" text PRIMARY KEY NOT NULL,
"tenant_site_id" text NOT NULL,
"package_id" text NOT NULL,
"is_featured" boolean DEFAULT false NOT NULL,
"sort_order" integer,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "tenant_sites" (
"id" text PRIMARY KEY NOT NULL,
"owner_id" text,
"subdomain" text NOT NULL,
"custom_domain" text,
"site_name" text,
"tagline" text,
"logo_url" text,
"primary_color" text,
"secondary_color" text,
"hero_image_url" text,
"hero_title" text,
"hero_subtitle" text,
"about_text" text,
"whatsapp_number" text,
"phone" text,
"email" text,
"address" text,
"instagram_url" text,
"facebook_url" text,
"is_active" boolean DEFAULT true NOT NULL,
"template" text,
"gsc_verification" text,
"seo_default_image" text,
"branch_id" text,
"agent_id" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "seo_overrides" (
"id" text PRIMARY KEY NOT NULL,
"path" text NOT NULL,
"title" text,
"description" text,
"og_image" text,
"canonical_override" text,
"noindex" boolean DEFAULT false NOT NULL,
"keywords" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "site_settings" (
"id" text PRIMARY KEY NOT NULL,
"key" text NOT NULL,
"category" text,
"value" jsonb,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "audit_logs" (
"id" text PRIMARY KEY NOT NULL,
"user_id" text,
"action" text NOT NULL,
"entity_type" text,
"entity_id" text,
"metadata" jsonb,
"user_agent" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "error_logs" (
"id" text PRIMARY KEY NOT NULL,
"user_id" text,
"level" text NOT NULL,
"message" text NOT NULL,
"stack" text,
"url" text,
"user_agent" text,
"context" jsonb,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "pilgrim_doc_access_logs" (
"id" text PRIMARY KEY NOT NULL,
"user_id" text,
"pilgrim_id" text,
"doc_type" text,
"storage_path" text,
"context" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "request_log" (
"id" text PRIMARY KEY NOT NULL,
"ip" text,
"endpoint" text NOT NULL,
"user_id" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "coupons" (
"id" text PRIMARY KEY NOT NULL,
"code" text NOT NULL,
"discount_type" text NOT NULL,
"value" integer NOT NULL,
"min_purchase" integer,
"max_uses" integer,
"used_count" integer DEFAULT 0 NOT NULL,
"expired_at" timestamp with time zone,
"is_active" boolean DEFAULT true NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "integration_secrets" (
"id" text PRIMARY KEY NOT NULL,
"provider" text NOT NULL,
"config" jsonb,
"is_active" boolean DEFAULT true NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "lead_follow_ups" (
"id" text PRIMARY KEY NOT NULL,
"lead_id" text NOT NULL,
"follow_up_date" timestamp with time zone,
"type" text,
"notes" text,
"is_done" boolean DEFAULT false NOT NULL,
"done_at" timestamp with time zone,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "lead_interactions" (
"id" text PRIMARY KEY NOT NULL,
"lead_id" text NOT NULL,
"type" text NOT NULL,
"summary" text NOT NULL,
"outcome" text,
"created_by" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "leads" (
"id" text PRIMARY KEY NOT NULL,
"name" text NOT NULL,
"phone" text,
"email" text,
"source" text,
"status" text DEFAULT 'new' NOT NULL,
"package_interest" text,
"notes" text,
"tags" jsonb DEFAULT '[]'::jsonb,
"assigned_to" text,
"estimated_value" integer,
"expected_close_date" timestamp with time zone,
"is_repeat_customer" boolean DEFAULT false NOT NULL,
"last_interaction_at" timestamp with time zone,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "loyalty_balances" (
"id" text PRIMARY KEY NOT NULL,
"user_id" text NOT NULL,
"total_points" integer DEFAULT 0 NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "loyalty_points" (
"id" text PRIMARY KEY NOT NULL,
"user_id" text NOT NULL,
"points" integer NOT NULL,
"source" text,
"description" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "chat_messages" (
"id" text PRIMARY KEY NOT NULL,
"booking_id" text NOT NULL,
"sender_id" text,
"sender_role" text NOT NULL,
"message" text NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "contracts" (
"id" text PRIMARY KEY NOT NULL,
"booking_id" text NOT NULL,
"user_id" text NOT NULL,
"html_content" text,
"signature_data_url" text,
"signed_at" timestamp with time zone,
"signer_name" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "notifications" (
"id" text PRIMARY KEY NOT NULL,
"user_id" text NOT NULL,
"title" text NOT NULL,
"message" text,
"is_read" boolean DEFAULT false NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "refund_requests" (
"id" text PRIMARY KEY NOT NULL,
"user_id" text NOT NULL,
"booking_id" text NOT NULL,
"reason" text,
"amount" integer,
"bank_name" text,
"bank_account" text,
"account_holder" text,
"status" text DEFAULT 'pending' NOT NULL,
"admin_notes" text,
"processed_by" text,
"processed_at" timestamp with time zone,
"approved_at" timestamp with time zone,
"refunded_at" timestamp with time zone,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "itineraries" (
"id" text PRIMARY KEY NOT NULL,
"departure_id" text NOT NULL,
"title" text,
"notes" text,
"is_active" boolean DEFAULT true NOT NULL,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "itinerary_days" (
"id" text PRIMARY KEY NOT NULL,
"itinerary_id" text NOT NULL,
"day_number" integer NOT NULL,
"title" text,
"description" text,
"image_url" text,
"created_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "sessions" (
"sid" varchar PRIMARY KEY NOT NULL,
"sess" jsonb NOT NULL,
"expire" timestamp NOT NULL
);
CREATE TABLE IF NOT EXISTS "users" (
"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
"email" varchar,
"first_name" varchar,
"last_name" varchar,
"profile_image_url" varchar,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
CONSTRAINT "users_email_unique" UNIQUE("email")
);
DO $$ BEGIN
  ALTER TABLE "departure_gallery" ADD CONSTRAINT "departure_gallery_departure_id_package_departures_id_fk" FOREIGN KEY ("departure_id") REFERENCES "public"."package_departures"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "departure_prices" ADD CONSTRAINT "departure_prices_departure_id_package_departures_id_fk" FOREIGN KEY ("departure_id") REFERENCES "public"."package_departures"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "package_commissions" ADD CONSTRAINT "package_commissions_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "package_costs" ADD CONSTRAINT "package_costs_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "package_costs" ADD CONSTRAINT "package_costs_departure_id_package_departures_id_fk" FOREIGN KEY ("departure_id") REFERENCES "public"."package_departures"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "package_departures" ADD CONSTRAINT "package_departures_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "package_departures" ADD CONSTRAINT "package_departures_muthawif_id_muthawifs_id_fk" FOREIGN KEY ("muthawif_id") REFERENCES "public"."muthawifs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "packages" ADD CONSTRAINT "packages_category_id_package_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."package_categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "packages" ADD CONSTRAINT "packages_hotel_makkah_id_hotels_id_fk" FOREIGN KEY ("hotel_makkah_id") REFERENCES "public"."hotels"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "packages" ADD CONSTRAINT "packages_hotel_madinah_id_hotels_id_fk" FOREIGN KEY ("hotel_madinah_id") REFERENCES "public"."hotels"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "packages" ADD CONSTRAINT "packages_airline_id_airlines_id_fk" FOREIGN KEY ("airline_id") REFERENCES "public"."airlines"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "packages" ADD CONSTRAINT "packages_airport_id_airports_id_fk" FOREIGN KEY ("airport_id") REFERENCES "public"."airports"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "booking_payments" ADD CONSTRAINT "booking_payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "booking_pilgrims" ADD CONSTRAINT "booking_pilgrims_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "booking_rooms" ADD CONSTRAINT "booking_rooms_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_departure_id_package_departures_id_fk" FOREIGN KEY ("departure_id") REFERENCES "public"."package_departures"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_pilgrim_id_booking_pilgrims_id_fk" FOREIGN KEY ("pilgrim_id") REFERENCES "public"."booking_pilgrims"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_departure_id_package_departures_id_fk" FOREIGN KEY ("departure_id") REFERENCES "public"."package_departures"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "pilgrim_documents" ADD CONSTRAINT "pilgrim_documents_pilgrim_id_booking_pilgrims_id_fk" FOREIGN KEY ("pilgrim_id") REFERENCES "public"."booking_pilgrims"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "pilgrim_documents" ADD CONSTRAINT "pilgrim_documents_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "package_categories" ADD CONSTRAINT "package_categories_parent_id_package_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."package_categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "package_hotels" ADD CONSTRAINT "package_hotels_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "agent_commissions" ADD CONSTRAINT "agent_commissions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "agent_commissions" ADD CONSTRAINT "agent_commissions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "agent_withdrawals" ADD CONSTRAINT "agent_withdrawals_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "agents" ADD CONSTRAINT "agents_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "installment_schedules" ADD CONSTRAINT "installment_schedules_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "payment_gateway_transactions" ADD CONSTRAINT "payment_gateway_transactions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "payment_proof_access_logs" ADD CONSTRAINT "payment_proof_access_logs_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "payment_proof_access_logs" ADD CONSTRAINT "payment_proof_access_logs_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "faqs" ADD CONSTRAINT "faqs_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_parent_id_navigation_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."navigation_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "package_reviews" ADD CONSTRAINT "package_reviews_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "pilgrim_testimonials" ADD CONSTRAINT "pilgrim_testimonials_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "slug_redirects" ADD CONSTRAINT "slug_redirects_tenant_site_id_tenant_sites_id_fk" FOREIGN KEY ("tenant_site_id") REFERENCES "public"."tenant_sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "template_upgrade_orders" ADD CONSTRAINT "template_upgrade_orders_tenant_site_id_tenant_sites_id_fk" FOREIGN KEY ("tenant_site_id") REFERENCES "public"."tenant_sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "tenant_site_packages" ADD CONSTRAINT "tenant_site_packages_tenant_site_id_tenant_sites_id_fk" FOREIGN KEY ("tenant_site_id") REFERENCES "public"."tenant_sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "tenant_site_packages" ADD CONSTRAINT "tenant_site_packages_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "lead_follow_ups" ADD CONSTRAINT "lead_follow_ups_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "lead_interactions" ADD CONSTRAINT "lead_interactions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "contracts" ADD CONSTRAINT "contracts_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_departure_id_package_departures_id_fk" FOREIGN KEY ("departure_id") REFERENCES "public"."package_departures"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "itinerary_days" ADD CONSTRAINT "itinerary_days_itinerary_id_itineraries_id_fk" FOREIGN KEY ("itinerary_id") REFERENCES "public"."itineraries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "idx_departure_gallery_departure_id" ON "departure_gallery" USING btree ("departure_id");
CREATE INDEX IF NOT EXISTS "idx_departure_prices_departure_id" ON "departure_prices" USING btree ("departure_id");
CREATE INDEX IF NOT EXISTS "idx_package_commissions_package_id" ON "package_commissions" USING btree ("package_id");
CREATE INDEX IF NOT EXISTS "idx_package_costs_package_id" ON "package_costs" USING btree ("package_id");
CREATE INDEX IF NOT EXISTS "idx_package_costs_departure_id" ON "package_costs" USING btree ("departure_id");
CREATE INDEX IF NOT EXISTS "idx_departures_package_id" ON "package_departures" USING btree ("package_id");
CREATE INDEX IF NOT EXISTS "idx_departures_status" ON "package_departures" USING btree ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_packages_slug" ON "packages" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "idx_packages_is_active" ON "packages" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "idx_packages_category_id" ON "packages" USING btree ("category_id");
CREATE INDEX IF NOT EXISTS "idx_booking_payments_booking_id" ON "booking_payments" USING btree ("booking_id");
CREATE INDEX IF NOT EXISTS "idx_booking_pilgrims_booking_id" ON "booking_pilgrims" USING btree ("booking_id");
CREATE INDEX IF NOT EXISTS "idx_booking_rooms_booking_id" ON "booking_rooms" USING btree ("booking_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_bookings_code" ON "bookings" USING btree ("booking_code");
CREATE INDEX IF NOT EXISTS "idx_bookings_user_id" ON "bookings" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_bookings_package_id" ON "bookings" USING btree ("package_id");
CREATE INDEX IF NOT EXISTS "idx_bookings_departure_id" ON "bookings" USING btree ("departure_id");
CREATE INDEX IF NOT EXISTS "idx_bookings_agent_id" ON "bookings" USING btree ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_bookings_status" ON "bookings" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_check_ins_pilgrim_id" ON "check_ins" USING btree ("pilgrim_id");
CREATE INDEX IF NOT EXISTS "idx_check_ins_booking_id" ON "check_ins" USING btree ("booking_id");
CREATE INDEX IF NOT EXISTS "idx_pilgrim_docs_pilgrim_id" ON "pilgrim_documents" USING btree ("pilgrim_id");
CREATE INDEX IF NOT EXISTS "idx_pilgrim_docs_booking_id" ON "pilgrim_documents" USING btree ("booking_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_profiles_email" ON "profiles" USING btree ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_branches_slug" ON "branches" USING btree ("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_currencies_code" ON "currencies" USING btree ("code");
CREATE INDEX IF NOT EXISTS "idx_package_categories_parent_id" ON "package_categories" USING btree ("parent_id");
CREATE INDEX IF NOT EXISTS "idx_package_categories_is_active" ON "package_categories" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "idx_package_hotels_package_id" ON "package_hotels" USING btree ("package_id");
CREATE INDEX IF NOT EXISTS "idx_package_hotels_hotel_id" ON "package_hotels" USING btree ("hotel_id");
CREATE INDEX IF NOT EXISTS "idx_affiliate_clicks_agent_id" ON "affiliate_clicks" USING btree ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_agent_commissions_booking_id" ON "agent_commissions" USING btree ("booking_id");
CREATE INDEX IF NOT EXISTS "idx_agent_commissions_agent_id" ON "agent_commissions" USING btree ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_agent_withdrawals_agent_id" ON "agent_withdrawals" USING btree ("agent_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_agents_referral_code" ON "agents" USING btree ("referral_code");
CREATE INDEX IF NOT EXISTS "idx_agents_branch_id" ON "agents" USING btree ("branch_id");
CREATE INDEX IF NOT EXISTS "idx_agents_user_id" ON "agents" USING btree ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_role_menu_permissions" ON "role_menu_permissions" USING btree ("role","menu_key");
CREATE INDEX IF NOT EXISTS "idx_rmp_role" ON "role_menu_permissions" USING btree ("role");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_user_roles_user_id" ON "user_roles" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_roles_user_id" ON "user_roles" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_financial_transactions_booking_id" ON "financial_transactions" USING btree ("booking_id");
CREATE INDEX IF NOT EXISTS "idx_financial_transactions_type" ON "financial_transactions" USING btree ("type");
CREATE INDEX IF NOT EXISTS "idx_installment_schedules_booking_id" ON "installment_schedules" USING btree ("booking_id");
CREATE INDEX IF NOT EXISTS "idx_installment_schedules_due_date" ON "installment_schedules" USING btree ("due_date");
CREATE INDEX IF NOT EXISTS "idx_installment_schedules_status" ON "installment_schedules" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_pgt_booking_id" ON "payment_gateway_transactions" USING btree ("booking_id");
CREATE INDEX IF NOT EXISTS "idx_pgt_status" ON "payment_gateway_transactions" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_pgt_order_id" ON "payment_gateway_transactions" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "idx_payment_proof_logs_booking_id" ON "payment_proof_access_logs" USING btree ("booking_id");
CREATE INDEX IF NOT EXISTS "idx_payment_proof_logs_user_id" ON "payment_proof_access_logs" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_payments_booking_id" ON "payments" USING btree ("booking_id");
CREATE INDEX IF NOT EXISTS "idx_payments_status" ON "payments" USING btree ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_blog_posts_slug" ON "blog_posts" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_is_published" ON "blog_posts" USING btree ("is_published");
CREATE INDEX IF NOT EXISTS "idx_faqs_scope" ON "faqs" USING btree ("scope");
CREATE INDEX IF NOT EXISTS "idx_faqs_package_id" ON "faqs" USING btree ("package_id");
CREATE INDEX IF NOT EXISTS "idx_navigation_items_parent_id" ON "navigation_items" USING btree ("parent_id");
CREATE INDEX IF NOT EXISTS "idx_package_reviews_package_id" ON "package_reviews" USING btree ("package_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_pages_slug" ON "pages" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "idx_pilgrim_testimonials_booking_id" ON "pilgrim_testimonials" USING btree ("booking_id");
CREATE INDEX IF NOT EXISTS "idx_wishlists_package_id" ON "wishlists" USING btree ("package_id");
CREATE INDEX IF NOT EXISTS "idx_wishlists_user_id" ON "wishlists" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_slug_redirects_site_id" ON "slug_redirects" USING btree ("tenant_site_id");
CREATE INDEX IF NOT EXISTS "idx_slug_redirects_old_slug" ON "slug_redirects" USING btree ("old_slug");
CREATE INDEX IF NOT EXISTS "idx_template_upgrade_orders_site_id" ON "template_upgrade_orders" USING btree ("tenant_site_id");
CREATE INDEX IF NOT EXISTS "idx_tenant_site_packages_site_id" ON "tenant_site_packages" USING btree ("tenant_site_id");
CREATE INDEX IF NOT EXISTS "idx_tenant_site_packages_package_id" ON "tenant_site_packages" USING btree ("package_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tenant_sites_subdomain" ON "tenant_sites" USING btree ("subdomain");
CREATE INDEX IF NOT EXISTS "idx_tenant_sites_custom_domain" ON "tenant_sites" USING btree ("custom_domain");
CREATE INDEX IF NOT EXISTS "idx_tenant_sites_is_active" ON "tenant_sites" USING btree ("is_active");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_seo_overrides_path" ON "seo_overrides" USING btree ("path");
CREATE INDEX IF NOT EXISTS "idx_site_settings_key" ON "site_settings" USING btree ("key");
CREATE INDEX IF NOT EXISTS "idx_site_settings_key_category" ON "site_settings" USING btree ("key","category");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity" ON "audit_logs" USING btree ("entity_type","entity_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_error_logs_level" ON "error_logs" USING btree ("level");
CREATE INDEX IF NOT EXISTS "idx_error_logs_created_at" ON "error_logs" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "idx_pilgrim_doc_access_logs_user_id" ON "pilgrim_doc_access_logs" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_request_log_user_id" ON "request_log" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_request_log_created_at" ON "request_log" USING btree ("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_coupons_code" ON "coupons" USING btree ("code");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_integration_secrets_provider" ON "integration_secrets" USING btree ("provider");
CREATE INDEX IF NOT EXISTS "idx_lead_follow_ups_lead_id" ON "lead_follow_ups" USING btree ("lead_id");
CREATE INDEX IF NOT EXISTS "idx_lead_interactions_lead_id" ON "lead_interactions" USING btree ("lead_id");
CREATE INDEX IF NOT EXISTS "idx_leads_status" ON "leads" USING btree ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_loyalty_balances_user_id" ON "loyalty_balances" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_loyalty_points_user_id" ON "loyalty_points" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_chat_messages_booking_id" ON "chat_messages" USING btree ("booking_id");
CREATE INDEX IF NOT EXISTS "idx_contracts_booking_id" ON "contracts" USING btree ("booking_id");
CREATE INDEX IF NOT EXISTS "idx_contracts_user_id" ON "contracts" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_is_read" ON "notifications" USING btree ("user_id","is_read");
CREATE INDEX IF NOT EXISTS "idx_refund_requests_booking_id" ON "refund_requests" USING btree ("booking_id");
CREATE INDEX IF NOT EXISTS "idx_refund_requests_user_id" ON "refund_requests" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_itineraries_departure_id" ON "itineraries" USING btree ("departure_id");
CREATE INDEX IF NOT EXISTS "idx_itinerary_days_itinerary_id" ON "itinerary_days" USING btree ("itinerary_id");
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" USING btree ("expire");
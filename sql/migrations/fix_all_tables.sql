-- =============================================================================
-- FIX ALL TABLES — v3 (definitive)
-- Status: cek dulu apakah sudah diterapkan sebelum jalankan ulang. Riwayat
-- patch — lihat sql/README.md. ("v3" berarti ini superseding versi sebelumnya,
-- yang tidak lagi disimpan sebagai file terpisah.)
-- =============================================================================
-- Berdasarkan analisis mendalam supabase-schema.sql vs Drizzle schema.
--
-- Cara pakai: Supabase Dashboard → SQL Editor → New Query → paste → Run
--
-- Aman dijalankan berulang kali. Tidak akan error meskipun:
--   • Tabel sudah ada
--   • Kolom sudah ada
--   • Index sudah ada
--   • Constraint sudah ada
--   • Tabel belum ada (DO block menangkap error)
-- =============================================================================

-- =============================================================================
-- SECTION 1: KOLOM YANG KURANG DI TABEL EXISTING
-- =============================================================================
-- Setiap ALTER TABLE dibungkus DO block → tidak error jika tabel belum ada

-- ── agent_withdrawals ────────────────────────────────────────────────────────
-- supabase-schema.sql mempunyai kolom lama "bank_details TEXT" (satu kolom).
-- Drizzle schema mengharapkan kolom terpisah (bank_name, bank_account, dll).
DO $$ BEGIN
  ALTER TABLE public.agent_withdrawals ADD COLUMN IF NOT EXISTS bank_name      text;
  ALTER TABLE public.agent_withdrawals ADD COLUMN IF NOT EXISTS bank_account   text;
  ALTER TABLE public.agent_withdrawals ADD COLUMN IF NOT EXISTS account_holder text;
  ALTER TABLE public.agent_withdrawals ADD COLUMN IF NOT EXISTS notes          text;
  ALTER TABLE public.agent_withdrawals ADD COLUMN IF NOT EXISTS admin_notes    text;
  ALTER TABLE public.agent_withdrawals ADD COLUMN IF NOT EXISTS proof_url      text;
  ALTER TABLE public.agent_withdrawals ADD COLUMN IF NOT EXISTS processed_by   text;
  ALTER TABLE public.agent_withdrawals ADD COLUMN IF NOT EXISTS processed_at   timestamptz;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'agent_withdrawals belum ada — lewati';
END $$;

-- ── booking_pilgrims ─────────────────────────────────────────────────────────
-- supabase-schema.sql tidak punya kolom nationality dan room_type
DO $$ BEGIN
  ALTER TABLE public.booking_pilgrims ADD COLUMN IF NOT EXISTS nationality text;
  ALTER TABLE public.booking_pilgrims ADD COLUMN IF NOT EXISTS room_type   text;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'booking_pilgrims belum ada — lewati';
END $$;

-- ── notifications ─────────────────────────────────────────────────────────────
-- Pastikan semua kolom yang diharapkan Drizzle ada.
-- CATATAN: user_id mungkin TEXT atau UUID tergantung versi DB.
-- Kita tidak ubah tipe — hanya tambah kolom yang mungkin belum ada.
DO $$ BEGIN
  ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title      text;
  ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message    text;
  ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read    boolean DEFAULT false;
  ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_at timestamptz;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'notifications belum ada — lewati';
END $$;

-- ── packages (pastikan semua FK kolom ada) ────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS duration_days     integer;
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS package_type      text;
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS category_id       text;
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS hotel_makkah_id   text;
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS hotel_madinah_id  text;
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS airline_id        text;
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS airport_id        text;
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS minimum_dp        integer;
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS dp_deadline_days  integer;
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS full_deadline_days integer;
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS is_active         boolean;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'packages belum ada — lewati';
END $$;

-- ── package_departures ───────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.package_departures ADD COLUMN IF NOT EXISTS return_date     text;
  ALTER TABLE public.package_departures ADD COLUMN IF NOT EXISTS status          text;
  ALTER TABLE public.package_departures ADD COLUMN IF NOT EXISTS muthawif_id     text;
  ALTER TABLE public.package_departures ADD COLUMN IF NOT EXISTS remaining_quota integer;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'package_departures belum ada — lewati';
END $$;

-- ── profiles ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone              text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url         text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch_id          text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS totp_enabled       boolean DEFAULT false;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS totp_secret        text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS totp_backup_codes  text;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'profiles belum ada — lewati';
END $$;

-- ── contracts ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS user_id            text;
  ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS status             text;
  ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS html_content       text;
  ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signature_data_url text;
  ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signed_at          timestamptz;
  ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signer_name        text;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'contracts belum ada — lewati';
END $$;

-- ── refund_requests ──────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS bank_name      text;
  ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS bank_account   text;
  ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS account_holder text;
  ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS admin_notes    text;
  ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS processed_by   text;
  ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS processed_at   timestamptz;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'refund_requests belum ada — lewati';
END $$;

-- ── payments ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS booking_id     text;
  ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount         integer;
  ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS status         text DEFAULT 'pending';
  ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_method text;
  ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_type   text;
  ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS proof_url      text;
  ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_at        timestamptz;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'payments belum ada — lewati';
END $$;

-- ── bookings ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_id        text;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS package_id     text;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS departure_id   text;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS branch_id      text;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS agent_id       text;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pic_id         text;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pic_type       text;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status         text;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS total_price    integer;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS currency       text;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_scheme text;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS notes          text;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_code   text;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'bookings belum ada — lewati';
END $$;

-- ── user_roles ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role       text;
  ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'user_roles belum ada — lewati';
END $$;

-- ── branches ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
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
  ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS is_active     boolean DEFAULT true;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'branches belum ada — lewati';
END $$;

-- ── hotels ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS stars       integer;
  ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS image_url   text;
  ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS description text;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'hotels belum ada — lewati';
END $$;

-- ── booking_pilgrims (FK dan kolom lain yang mungkin belum ada) ───────────────
DO $$ BEGIN
  ALTER TABLE public.booking_pilgrims ADD COLUMN IF NOT EXISTS booking_id      text;
  ALTER TABLE public.booking_pilgrims ADD COLUMN IF NOT EXISTS name            text;
  ALTER TABLE public.booking_pilgrims ADD COLUMN IF NOT EXISTS phone           text;
  ALTER TABLE public.booking_pilgrims ADD COLUMN IF NOT EXISTS email           text;
  ALTER TABLE public.booking_pilgrims ADD COLUMN IF NOT EXISTS gender          text;
  ALTER TABLE public.booking_pilgrims ADD COLUMN IF NOT EXISTS nik             text;
  ALTER TABLE public.booking_pilgrims ADD COLUMN IF NOT EXISTS birth_date      text;
  ALTER TABLE public.booking_pilgrims ADD COLUMN IF NOT EXISTS passport_number text;
  ALTER TABLE public.booking_pilgrims ADD COLUMN IF NOT EXISTS passport_expiry text;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'booking_pilgrims belum ada — lewati';
END $$;

-- ── pilgrim_documents ────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.pilgrim_documents ADD COLUMN IF NOT EXISTS pilgrim_id    text;
  ALTER TABLE public.pilgrim_documents ADD COLUMN IF NOT EXISTS booking_id    text;
  ALTER TABLE public.pilgrim_documents ADD COLUMN IF NOT EXISTS document_type text;
  ALTER TABLE public.pilgrim_documents ADD COLUMN IF NOT EXISTS status        text DEFAULT 'pending';
  ALTER TABLE public.pilgrim_documents ADD COLUMN IF NOT EXISTS file_url      text;
  ALTER TABLE public.pilgrim_documents ADD COLUMN IF NOT EXISTS notes         text;
  ALTER TABLE public.pilgrim_documents ADD COLUMN IF NOT EXISTS submitted_at  timestamptz;
  ALTER TABLE public.pilgrim_documents ADD COLUMN IF NOT EXISTS verified_at   timestamptz;
  ALTER TABLE public.pilgrim_documents ADD COLUMN IF NOT EXISTS verified_by   text;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'pilgrim_documents belum ada — lewati';
END $$;

-- =============================================================================
-- SECTION 2: BUAT TABEL BARU YANG BELUM ADA DI supabase-schema.sql
-- =============================================================================

-- ── payment_gateway_transactions ─────────────────────────────────────────────
-- Tabel ini TIDAK ADA di supabase-schema.sql awal.
-- CREATE TABLE IF NOT EXISTS menangani kasus tabel sudah ada.
-- ALTER TABLE di bawah menangani kasus tabel ada tapi column kurang.
CREATE TABLE IF NOT EXISTS public.payment_gateway_transactions (
    id                     text PRIMARY KEY,
    booking_id             text,
    gateway                text,
    order_id               text,
    gateway_transaction_id text,
    amount                 integer,
    payment_method         text,
    bank_code              text,
    va_number              text,
    status                 text DEFAULT 'pending',
    customer_name          text,
    customer_email         text,
    expiry_time            timestamptz,
    paid_at                timestamptz,
    raw_response           text,
    created_at             timestamptz,
    updated_at             timestamptz
);

-- Jika tabel sudah ada tapi column kurang (dari migrasi sebelumnya):
DO $$ BEGIN
  ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS booking_id             text;
  ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS gateway                text;
  ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS order_id               text;
  ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS gateway_transaction_id text;
  ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS amount                 integer;
  ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS payment_method         text;
  ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS bank_code              text;
  ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS va_number              text;
  ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS status                 text DEFAULT 'pending';
  ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS customer_name          text;
  ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS customer_email         text;
  ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS expiry_time            timestamptz;
  ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS paid_at                timestamptz;
  ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS raw_response           text;
  ALTER TABLE public.payment_gateway_transactions ADD COLUMN IF NOT EXISTS updated_at             timestamptz;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'payment_gateway_transactions belum ada — lewati ALTER';
END $$;

-- ── role_menu_permissions ────────────────────────────────────────────────────
-- Tabel ini TIDAK ADA di supabase-schema.sql awal.
CREATE TABLE IF NOT EXISTS public.role_menu_permissions (
    id         text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    role       text        NOT NULL,
    menu_key   text        NOT NULL,
    enabled    boolean     NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- SECTION 3: INDEX YANG MUNGKIN BELUM ADA
-- =============================================================================
-- Setiap index dibuat hanya jika kolom yang diindex sudah ada di tabel.
-- Menggunakan DO block + cek information_schema → tidak pernah error.

DO $$
DECLARE v boolean;
BEGIN

  -- role_menu_permissions: unique (role, menu_key)
  IF NOT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='uq_role_menu_perm') THEN
    CREATE UNIQUE INDEX uq_role_menu_perm ON public.role_menu_permissions (role, menu_key);
  END IF;

  -- role_menu_permissions: role
  IF NOT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='idx_rmp_role') THEN
    CREATE INDEX idx_rmp_role ON public.role_menu_permissions (role);
  END IF;

  -- payment_gateway_transactions: order_id (hanya jika kolom sudah ada)
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='payment_gateway_transactions'
      AND column_name='order_id') INTO v;
  IF v AND NOT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='idx_pgt_order_id') THEN
    CREATE INDEX idx_pgt_order_id ON public.payment_gateway_transactions (order_id);
  END IF;

  -- payment_gateway_transactions: booking_id
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='payment_gateway_transactions'
      AND column_name='booking_id') INTO v;
  IF v AND NOT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='idx_pgt_booking_id') THEN
    CREATE INDEX idx_pgt_booking_id ON public.payment_gateway_transactions (booking_id);
  END IF;

  -- bookings: user_id
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='user_id') INTO v;
  IF v AND NOT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='idx_bookings_user_id') THEN
    CREATE INDEX idx_bookings_user_id ON public.bookings (user_id);
  END IF;

  -- bookings: status
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='status') INTO v;
  IF v AND NOT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='idx_bookings_status') THEN
    CREATE INDEX idx_bookings_status ON public.bookings (status);
  END IF;

  -- bookings: booking_code (unique)
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='booking_code') INTO v;
  IF v AND NOT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='uq_bookings_booking_code') THEN
    CREATE UNIQUE INDEX uq_bookings_booking_code ON public.bookings (booking_code);
  END IF;

  -- payments: booking_id
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='payments' AND column_name='booking_id') INTO v;
  IF v AND NOT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='idx_payments_booking_id') THEN
    CREATE INDEX idx_payments_booking_id ON public.payments (booking_id);
  END IF;

  -- payments: status
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='payments' AND column_name='status') INTO v;
  IF v AND NOT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='idx_payments_status') THEN
    CREATE INDEX idx_payments_status ON public.payments (status);
  END IF;

  -- user_roles: user_id (index biasa)
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_roles' AND column_name='user_id') INTO v;
  IF v AND NOT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='idx_user_roles_user_id') THEN
    CREATE INDEX idx_user_roles_user_id ON public.user_roles (user_id);
  END IF;

  -- user_roles: user_id (unique constraint — via index)
  IF v AND NOT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='uq_user_roles_user_id') THEN
    CREATE UNIQUE INDEX uq_user_roles_user_id ON public.user_roles (user_id);
  END IF;

  -- notifications: user_id + is_read (hanya jika kedua kolom ada)
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notifications' AND column_name='user_id') INTO v;
  IF v AND NOT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='idx_notifications_user') THEN
    SELECT EXISTS(SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='notifications' AND column_name='is_read') INTO v;
    IF v THEN
      CREATE INDEX idx_notifications_user ON public.notifications (user_id, is_read);
    END IF;
  END IF;

  -- site_settings: key
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='site_settings' AND column_name='key') INTO v;
  IF v AND NOT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='idx_site_settings_key') THEN
    CREATE INDEX idx_site_settings_key ON public.site_settings (key);
  END IF;

  -- branches: slug (unique)
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='branches' AND column_name='slug') INTO v;
  IF v AND NOT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='uq_branches_slug') THEN
    CREATE UNIQUE INDEX uq_branches_slug ON public.branches (slug);
  END IF;

  -- agents: referral_code
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='agents' AND column_name='referral_code') INTO v;
  IF v AND NOT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname='idx_agents_referral_code') THEN
    CREATE INDEX idx_agents_referral_code ON public.agents (referral_code);
  END IF;

END $$;

-- =============================================================================
-- SECTION 4: FK CONSTRAINTS (idempotent: DROP IF EXISTS → ADD)
-- =============================================================================
-- Hanya tambah FK yang belum ada di supabase-schema.sql atau mungkin gagal sebelumnya.
-- Semua constraint pakai DROP IF EXISTS dulu agar aman dijalankan berulang.

-- user_roles → auth.users (user_id TEXT vs UUID: buat sebagai TEXT FK dulu)
-- CATATAN: FK dari TEXT ke UUID bisa gagal di Postgres standar.
-- Jika gagal, constraint dilewati — tabel tetap berfungsi tanpa FK ini.
DO $$ BEGIN
  ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS fk_user_roles_user;
  ALTER TABLE public.user_roles ADD CONSTRAINT fk_user_roles_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'FK user_roles→auth.users gagal (mungkin type mismatch): %', SQLERRM;
END $$;

-- notifications → auth.users
DO $$ BEGIN
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS fk_notifications_user;
  ALTER TABLE public.notifications ADD CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'FK notifications→auth.users gagal (mungkin type mismatch): %', SQLERRM;
END $$;

-- payment_gateway_transactions → bookings
DO $$ BEGIN
  ALTER TABLE public.payment_gateway_transactions DROP CONSTRAINT IF EXISTS fk_pgt_booking;
  ALTER TABLE public.payment_gateway_transactions ADD CONSTRAINT fk_pgt_booking
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'FK payment_gateway_transactions→bookings gagal: %', SQLERRM;
END $$;

-- =============================================================================
-- SECTION 5: (tidak ada — unique constraints sudah ditangani di SECTION 3)
-- =============================================================================

-- =============================================================================
-- SECTION 6: CUSTOM JWT HOOK
-- =============================================================================
-- Fungsi ini dijalankan setiap kali user login — menyematkan role ke JWT.
-- Setelah SQL ini berhasil, WAJIB aktifkan manual di:
--   Supabase Dashboard → Authentication → Hooks → Custom Access Token Hook
--   → Enable → Type: Postgres Function → Function: public.custom_access_token_hook
-- Lalu user perlu LOGOUT dan LOGIN ULANG.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  claims    jsonb;
  user_role text;
BEGIN
  -- Ambil role dari user_roles (user_id disimpan sebagai TEXT)
  SELECT role
    INTO user_role
    FROM public.user_roles
   WHERE user_roles.user_id = event->>'user_id'
   LIMIT 1;

  claims := event->'claims';

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(
      claims,
      '{app_metadata}',
      COALESCE(claims->'app_metadata', '{}'::jsonb)
        || jsonb_build_object('role', user_role)
    );
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant permissions yang dibutuhkan hook engine
GRANT USAGE   ON SCHEMA public                               TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook   TO supabase_auth_admin;
GRANT SELECT  ON public.user_roles                          TO supabase_auth_admin;

-- Cabut akses publik
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- VERIFIKASI AKHIR
-- =============================================================================

-- Tabel yang ada di public schema
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type   = 'BASE TABLE'
ORDER BY table_name;

-- Konfirmasi JWT hook function
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name   = 'custom_access_token_hook';

-- Kolom baru di agent_withdrawals
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'agent_withdrawals'
ORDER BY ordinal_position;

-- =============================================================================
-- Migration: Buat tabel yang hilang di Supabase
-- =============================================================================
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query → Run
-- Script ini IDEMPOTENT — aman dijalankan berulang kali.
-- =============================================================================

-- 1. Tabel notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id          text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     text        NOT NULL,
  title       text        NOT NULL,
  message     text,
  is_read     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read
  ON public.notifications (user_id, is_read);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications'
    AND policyname = 'users manage own notifications'
  ) THEN
    CREATE POLICY "users manage own notifications"
      ON public.notifications FOR ALL
      TO authenticated
      USING (user_id = auth.uid()::text)
      WITH CHECK (user_id = auth.uid()::text);
  END IF;
END $$;

-- 2. Tabel role_menu_permissions
CREATE TABLE IF NOT EXISTS public.role_menu_permissions (
  id          text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  role        text        NOT NULL,
  menu_key    text        NOT NULL,
  enabled     boolean     NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_role_menu_permissions UNIQUE (role, menu_key)
);
CREATE INDEX IF NOT EXISTS idx_rmp_role
  ON public.role_menu_permissions (role);

COMMENT ON TABLE public.role_menu_permissions IS
  'Per-role menu visibility overrides. Managed by super_admin via /admin/menu-permissions.';

-- =============================================================================
-- PENTING: Aktifkan Custom JWT Hook agar role terbaca di frontend
-- =============================================================================
-- 1. Pastikan fungsi custom_access_token_hook sudah ada (lihat custom_jwt_hook.sql)
-- 2. Buka: Authentication → Hooks → Custom Access Token Hook
-- 3. Pilih: Type = "Postgres Function"
--    Function = "public.custom_access_token_hook"
-- 4. User perlu LOGOUT lalu LOGIN ULANG agar JWT baru ter-generate.
-- =============================================================================

-- Verifikasi
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('notifications', 'role_menu_permissions')
ORDER BY table_name;

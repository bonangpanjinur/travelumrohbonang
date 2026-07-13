-- =============================================================================
-- Setup user_roles table di Supabase
-- Status: sudah diterapkan ke production. Riwayat patch — lihat sql/README.md.
-- =============================================================================
-- Jalankan di Supabase SQL Editor SEBELUM mengaktifkan JWT hook.
-- Tabel ini dipakai oleh authMiddleware (via REST API) untuk menyimpan role
-- user, dan oleh custom_access_token_hook untuk meng-embed role ke JWT.
--
-- CARA PAKAI:
--   https://supabase.com/dashboard/project/_/sql/new
--   Paste SQL ini → Run
--
-- Script ini IDEMPOTENT — aman dijalankan berulang kali.
-- =============================================================================

-- 1. Buat tabel jika belum ada
CREATE TABLE IF NOT EXISTS public.user_roles (
  id          TEXT NOT NULL PRIMARY KEY,
  user_id     TEXT NOT NULL,           -- Supabase auth user UUID, disimpan sebagai TEXT
  role        TEXT NOT NULL DEFAULT 'buyer',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_roles_user_id UNIQUE (user_id)
);

-- 2. Index untuk pencarian cepat berdasarkan user_id
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);

-- 3. RLS — aktifkan
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: service_role bisa akses semua (dipakai oleh authMiddleware)
-- Gunakan DO block karena CREATE POLICY IF NOT EXISTS tidak tersedia di semua versi Postgres
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'user_roles'
       AND policyname = 'service_role full access'
  ) THEN
    CREATE POLICY "service_role full access"
      ON public.user_roles
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- Policy: user hanya bisa baca role-nya sendiri
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'user_roles'
       AND policyname = 'users read own role'
  ) THEN
    CREATE POLICY "users read own role"
      ON public.user_roles
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid()::text);
  END IF;
END
$$;

-- 4. Grant ke supabase_auth_admin (dibutuhkan oleh custom JWT hook)
GRANT SELECT ON public.user_roles TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- Verifikasi: tampilkan jumlah baris dan struktur
SELECT COUNT(*) AS total_rows FROM public.user_roles;

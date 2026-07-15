-- =============================================================================
-- Supabase Custom Access Token Hook
-- Status: sudah diterapkan ke production. Riwayat patch — lihat sql/README.md.
-- =============================================================================
-- Tujuan: Embed app_metadata.role ke dalam JWT setiap kali user login atau
-- token di-refresh. Dengan ini, JWT selalu berisi role yang benar sehingga
-- frontend bisa menentukan hak akses bahkan ketika API server tidak bisa
-- dihubungi (fallback mode).
--
-- CARA PAKAI:
-- 1. Jalankan SQL ini di Supabase SQL Editor
--    (https://supabase.com/dashboard/project/_/sql/new)
-- 2. Setelah selesai, buka:
--    Authentication → Hooks → Custom Access Token Hook
--    Pilih: Type = "Postgres Function", Function = "public.custom_access_token_hook"
-- 3. User perlu LOGOUT lalu LOGIN ULANG agar JWT baru ter-generate.
-- =============================================================================

-- Buat fungsi hook
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  claims   jsonb;
  user_role text;
BEGIN
  -- Ambil role user dari tabel user_roles
  -- CATATAN: user_id disimpan sebagai TEXT, bukan UUID — jangan cast ::uuid
  SELECT role
    INTO user_role
    FROM public.user_roles
   WHERE user_roles.user_id = event->>'user_id'
   LIMIT 1;

  -- Ambil klaim yang ada
  claims := event->'claims';

  -- Jika role ditemukan, embed ke app_metadata
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(
      claims,
      '{app_metadata}',
      COALESCE(claims->'app_metadata', '{}'::jsonb)
        || jsonb_build_object('role', user_role)
    );
  END IF;

  -- Kembalikan event dengan klaim yang sudah diupdate
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant akses ke supabase_auth_admin (dibutuhkan oleh hook engine)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Cabut akses dari role public untuk keamanan
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC, anon, authenticated;

-- Verifikasi: pastikan fungsi sudah dibuat
SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'custom_access_token_hook';

-- ============================================================
--  Auto-create profile + user_role on Supabase Auth signup
--  Trigger fires AFTER INSERT ON auth.users
-- ============================================================

-- Function: dipanggil setiap ada user baru daftar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name text;
BEGIN
  -- Ambil nama dari user_metadata jika ada, fallback ke bagian sebelum @ dari email
  _name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM((NEW.raw_user_meta_data->>'first_name') || ' ' || (NEW.raw_user_meta_data->>'last_name')), ' '),
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Insert ke profiles (ON CONFLICT DO NOTHING agar aman jika dipanggil ulang)
  INSERT INTO public.profiles (id, name, email, created_at)
  VALUES (
    NEW.id,
    _name,
    COALESCE(NEW.email, ''),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert ke user_roles dengan role default 'user'
  INSERT INTO public.user_roles (id, user_id, role, created_at)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    'user',
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Hapus trigger lama jika ada (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Buat trigger baru
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
--  Backfill: buat profile & user_role untuk user yang sudah
--  ada di auth.users tapi belum punya row di profiles/user_roles
-- ============================================================
INSERT INTO public.profiles (id, name, email, created_at)
SELECT
  au.id,
  COALESCE(
    NULLIF(TRIM(au.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(au.raw_user_meta_data->>'name'), ''),
    SPLIT_PART(au.email, '@', 1)
  ),
  COALESCE(au.email, ''),
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (id, user_id, role, created_at)
SELECT
  gen_random_uuid(),
  au.id,
  'user',
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = au.id
)
ON CONFLICT (user_id) DO NOTHING;

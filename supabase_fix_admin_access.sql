-- 1. Pastikan kolom 'role' ada di tabel profiles
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user';
    END IF;
END $$;

-- 2. Perbaiki RLS Policy untuk tabel profiles
-- Izinkan user membaca profilnya sendiri (termasuk melihat role-nya)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Izinkan Admin melihat SEMUA profil (agar dashboard admin bisa memuat list user)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" 
ON profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'superadmin')
  )
);

-- 3. Query untuk memastikan user tertentu menjadi admin
-- Ganti 'email_admin@example.com' dengan email Anda
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id IN (
--     SELECT id FROM auth.users WHERE email = 'email_admin@example.com'
-- );

-- 4. Verifikasi data
-- SELECT * FROM public.profiles WHERE role = 'admin' OR role = 'superadmin';

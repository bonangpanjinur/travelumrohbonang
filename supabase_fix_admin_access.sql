-- 1. Pastikan kolom 'role' ada di tabel profiles dengan default 'buyer'
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'buyer';
    ELSE
        -- Jika kolom sudah ada, pastikan defaultnya adalah 'buyer' untuk user baru
        ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'buyer';
    END IF;
END $$;

-- 2. Perbarui RLS Policy untuk tabel profiles
-- Izinkan user membaca profilnya sendiri
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Izinkan Admin melihat SEMUA profil
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" 
ON profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'superadmin')
  )
);

-- 3. Contoh Query untuk mengubah role (Jalankan manual di SQL Editor)
-- Menjadi Admin:
-- UPDATE public.profiles SET role = 'admin' WHERE id IN (SELECT id FROM auth.users WHERE email = 'admin@example.com');

-- Menjadi Buyer:
-- UPDATE public.profiles SET role = 'buyer' WHERE id IN (SELECT id FROM auth.users WHERE email = 'buyer@example.com');

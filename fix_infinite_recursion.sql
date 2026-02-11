-- 1. Create a function to check if a user is an admin without triggering RLS recursion
-- SECURITY DEFINER allows the function to run with the privileges of the creator (bypass RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'superadmin' OR role = 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop old policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 3. Create new clean policies using the is_admin() function
-- Policy for SELECT: Users can see their own profile OR admins can see all
CREATE POLICY "Profiles are viewable by owner or admin"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id 
  OR 
  public.is_admin()
);

-- Policy for UPDATE: Users can update their own profile OR admins can update all
CREATE POLICY "Profiles are updatable by owner or admin"
ON public.profiles FOR UPDATE
USING (
  auth.uid() = id 
  OR 
  public.is_admin()
);

-- Policy for INSERT: Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- 4. Ensure the role column exists and has correct default
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'buyer';
    ELSE
        ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'buyer';
    END IF;
END $$;

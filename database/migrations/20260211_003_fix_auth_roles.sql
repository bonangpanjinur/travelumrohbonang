-- 1. Pastikan tabel user_roles memiliki constraint yang tepat
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_key') THEN
        ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- 2. Update fungsi handle_new_user untuk memberikan role default 'buyer'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert ke profiles
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  );

  -- Insert ke user_roles sebagai 'buyer' secara default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'buyer')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 3. Fungsi untuk sinkronisasi role dari profiles ke user_roles (jika ada data lama)
-- Ini memastikan user_roles menjadi Single Source of Truth
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id, role FROM public.profiles WHERE role IS NOT NULL LOOP
        INSERT INTO public.user_roles (user_id, role)
        VALUES (r.id, r.role)
        ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
    END LOOP;
END $$;

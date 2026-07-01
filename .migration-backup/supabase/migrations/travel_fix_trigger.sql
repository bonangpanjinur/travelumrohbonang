-- Memperbarui fungsi handle_new_user untuk memberikan role default 'buyer'
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
  VALUES (NEW.id, 'buyer');

  RETURN NEW;
END;
$$;

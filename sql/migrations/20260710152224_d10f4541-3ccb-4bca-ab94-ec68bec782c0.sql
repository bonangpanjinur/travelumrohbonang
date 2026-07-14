
-- === Helper: cek apakah user pemilik pilgrim (via booking) ===
CREATE OR REPLACE FUNCTION public.user_owns_pilgrim(_user_id uuid, _pilgrim_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.booking_pilgrims bp
    JOIN public.bookings b ON b.id = bp.booking_id
    WHERE bp.id = _pilgrim_id
      AND b.user_id = _user_id
  );
$$;

REVOKE ALL ON FUNCTION public.user_owns_pilgrim(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_owns_pilgrim(uuid, uuid) TO authenticated, service_role;

-- === Finding 2 & 3: pilgrim-documents ownership ===
DROP POLICY IF EXISTS "Users can view pilgrim doc files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload pilgrim doc files" ON storage.objects;

-- Path convention: <pilgrim_id>/<filename...>
CREATE POLICY "Users can view own pilgrim doc files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'pilgrim-documents'
    AND public.user_owns_pilgrim(
      auth.uid(),
      NULLIF((storage.foldername(name))[1], '')::uuid
    )
  );

CREATE POLICY "Users can upload own pilgrim doc files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pilgrim-documents'
    AND public.user_owns_pilgrim(
      auth.uid(),
      NULLIF((storage.foldername(name))[1], '')::uuid
    )
  );

CREATE POLICY "Users can update own pilgrim doc files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'pilgrim-documents'
    AND public.user_owns_pilgrim(
      auth.uid(),
      NULLIF((storage.foldername(name))[1], '')::uuid
    )
  );

CREATE POLICY "Users can delete own pilgrim doc files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'pilgrim-documents'
    AND public.user_owns_pilgrim(
      auth.uid(),
      NULLIF((storage.foldername(name))[1], '')::uuid
    )
  );

-- === Finding 4: cms-images / gallery / testimonials write = admin only ===
DROP POLICY IF EXISTS "Authenticated users can upload CMS images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update CMS images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete CMS images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload testimonial photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete testimonial photos" ON storage.objects;

CREATE POLICY "Admins can manage cms-images"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'cms-images' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'cms-images' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage gallery"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'gallery' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'gallery' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage testimonials"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'testimonials' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'testimonials' AND public.is_admin(auth.uid()));

-- === Finding 1: cabut EXECUTE dari SECURITY DEFINER trigger-only functions ===
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_departure_quota_on_booking_paid() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_on_upgrade_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_agent_commission_on_paid() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_site_settings_auth() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_integration_secrets() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.agents_normalize_phone() FROM PUBLIC, anon, authenticated;

-- Cabut juga dari helper internal
REVOKE EXECUTE ON FUNCTION public.get_agent_id_for_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_branch_id(uuid) FROM PUBLIC, anon;

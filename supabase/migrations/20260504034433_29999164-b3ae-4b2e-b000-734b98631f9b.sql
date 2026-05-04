-- 1. Lock down SECURITY DEFINER functions (only used internally by RLS / triggers)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_branch_id(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_agent_id_for_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_on_upgrade_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_departure_quota_on_booking_paid() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;

-- 2. Remove broad SELECT (listing) on public buckets — direct CDN URLs still work for public buckets
DROP POLICY IF EXISTS "Anyone can view blog images" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view CMS images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view testimonial photos" ON storage.objects;

-- 3. payment-proofs bucket: tighten SELECT to admin or owner of the related booking
DROP POLICY IF EXISTS "Users can view own payment proofs" ON storage.objects;
CREATE POLICY "Owners and admins can view payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND (
    public.is_admin(auth.uid())
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
);

-- Make payment-proofs bucket non-public (admin/owner via signed URL or RLS)
UPDATE storage.buckets SET public = false WHERE id = 'payment-proofs';
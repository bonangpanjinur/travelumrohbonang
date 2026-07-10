
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_pilgrim(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.to_idr(numeric, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_booking_code() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.normalize_phone_id(text) FROM PUBLIC, anon;

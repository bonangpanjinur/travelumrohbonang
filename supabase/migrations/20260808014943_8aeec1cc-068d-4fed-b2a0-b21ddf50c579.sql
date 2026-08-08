-- bookings: add WITH CHECK to prevent tampering of sensitive fields on draft updates
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;

CREATE OR REPLACE FUNCTION public.prevent_booking_field_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND OLD.user_id = auth.uid() THEN
    NEW.total_price := OLD.total_price;
    NEW.package_id := OLD.package_id;
    NEW.departure_id := OLD.departure_id;
    NEW.agent_id := OLD.agent_id;
    NEW.branch_id := OLD.branch_id;
    NEW.user_id := OLD.user_id;
    NEW.booking_code := OLD.booking_code;
    NEW.currency := OLD.currency;
    NEW.status := OLD.status;
    NEW.payment_scheme := OLD.payment_scheme;
    NEW.pic_type := OLD.pic_type;
    NEW.pic_id := OLD.pic_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_booking_field_tampering() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prevent_booking_field_tampering ON public.bookings;
CREATE TRIGGER trg_prevent_booking_field_tampering
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_field_tampering();

CREATE POLICY "Users can update own bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) AND (status = 'draft'))
WITH CHECK ((auth.uid() = user_id) AND (status = 'draft'));

-- package_reviews: block self-approval
DROP POLICY IF EXISTS "Users update own reviews" ON public.package_reviews;
CREATE POLICY "Users update own reviews"
ON public.package_reviews
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) AND is_approved = false)
WITH CHECK ((auth.uid() = user_id) AND is_approved = false);

-- pilgrim_testimonials: block self-publish
DROP POLICY IF EXISTS "Users update own unpublished testimonials" ON public.pilgrim_testimonials;
CREATE POLICY "Users update own unpublished testimonials"
ON public.pilgrim_testimonials
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) AND is_published = false)
WITH CHECK ((auth.uid() = user_id) AND is_published = false);
-- Create function to update departure quota when booking is paid
CREATE OR REPLACE FUNCTION public.update_departure_quota_on_booking_paid()
RETURNS TRIGGER AS $$
DECLARE
  pilgrim_count INTEGER;
BEGIN
  -- Only process if status changed to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Count pilgrims for this booking
    SELECT COUNT(*) INTO pilgrim_count
    FROM public.booking_pilgrims
    WHERE booking_id = NEW.id;
    
    -- If no pilgrims found, count from booking_rooms quantity
    IF pilgrim_count = 0 THEN
      SELECT COALESCE(SUM(quantity), 0) INTO pilgrim_count
      FROM public.booking_rooms
      WHERE booking_id = NEW.id;
    END IF;
    
    -- Update the departure remaining quota
    IF NEW.departure_id IS NOT NULL AND pilgrim_count > 0 THEN
      UPDATE public.package_departures
      SET remaining_quota = remaining_quota - pilgrim_count
      WHERE id = NEW.departure_id
        AND remaining_quota >= pilgrim_count;
      
      -- Check if update was successful
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Kuota keberangkatan tidak mencukupi';
      END IF;
    END IF;
  END IF;
  
  -- Handle cancellation - restore quota
  IF NEW.status = 'cancelled' AND OLD.status = 'paid' THEN
    -- Count pilgrims for this booking
    SELECT COUNT(*) INTO pilgrim_count
    FROM public.booking_pilgrims
    WHERE booking_id = NEW.id;
    
    IF pilgrim_count = 0 THEN
      SELECT COALESCE(SUM(quantity), 0) INTO pilgrim_count
      FROM public.booking_rooms
      WHERE booking_id = NEW.id;
    END IF;
    
    -- Restore the quota
    IF NEW.departure_id IS NOT NULL AND pilgrim_count > 0 THEN
      UPDATE public.package_departures
      SET remaining_quota = remaining_quota + pilgrim_count
      WHERE id = NEW.departure_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS trigger_update_quota_on_booking_paid ON public.bookings;
CREATE TRIGGER trigger_update_quota_on_booking_paid
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_departure_quota_on_booking_paid();

-- Add comment for documentation
COMMENT ON FUNCTION public.update_departure_quota_on_booking_paid() IS 
'Automatically updates departure remaining_quota when a booking status changes to paid or cancelled';
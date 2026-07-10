-- Business Logic Triggers untuk UmrohPlus (Local PostgreSQL)
-- Apply ini di Replit PostgreSQL (DATABASE_URL)
-- CATATAN: Trigger handle_new_user yang attach ke auth.users hanya untuk Supabase cloud

-- ============================================================
-- 1. updated_at auto-update trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply ke semua tabel yang punya kolom updated_at
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'updated_at'
      AND table_name IN (
        'users','profiles','packages','departures','bookings',
        'booking_payments','agents','agent_commissions',
        'notifications','site_settings','blog_posts','faqs',
        'coupons','currencies','crm_leads','contracts',
        'hotels','airlines','airports','muthawifs','branches',
        'testimonials','gallery_items','package_categories',
        'pages','navigations','redirects','user_roles'
      )
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;
       CREATE TRIGGER trg_%I_updated_at
         BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- 2. Booking quota guard trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_fn_booking_quota_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_remaining int;
BEGIN
  -- Lock the departure row to prevent concurrent overbooking
  SELECT remaining_quota INTO v_remaining
  FROM public.departures
  WHERE id = NEW.departure_id
  FOR UPDATE;

  IF v_remaining IS NULL THEN
    RAISE EXCEPTION 'Departure % not found', NEW.departure_id;
  END IF;

  IF v_remaining < 1 THEN
    RAISE EXCEPTION 'Kuota penuh untuk keberangkatan ini (remaining_quota = 0)';
  END IF;

  UPDATE public.departures
  SET remaining_quota = remaining_quota - 1
  WHERE id = NEW.departure_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_quota_insert ON public.bookings;
CREATE TRIGGER trg_booking_quota_insert
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_booking_quota_insert();

-- Quota update on cancel/reactivate
CREATE OR REPLACE FUNCTION public.trg_fn_booking_quota_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Restore quota when cancelled
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    UPDATE public.departures
    SET remaining_quota = remaining_quota + 1
    WHERE id = NEW.departure_id;
  END IF;

  -- Deduct quota again when reactivated from cancelled
  IF OLD.status = 'cancelled' AND NEW.status != 'cancelled' THEN
    UPDATE public.departures
    SET remaining_quota = remaining_quota - 1
    WHERE id = NEW.departure_id;
  END IF;

  -- Handle departure reassignment
  IF OLD.departure_id IS DISTINCT FROM NEW.departure_id THEN
    -- Restore to old departure
    IF OLD.status != 'cancelled' THEN
      UPDATE public.departures
      SET remaining_quota = remaining_quota + 1
      WHERE id = OLD.departure_id;
    END IF;
    -- Deduct from new departure
    IF NEW.status != 'cancelled' THEN
      UPDATE public.departures
      SET remaining_quota = remaining_quota - 1
      WHERE id = NEW.departure_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_quota_update ON public.bookings;
CREATE TRIGGER trg_booking_quota_update
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_booking_quota_update();

-- ============================================================
-- 3. Auto-confirm booking when fully paid
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_fn_payment_auto_confirm()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_total_price numeric;
  v_total_paid  numeric;
BEGIN
  IF NEW.status != 'verified' THEN
    RETURN NEW;
  END IF;

  SELECT total_price INTO v_total_price
  FROM public.bookings WHERE id = NEW.booking_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.booking_payments
  WHERE booking_id = NEW.booking_id AND status = 'verified';

  IF v_total_price IS NOT NULL AND v_total_paid >= v_total_price THEN
    UPDATE public.bookings
    SET status = 'confirmed'
    WHERE id = NEW.booking_id AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_payment_auto_confirm ON public.booking_payments;
CREATE TRIGGER trg_booking_payment_auto_confirm
  AFTER INSERT OR UPDATE ON public.booking_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_payment_auto_confirm();

-- ============================================================
-- 4. Auto-create agent commission when booking confirmed
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_fn_booking_commission()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_agent_id    uuid;
  v_commission  numeric;
BEGIN
  -- Only when status changes TO confirmed
  IF OLD.status = NEW.status OR NEW.status != 'confirmed' THEN
    RETURN NEW;
  END IF;

  -- Check if booking has an agent
  IF NEW.agent_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_agent_id FROM public.agents WHERE id = NEW.agent_id LIMIT 1;
  IF v_agent_id IS NULL THEN RETURN NEW; END IF;

  -- Default commission: 2% of total_price
  v_commission := COALESCE(NEW.total_price, 0) * 0.02;

  -- Insert only if not already exists
  INSERT INTO public.agent_commissions (id, agent_id, booking_id, amount, status, created_at)
  VALUES (gen_random_uuid(), NEW.agent_id, NEW.id, v_commission, 'pending', NOW())
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_commission ON public.bookings;
CREATE TRIGGER trg_booking_commission
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_booking_commission();

-- ============================================================
-- 5. Notification trigger on booking status change
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_fn_booking_status_notification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_msg text;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  v_msg := CASE NEW.status
    WHEN 'confirmed'  THEN 'Booking Anda telah dikonfirmasi'
    WHEN 'cancelled'  THEN 'Booking Anda telah dibatalkan'
    WHEN 'pending'    THEN 'Booking Anda sedang menunggu konfirmasi'
    ELSE 'Status booking Anda telah diperbarui menjadi ' || NEW.status
  END;

  INSERT INTO public.notifications (id, user_id, title, message, type, is_read, created_at)
  VALUES (
    gen_random_uuid(),
    NEW.user_id,
    'Update Booking',
    v_msg,
    'booking',
    false,
    NOW()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_status_notification ON public.bookings;
CREATE TRIGGER trg_booking_status_notification
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_booking_status_notification();

-- ============================================================
-- 6. Auto-create profile + user_role on new local user
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_fn_handle_new_local_user()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Create profile if not exists
  INSERT INTO public.profiles (id, user_id, created_at, updated_at)
  VALUES (gen_random_uuid(), NEW.id, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;

  -- Assign buyer role if not exists
  INSERT INTO public.user_roles (id, user_id, role, created_at)
  VALUES (gen_random_uuid(), NEW.id, 'buyer', NOW())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_new_local_user ON public.users;
CREATE TRIGGER trg_handle_new_local_user
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_handle_new_local_user();

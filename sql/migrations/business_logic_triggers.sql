-- ═══════════════════════════════════════════════════════════════════════════
--  Business Logic Triggers — UmrohPlus
--  Status: sudah diterapkan ke production. Riwayat patch — lihat sql/README.md.
--  Jalankan di: local Postgres (Replit) via psql $DATABASE_URL -f <file>
--              Supabase: paste di SQL Editor (skip bagian "Local user profile")
--
--  Trigger yang dibuat:
--  1. updated_at auto-update        → users
--  2. Booking quota management      → package_departures.remaining_quota
--  3. Booking auto-confirm          → bookings.status → 'confirmed'
--  4. Agent commission auto-create  → agent_commissions
--  5. Booking status notification   → notifications
--  6. Local user profile (dev only) → profiles + user_roles on users INSERT
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. UPDATED_AT AUTO-UPDATE
--    Semua tabel yang punya kolom updated_at akan auto-update saat row diubah.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- users (satu-satunya tabel di local DB yang punya updated_at)
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. BOOKING QUOTA MANAGEMENT
--    INSERT booking (status != cancelled) → kurangi remaining_quota
--    UPDATE booking status → 'cancelled'  → tambah remaining_quota kembali
--    UPDATE booking status keluar 'cancelled' → kurangi remaining_quota lagi
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_booking_quota_on_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_remaining INTEGER;
BEGIN
  IF NEW.departure_id IS NOT NULL AND COALESCE(NEW.status, '') != 'cancelled' THEN
    -- Lock the departure row to prevent concurrent oversubscription
    SELECT remaining_quota INTO v_remaining
    FROM package_departures
    WHERE id = NEW.departure_id
    FOR UPDATE;

    IF v_remaining IS NOT NULL AND v_remaining <= 0 THEN
      RAISE EXCEPTION 'Kuota keberangkatan penuh (departure_id: %)', NEW.departure_id
        USING ERRCODE = 'check_violation';
    END IF;

    UPDATE package_departures
    SET remaining_quota = remaining_quota - 1
    WHERE id = NEW.departure_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_quota_insert ON bookings;
CREATE TRIGGER trg_booking_quota_insert
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION fn_booking_quota_on_insert();

-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_booking_quota_on_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_now_cancelled  BOOLEAN;
  v_was_cancelled     BOOLEAN;
  v_departure_changed BOOLEAN;
BEGIN
  v_is_now_cancelled  := NEW.status = 'cancelled';
  v_was_cancelled     := COALESCE(OLD.status, '') = 'cancelled';
  v_departure_changed := OLD.departure_id IS DISTINCT FROM NEW.departure_id;

  -- Case 1: departure changed (booking dipindah ke tanggal lain)
  -- Hanya handle saat booking aktif di kedua sisi; kasus cancel ditangani case 2/3.
  IF v_departure_changed AND NOT v_is_now_cancelled AND NOT v_was_cancelled THEN
    -- Kembalikan slot ke departure lama
    IF OLD.departure_id IS NOT NULL THEN
      UPDATE package_departures
      SET remaining_quota = remaining_quota + 1
      WHERE id = OLD.departure_id;
    END IF;
    -- Kurangi slot dari departure baru (dengan guard kuota)
    IF NEW.departure_id IS NOT NULL THEN
      UPDATE package_departures
      SET remaining_quota = remaining_quota - 1
      WHERE id = NEW.departure_id
        AND remaining_quota > 0;
      IF NOT FOUND AND NEW.departure_id IS NOT NULL THEN
        RAISE EXCEPTION 'Kuota keberangkatan penuh setelah pemindahan (departure_id: %)', NEW.departure_id
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Case 2: booking baru di-cancel, kembalikan slot
  IF v_is_now_cancelled AND NOT v_was_cancelled AND NEW.departure_id IS NOT NULL THEN
    UPDATE package_departures
    SET remaining_quota = remaining_quota + 1
    WHERE id = NEW.departure_id;
  END IF;

  -- Case 3: booking direaktivasi dari cancel, kurangi slot kembali
  IF v_was_cancelled AND NOT v_is_now_cancelled AND NEW.departure_id IS NOT NULL THEN
    UPDATE package_departures
    SET remaining_quota = remaining_quota - 1
    WHERE id = NEW.departure_id
      AND remaining_quota > 0;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Kuota penuh, tidak dapat mengaktifkan ulang booking (departure_id: %)', NEW.departure_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_quota_update ON bookings;
CREATE TRIGGER trg_booking_quota_update
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION fn_booking_quota_on_update();


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. BOOKING AUTO-CONFIRM
--    Setiap kali ada booking_payment baru/diupdate, cek apakah total bayar
--    sudah >= total_price booking. Jika ya, ubah status → 'confirmed'.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_booking_auto_confirm()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_paid    BIGINT;
  v_booking_total BIGINT;
  v_booking_status TEXT;
BEGIN
  -- Ambil total dan status booking
  SELECT total_price, status
  INTO   v_booking_total, v_booking_status
  FROM   bookings
  WHERE  id = NEW.booking_id;

  -- Jangan proses jika sudah confirmed/cancelled/completed
  IF v_booking_status IN ('confirmed', 'cancelled', 'completed') THEN
    RETURN NEW;
  END IF;

  -- Jumlah semua pembayaran yang tidak void
  SELECT COALESCE(SUM(amount), 0)
  INTO   v_total_paid
  FROM   booking_payments
  WHERE  booking_id = NEW.booking_id
    AND  is_voided = false;

  -- Jika sudah lunas → konfirmasi booking
  IF v_total_paid >= v_booking_total THEN
    UPDATE bookings
    SET    status = 'confirmed'
    WHERE  id = NEW.booking_id
      AND  status NOT IN ('confirmed', 'cancelled', 'completed');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_payment_auto_confirm ON booking_payments;
CREATE TRIGGER trg_booking_payment_auto_confirm
  AFTER INSERT OR UPDATE ON booking_payments
  FOR EACH ROW
  EXECUTE FUNCTION fn_booking_auto_confirm();


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. AGENT COMMISSION AUTO-CREATE
--    Saat booking status berubah menjadi 'confirmed' dan ada agent_id,
--    otomatis buat record di agent_commissions (jika belum ada).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_booking_commission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_commission_pct    NUMERIC;
  v_commission_amount BIGINT;
BEGIN
  -- Hanya saat status berubah → 'confirmed'
  IF NEW.status = 'confirmed'
     AND (OLD.status IS NULL OR OLD.status != 'confirmed')
     AND NEW.agent_id IS NOT NULL
  THEN
    -- Cegah duplikat
    IF NOT EXISTS (
      SELECT 1 FROM agent_commissions WHERE booking_id = NEW.id
    ) THEN
      -- Ambil persentase komisi agen
      SELECT COALESCE(commission_percent, 0)
      INTO   v_commission_pct
      FROM   agents
      WHERE  id = NEW.agent_id;

      v_commission_amount := FLOOR(NEW.total_price::NUMERIC * v_commission_pct / 100.0)::BIGINT;

      INSERT INTO agent_commissions (id, booking_id, agent_id, amount, status, created_at)
      VALUES (
        gen_random_uuid(),
        NEW.id,
        NEW.agent_id,
        v_commission_amount,
        'pending',
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_commission ON bookings;
CREATE TRIGGER trg_booking_commission
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION fn_booking_commission();


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. BOOKING STATUS NOTIFICATION
--    Saat status booking berubah, buat notifikasi otomatis untuk user.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_booking_status_notification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_title   TEXT;
  v_message TEXT;
BEGIN
  -- Hanya jika status benar-benar berubah dan user_id ada
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  CASE NEW.status
    WHEN 'confirmed' THEN
      v_title   := 'Booking Dikonfirmasi ✅';
      v_message := 'Booking Anda (' || NEW.booking_code || ') telah dikonfirmasi. Selamat menunaikan ibadah!';

    WHEN 'cancelled' THEN
      v_title   := 'Booking Dibatalkan';
      v_message := 'Booking Anda (' || NEW.booking_code || ') telah dibatalkan. Hubungi kami jika ada pertanyaan.';

    WHEN 'dp_paid' THEN
      v_title   := 'Pembayaran DP Diterima 💳';
      v_message := 'Pembayaran DP untuk booking ' || NEW.booking_code || ' telah kami terima. Silakan lunasi sebelum batas waktu.';

    WHEN 'fully_paid' THEN
      v_title   := 'Pembayaran Lunas ✅';
      v_message := 'Pembayaran untuk booking ' || NEW.booking_code || ' sudah lunas. Terima kasih!';

    WHEN 'processing' THEN
      v_title   := 'Booking Sedang Diproses';
      v_message := 'Booking Anda (' || NEW.booking_code || ') sedang kami proses. Mohon tunggu konfirmasi selanjutnya.';

    ELSE
      -- Status lain tidak dikirim notifikasi
      RETURN NEW;
  END CASE;

  INSERT INTO notifications (id, user_id, title, message, is_read, created_at)
  VALUES (gen_random_uuid(), NEW.user_id, v_title, v_message, false, NOW());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_status_notification ON bookings;
CREATE TRIGGER trg_booking_status_notification
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION fn_booking_status_notification();


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. [REMOVED 2026-07-08 — P0-3 fix] LOCAL USER PROFILE AUTO-CREATE
--    This trigger targeted the legacy `public.users` table (Replit Auth
--    scaffold remnant). The app only ever writes users through Supabase Auth
--    (`auth.users`), which already has its own trigger — `on_auth_user_created`
--    on `auth.users`, defined in add_new_user_profile_trigger.sql. `public.users`
--    is never inserted into by any app code path, so this trigger was 100% dead
--    (confirmed empty table + no INSERT call sites) but still live in the DB,
--    creating confusion about which trigger actually creates profiles/roles.
--    Dropped both the trigger and its function (`fn_handle_new_local_user`)
--    directly against the live Supabase DB. Do not recreate — if local/dev
--    Postgres ever needs this again, wire it to the same Supabase Auth flow
--    instead of a separate `public.users` shadow table.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFIKASI — tampilkan semua trigger yang baru dibuat
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  trigger_name,
  event_object_table  AS "table",
  event_manipulation  AS "event",
  action_timing       AS "timing"
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name NOT LIKE 'RI_%'
ORDER BY event_object_table, trigger_name;

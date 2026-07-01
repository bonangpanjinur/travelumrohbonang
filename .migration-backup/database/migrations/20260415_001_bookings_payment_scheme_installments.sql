
-- 1. Add payment_scheme to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_scheme text DEFAULT 'full';

-- 2. Create installment_schedules table
CREATE TABLE IF NOT EXISTS public.installment_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamp with time zone,
  payment_id uuid REFERENCES public.payments(id),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.installment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage installments"
  ON public.installment_schedules FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own installments"
  ON public.installment_schedules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = installment_schedules.booking_id AND b.user_id = auth.uid()
  ));

CREATE INDEX idx_installment_schedules_booking ON public.installment_schedules(booking_id);
CREATE INDEX idx_installment_schedules_status ON public.installment_schedules(status);
CREATE INDEX idx_installment_schedules_due_date ON public.installment_schedules(due_date);

-- 3. Create flight_details table
CREATE TABLE IF NOT EXISTS public.flight_details (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id uuid NOT NULL REFERENCES public.package_departures(id) ON DELETE CASCADE,
  flight_type text NOT NULL DEFAULT 'departure',
  flight_number text,
  airline text,
  departure_airport text,
  arrival_airport text,
  departure_time timestamp with time zone,
  arrival_time timestamp with time zone,
  terminal text,
  gate text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.flight_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage flight details"
  ON public.flight_details FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Public can read flight details"
  ON public.flight_details FOR SELECT
  USING (true);

CREATE INDEX idx_flight_details_departure ON public.flight_details(departure_id);

-- 4. Trigger for updated_at
CREATE TRIGGER update_installment_schedules_updated_at
  BEFORE UPDATE ON public.installment_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_flight_details_updated_at
  BEFORE UPDATE ON public.flight_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.installment_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;

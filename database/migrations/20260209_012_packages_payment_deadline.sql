-- Add deadline fields to packages table
ALTER TABLE public.packages 
ADD COLUMN dp_deadline_days integer DEFAULT 30,
ADD COLUMN full_deadline_days integer DEFAULT 7;

COMMENT ON COLUMN public.packages.dp_deadline_days IS 'Days before departure when DP must be paid';
COMMENT ON COLUMN public.packages.full_deadline_days IS 'Days before departure when full payment must be completed';

-- Add deadline to payments table
ALTER TABLE public.payments 
ADD COLUMN deadline timestamp with time zone;

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage all notifications"
ON public.notifications FOR ALL
USING (is_admin(auth.uid()));
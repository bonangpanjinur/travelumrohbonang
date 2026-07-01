
-- Create payment gateway transactions table
CREATE TABLE public.payment_gateway_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  gateway text NOT NULL, -- 'midtrans' or 'xendit'
  gateway_transaction_id text, -- external transaction ID
  payment_method text, -- 'bank_transfer', 'ewallet', 'qris', 'credit_card'
  bank_code text, -- 'bca', 'bni', 'bri', 'mandiri', 'permata'
  va_number text, -- virtual account number
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'expired', 'failed', 'cancelled'
  expiry_time timestamp with time zone,
  paid_at timestamp with time zone,
  callback_data jsonb,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_gateway_transactions ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can manage all
CREATE POLICY "Admins can manage gateway transactions"
  ON public.payment_gateway_transactions FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- RLS: Users can view own transactions via booking
CREATE POLICY "Users can view own gateway transactions"
  ON public.payment_gateway_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = payment_gateway_transactions.booking_id
        AND b.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_gateway_transactions_updated_at
  BEFORE UPDATE ON public.payment_gateway_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Index for faster lookups
CREATE INDEX idx_gateway_tx_booking ON public.payment_gateway_transactions(booking_id);
CREATE INDEX idx_gateway_tx_status ON public.payment_gateway_transactions(status);
CREATE INDEX idx_gateway_tx_gateway_id ON public.payment_gateway_transactions(gateway_transaction_id);

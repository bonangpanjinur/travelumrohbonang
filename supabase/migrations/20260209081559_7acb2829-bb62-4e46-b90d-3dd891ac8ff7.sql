-- Add minimum_dp field to packages table
ALTER TABLE public.packages 
ADD COLUMN minimum_dp numeric DEFAULT 0;

-- Add payment_type field to payments table to track DP vs installment vs full
ALTER TABLE public.payments 
ADD COLUMN payment_type text DEFAULT 'full';

COMMENT ON COLUMN public.packages.minimum_dp IS 'Minimum down payment amount for this package';
COMMENT ON COLUMN public.payments.payment_type IS 'Type of payment: dp, installment, full';
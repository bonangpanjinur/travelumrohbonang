-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', true);

-- Create policies for payment proofs bucket
CREATE POLICY "Users can upload payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own payment proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs');

CREATE POLICY "Admins can manage all payment proofs"
ON storage.objects FOR ALL
USING (bucket_id = 'payment-proofs' AND is_admin(auth.uid()));

-- Add remaining_quota column if not exists and other improvements
ALTER TABLE package_departures ADD COLUMN IF NOT EXISTS return_date DATE;
ALTER TABLE muthawifs ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE airlines ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE airports ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE booking_pilgrims ADD COLUMN IF NOT EXISTS nik TEXT;
ALTER TABLE booking_pilgrims ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE booking_pilgrims ADD COLUMN IF NOT EXISTS passport_number TEXT;
ALTER TABLE booking_pilgrims ADD COLUMN IF NOT EXISTS passport_expiry DATE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS proof_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_by UUID;
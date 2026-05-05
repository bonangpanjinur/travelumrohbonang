-- Audit log for payment-proof access
CREATE TABLE IF NOT EXISTS public.payment_proof_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  proof_path text NOT NULL,
  context text,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proof_access_logs_user ON public.payment_proof_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_proof_access_logs_path ON public.payment_proof_access_logs(proof_path);
CREATE INDEX IF NOT EXISTS idx_proof_access_logs_created ON public.payment_proof_access_logs(created_at DESC);

ALTER TABLE public.payment_proof_access_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users may insert logs only for themselves
DROP POLICY IF EXISTS "Users insert own proof access log" ON public.payment_proof_access_logs;
CREATE POLICY "Users insert own proof access log"
ON public.payment_proof_access_logs
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Only admins can view logs
DROP POLICY IF EXISTS "Admins view proof access logs" ON public.payment_proof_access_logs;
CREATE POLICY "Admins view proof access logs"
ON public.payment_proof_access_logs
FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- Tighten payment-proofs bucket policies
UPDATE storage.buckets SET public = false WHERE id = 'payment-proofs';

-- Drop any old SELECT policies on payment-proofs to ensure single source of truth
DROP POLICY IF EXISTS "Owners and admins can view payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Public read payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view payment proofs" ON storage.objects;

CREATE POLICY "Owners and admins can view payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND (
    public.is_admin(auth.uid())
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
);

-- Restrict UPDATE/DELETE on payment-proofs to owner or admin
DROP POLICY IF EXISTS "Owners and admins can update payment proofs" ON storage.objects;
CREATE POLICY "Owners and admins can update payment proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND (
    public.is_admin(auth.uid())
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "Owners and admins can delete payment proofs" ON storage.objects;
CREATE POLICY "Owners and admins can delete payment proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND (
    public.is_admin(auth.uid())
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
);
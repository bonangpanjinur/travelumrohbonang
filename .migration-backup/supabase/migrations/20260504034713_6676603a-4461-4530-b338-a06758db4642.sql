DROP POLICY IF EXISTS "Users can upload payment proofs" ON storage.objects;
CREATE POLICY "Users can upload own payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
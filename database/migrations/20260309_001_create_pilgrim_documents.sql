
-- Create pilgrim_documents table
CREATE TABLE public.pilgrim_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pilgrim_id uuid NOT NULL REFERENCES public.booking_pilgrims(id) ON DELETE CASCADE,
  doc_type text NOT NULL, -- 'paspor', 'visa', 'ktp', 'foto', 'surat_mahram', 'lainnya'
  file_url text,
  file_name text,
  status text NOT NULL DEFAULT 'belum_upload', -- 'belum_upload', 'uploaded', 'verified', 'rejected', 'expired'
  expiry_date date,
  notes text,
  verified_by uuid,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pilgrim_documents ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can do everything
CREATE POLICY "Admins can manage pilgrim documents"
  ON public.pilgrim_documents FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- RLS: Users can view documents of their own bookings
CREATE POLICY "Users can view own pilgrim documents"
  ON public.pilgrim_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.booking_pilgrims bp
      JOIN public.bookings b ON b.id = bp.booking_id
      WHERE bp.id = pilgrim_documents.pilgrim_id
        AND b.user_id = auth.uid()
    )
  );

-- RLS: Users can upload documents for their own bookings
CREATE POLICY "Users can insert own pilgrim documents"
  ON public.pilgrim_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.booking_pilgrims bp
      JOIN public.bookings b ON b.id = bp.booking_id
      WHERE bp.id = pilgrim_documents.pilgrim_id
        AND b.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_pilgrim_documents_updated_at
  BEFORE UPDATE ON public.pilgrim_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create storage bucket for pilgrim documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('pilgrim-documents', 'pilgrim-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Admins can do everything
CREATE POLICY "Admins can manage pilgrim doc files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'pilgrim-documents' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'pilgrim-documents' AND public.is_admin(auth.uid()));

-- Storage RLS: Authenticated users can upload
CREATE POLICY "Users can upload pilgrim doc files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pilgrim-documents');

-- Storage RLS: Authenticated users can view
CREATE POLICY "Users can view pilgrim doc files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'pilgrim-documents');

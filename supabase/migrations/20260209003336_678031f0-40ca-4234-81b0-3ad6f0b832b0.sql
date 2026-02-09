-- Create storage bucket for CMS images
INSERT INTO storage.buckets (id, name, public)
VALUES ('cms-images', 'cms-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to CMS images
CREATE POLICY "Public can view CMS images"
ON storage.objects FOR SELECT
USING (bucket_id = 'cms-images');

-- Allow authenticated users (admins) to upload CMS images
CREATE POLICY "Authenticated users can upload CMS images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cms-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update CMS images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'cms-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete CMS images
CREATE POLICY "Authenticated users can delete CMS images"
ON storage.objects FOR DELETE
USING (bucket_id = 'cms-images' AND auth.role() = 'authenticated');
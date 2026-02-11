-- 1. Buat bucket 'cms_images' jika belum ada
INSERT INTO storage.buckets (id, name, public)
VALUES ('cms_images', 'cms_images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Berikan akses publik untuk melihat file
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'cms_images' );

-- 3. Berikan akses bagi user yang terautentikasi untuk mengunggah file
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'cms_images' );

-- 4. Berikan akses bagi user yang terautentikasi untuk memperbarui file
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'cms_images' );

-- 5. Berikan akses bagi user yang terautentikasi untuk menghapus file
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'cms_images' );

-- Create gallery table
CREATE TABLE public.gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  category TEXT DEFAULT 'umroh',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can read gallery" ON public.gallery
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage gallery" ON public.gallery
  FOR ALL USING (is_admin(auth.uid()));

-- Create storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for gallery bucket
CREATE POLICY "Public can view gallery images"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery');

CREATE POLICY "Authenticated users can upload gallery images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'gallery' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update gallery images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'gallery' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete gallery images"
ON storage.objects FOR DELETE
USING (bucket_id = 'gallery' AND auth.role() = 'authenticated');

-- Insert default background pattern setting
INSERT INTO public.settings (key, value)
VALUES ('background_pattern', 'islamic')
ON CONFLICT (key) DO NOTHING;
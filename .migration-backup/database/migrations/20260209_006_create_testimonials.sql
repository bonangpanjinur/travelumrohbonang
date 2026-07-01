-- Create testimonials table
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  package_name TEXT,
  photo_url TEXT,
  rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL,
  travel_date DATE,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can read testimonials" ON public.testimonials
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage testimonials" ON public.testimonials
  FOR ALL USING (is_admin(auth.uid()));

-- Create storage bucket for testimonial photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('testimonials', 'testimonials', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public can view testimonial photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'testimonials');

CREATE POLICY "Authenticated users can upload testimonial photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'testimonials' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete testimonial photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'testimonials' AND auth.role() = 'authenticated');
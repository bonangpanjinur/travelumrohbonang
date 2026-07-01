-- Create FAQ table
CREATE TABLE public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Anyone can view active FAQs" ON public.faqs
  FOR SELECT USING (is_active = true);

-- Admin full access
CREATE POLICY "Admins can manage FAQs" ON public.faqs
  FOR ALL USING (public.is_admin(auth.uid()));

-- Create floating_buttons table for social media settings
CREATE TABLE public.floating_buttons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  url TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.floating_buttons ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Anyone can view active floating buttons" ON public.floating_buttons
  FOR SELECT USING (is_active = true);

-- Admin full access
CREATE POLICY "Admins can manage floating buttons" ON public.floating_buttons
  FOR ALL USING (public.is_admin(auth.uid()));

-- Insert default floating buttons
INSERT INTO public.floating_buttons (platform, label, url, icon, is_active, sort_order) VALUES
  ('whatsapp', 'WhatsApp', 'https://wa.me/6281234567890', 'MessageCircle', true, 1),
  ('instagram', 'Instagram', 'https://instagram.com/umrohplus', 'Instagram', false, 2),
  ('facebook', 'Facebook', 'https://facebook.com/umrohplus', 'Facebook', false, 3),
  ('tiktok', 'TikTok', 'https://tiktok.com/@umrohplus', 'Music2', false, 4),
  ('youtube', 'YouTube', 'https://youtube.com/umrohplus', 'Youtube', false, 5),
  ('telegram', 'Telegram', 'https://t.me/umrohplus', 'Send', false, 6);
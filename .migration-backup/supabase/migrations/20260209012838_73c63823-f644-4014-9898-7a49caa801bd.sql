-- Add parent_id to package_categories for hierarchy support
ALTER TABLE public.package_categories 
ADD COLUMN parent_id uuid REFERENCES public.package_categories(id) ON DELETE SET NULL;

-- Add sort_order and is_active columns
ALTER TABLE public.package_categories 
ADD COLUMN sort_order integer DEFAULT 0,
ADD COLUMN is_active boolean DEFAULT true;

-- Create index for faster parent lookups
CREATE INDEX idx_package_categories_parent ON public.package_categories(parent_id);

-- Create navigation_items table for dynamic navigation
CREATE TABLE public.navigation_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL,
  url text NOT NULL,
  parent_id uuid REFERENCES public.navigation_items(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  open_in_new_tab boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage navigation items"
ON public.navigation_items
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Public can read active navigation items"
ON public.navigation_items
FOR SELECT
USING (is_active = true);

-- Insert default main categories
INSERT INTO public.package_categories (name, description, sort_order, is_active) VALUES
('Umroh', 'Paket perjalanan umroh', 1, true),
('Haji', 'Paket perjalanan haji', 2, true);

-- Get the IDs for parent categories and insert sub-categories
WITH parent_cats AS (
  SELECT id, name FROM public.package_categories WHERE parent_id IS NULL
)
INSERT INTO public.package_categories (name, description, parent_id, sort_order, is_active)
SELECT 'Ekonomi', 'Paket hemat dan terjangkau', id, 1, true FROM parent_cats WHERE name = 'Umroh'
UNION ALL
SELECT 'Plus', 'Paket dengan fasilitas tambahan', id, 2, true FROM parent_cats WHERE name = 'Umroh'
UNION ALL
SELECT 'VIP', 'Paket premium dengan layanan terbaik', id, 3, true FROM parent_cats WHERE name = 'Umroh'
UNION ALL
SELECT 'Reguler', 'Paket haji reguler', id, 1, true FROM parent_cats WHERE name = 'Haji'
UNION ALL
SELECT 'Plus', 'Paket haji dengan fasilitas tambahan', id, 2, true FROM parent_cats WHERE name = 'Haji';

-- Insert default navigation items
INSERT INTO public.navigation_items (label, url, sort_order, is_active) VALUES
('Beranda', '/', 1, true),
('Paket', '/paket', 2, true),
('Galeri', '/galeri', 3, true),
('Blog', '/blog', 4, true),
('Tentang Kami', '/tentang', 5, true),
('Kontak', '/#kontak', 6, true);
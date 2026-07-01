
-- Tabel relasi package_hotels untuk hotel tambahan (selain Makkah & Madinah)
CREATE TABLE public.package_hotels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  label TEXT, -- e.g. "Hotel Istanbul", "Hotel Mina"
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.package_hotels ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage package hotels"
ON public.package_hotels FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Public can read package hotels"
ON public.package_hotels FOR SELECT
USING (true);

-- Index for performance
CREATE INDEX idx_package_hotels_package_id ON public.package_hotels(package_id);

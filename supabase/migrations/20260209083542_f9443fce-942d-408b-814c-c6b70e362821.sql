
-- Create package_commissions table
CREATE TABLE public.package_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  pic_type text NOT NULL, -- 'cabang', 'agen', 'karyawan'
  commission_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(package_id, pic_type)
);

-- Enable RLS
ALTER TABLE public.package_commissions ENABLE ROW LEVEL SECURITY;

-- Admin can manage
CREATE POLICY "Admins can manage package commissions"
ON public.package_commissions
FOR ALL
USING (is_admin(auth.uid()));

-- Public can read
CREATE POLICY "Public can read package commissions"
ON public.package_commissions
FOR SELECT
USING (true);

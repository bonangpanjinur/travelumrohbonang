
-- Create tenant_sites table
CREATE TABLE public.tenant_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  subdomain text NOT NULL UNIQUE,
  custom_domain text UNIQUE,
  site_name text NOT NULL,
  tagline text DEFAULT '',
  logo_url text DEFAULT '',
  primary_color text DEFAULT '#166534',
  secondary_color text DEFAULT '#d4af37',
  hero_image_url text DEFAULT '',
  hero_title text DEFAULT '',
  hero_subtitle text DEFAULT '',
  about_text text DEFAULT '',
  whatsapp_number text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  address text DEFAULT '',
  instagram_url text DEFAULT '',
  facebook_url text DEFAULT '',
  is_active boolean DEFAULT true,
  template text DEFAULT 'classic',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_sites ENABLE ROW LEVEL SECURITY;

-- Public can read active tenant sites
CREATE POLICY "Public can read active tenant sites"
  ON public.tenant_sites FOR SELECT
  USING (is_active = true);

-- Admins can manage all tenant sites
CREATE POLICY "Admins can manage tenant sites"
  ON public.tenant_sites FOR ALL
  USING (is_admin(auth.uid()));

-- Owners can update their own tenant site
CREATE POLICY "Owners can update own tenant site"
  ON public.tenant_sites FOR UPDATE
  USING (auth.uid() = owner_id);

-- Create tenant_site_packages junction table
CREATE TABLE public.tenant_site_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_site_id uuid NOT NULL REFERENCES public.tenant_sites(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_site_id, package_id)
);

ALTER TABLE public.tenant_site_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read tenant site packages"
  ON public.tenant_site_packages FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tenant site packages"
  ON public.tenant_site_packages FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Owners can manage own tenant site packages"
  ON public.tenant_site_packages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.tenant_sites ts
    WHERE ts.id = tenant_site_packages.tenant_site_id
    AND ts.owner_id = auth.uid()
  ));


-- Template pricing table
CREATE TABLE public.template_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name text NOT NULL UNIQUE,
  price numeric NOT NULL DEFAULT 0,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.template_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage template pricing" ON public.template_pricing FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Public can read active template pricing" ON public.template_pricing FOR SELECT USING (is_active = true);

-- Template upgrade orders table
CREATE TABLE public.template_upgrade_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_site_id uuid NOT NULL REFERENCES public.tenant_sites(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  current_template text NOT NULL,
  target_template text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  proof_url text,
  notes text,
  admin_notes text,
  confirmed_by uuid,
  confirmed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.template_upgrade_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage upgrade orders" ON public.template_upgrade_orders FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Users can view own upgrade orders" ON public.template_upgrade_orders FOR SELECT USING (auth.uid() = requested_by);
CREATE POLICY "Users can create upgrade orders" ON public.template_upgrade_orders FOR INSERT WITH CHECK (auth.uid() = requested_by);

-- Trigger for updated_at
CREATE TRIGGER update_template_pricing_updated_at BEFORE UPDATE ON public.template_pricing FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_template_upgrade_orders_updated_at BEFORE UPDATE ON public.template_upgrade_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed default pricing
INSERT INTO public.template_pricing (template_name, price, description) VALUES
  ('modern', 500000, 'Template Modern dengan navbar transparan, layout split hero, dan desain kontemporer'),
  ('premium', 1000000, 'Template Premium dengan animasi Framer Motion, efek sinematik, dan glass-morphism');

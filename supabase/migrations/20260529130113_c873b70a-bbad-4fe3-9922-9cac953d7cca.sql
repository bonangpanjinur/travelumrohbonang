
-- Restrict agents table public access (phone/email harvesting risk)
DROP POLICY IF EXISTS "Public can read agents" ON public.agents;

CREATE POLICY "Authenticated users can read active agents"
ON public.agents FOR SELECT
TO authenticated
USING (is_active = true);

-- Restrict package_commissions to admins only (sensitive business data)
DROP POLICY IF EXISTS "Public can read package commissions" ON public.package_commissions;

-- 1) Restrict public read on settings (contains bank account details)
DROP POLICY IF EXISTS "Public can read settings" ON public.settings;

CREATE POLICY "Authenticated can read settings"
ON public.settings
FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.settings FROM anon;
GRANT SELECT ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;

-- 2) SECURITY DEFINER function not used by any RLS policy: revoke direct execution
REVOKE ALL ON FUNCTION public.get_agent_id_for_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_agent_id_for_user(uuid) TO service_role;

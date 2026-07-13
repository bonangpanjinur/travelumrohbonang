
-- 1) Fix agents PII exposure: drop broad policy, create limited view
DROP POLICY IF EXISTS "Authenticated users can read active agents" ON public.agents;

CREATE OR REPLACE VIEW public.agents_public
WITH (security_invoker = true) AS
SELECT id, name, branch_id, referral_code, is_active
FROM public.agents
WHERE is_active = true;

GRANT SELECT ON public.agents_public TO anon, authenticated;

-- 2) Tighten SECURITY DEFINER function execution: revoke from PUBLIC, grant only where needed.
-- RLS-critical helpers stay callable by authenticated; trigger-only and admin-only helpers are locked down.
REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_owns_pilgrim(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_agent_id_for_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_branch_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.to_idr(numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_booking_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_phone_id(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_owns_pilgrim(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_agent_id_for_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_branch_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.to_idr(numeric, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_booking_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.normalize_phone_id(text) TO service_role;

-- Trigger-only functions: revoke from all app roles (only postgres/trigger context invokes them)
REVOKE ALL ON FUNCTION public.audit_integration_secrets() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_site_settings_auth() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_agent_commission_on_paid() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admins_on_upgrade_order() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_departure_quota_on_booking_paid() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.agents_normalize_phone() FROM PUBLIC, anon, authenticated;

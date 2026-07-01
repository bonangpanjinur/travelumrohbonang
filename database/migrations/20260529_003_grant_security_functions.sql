GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_branch_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_agent_id_for_user(uuid) TO anon, authenticated;
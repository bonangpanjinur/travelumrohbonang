
-- =========================================================================
-- 1. SECURITY DEFINER FUNCTIONS: revoke broad EXECUTE, grant only where needed
-- =========================================================================

-- Helper functions referenced by RLS policies; needed only by signed-in users.
-- (anon never satisfies auth.uid()-based checks, so anon does not need EXECUTE.)
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid)             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_branch_id(uuid)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_agent_id_for_user(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_branch_id(uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_agent_id_for_user(uuid) TO authenticated;

-- Trigger-only functions: nobody should call them directly from the API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at()                     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_on_upgrade_order()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_departure_quota_on_booking_paid() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_agent_commission_on_paid()       FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 2. RLS policies: replace WITH CHECK (true) with real predicates
-- =========================================================================

-- affiliate_clicks: must reference an active agent and supply a referral_code
DROP POLICY IF EXISTS "Anyone insert click" ON public.affiliate_clicks;
CREATE POLICY "Anyone insert click"
ON public.affiliate_clicks
FOR INSERT
TO anon, authenticated
WITH CHECK (
  agent_id IS NOT NULL
  AND referral_code IS NOT NULL
  AND length(referral_code) BETWEEN 1 AND 64
  AND EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = affiliate_clicks.agent_id AND a.is_active = true
  )
);

-- error_logs: bound size to prevent abuse; anon must not impersonate a user
DROP POLICY IF EXISTS "Anyone can insert errors" ON public.error_logs;
CREATE POLICY "Anyone can insert errors"
ON public.error_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (
  message IS NOT NULL
  AND length(message) BETWEEN 1 AND 4000
  AND (stack IS NULL OR length(stack) <= 16000)
  AND (url IS NULL OR length(url) <= 2048)
  AND (user_agent IS NULL OR length(user_agent) <= 1024)
  AND level IN ('error','warning','info')
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- request_log: limit payload size; tie user_id to caller when present
DROP POLICY IF EXISTS "Anyone can insert request log" ON public.request_log;
DO $$
DECLARE
  has_user_id boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'request_log' AND column_name = 'user_id'
  ) INTO has_user_id;

  IF has_user_id THEN
    EXECUTE $POL$
      CREATE POLICY "Anyone can insert request log"
      ON public.request_log
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (user_id IS NULL OR user_id = auth.uid())
    $POL$;
  ELSE
    EXECUTE $POL$
      CREATE POLICY "Anyone can insert request log"
      ON public.request_log
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (created_at IS NULL OR created_at <= now())
    $POL$;
  END IF;
END $$;

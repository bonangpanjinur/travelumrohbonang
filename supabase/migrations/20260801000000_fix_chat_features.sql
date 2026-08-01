-- Fix Chat Features: is_admin, Guest RLS, and Metadata Triggers
-- Based on recommendations in docs/analysis/chat_feature_analysis.md

-- 1. Update is_admin function to include staff and branch_manager roles
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role IN ('super_admin', 'owner', 'admin', 'branch_manager', 'staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;

-- 2. Update Grants for anon access
GRANT SELECT ON public.conversations TO anon;
GRANT SELECT ON public.conversation_messages TO anon;

-- 3. Update RLS for conversations to allow anon with guest_token
-- We use current_setting('request.headers') to get the X-Guest-Token from the request
DROP POLICY IF EXISTS "conversations_select_own_or_admin" ON public.conversations;
CREATE POLICY "conversations_select_own_or_admin"
  ON public.conversations
  FOR SELECT
  USING (
    (auth.role() = 'authenticated' AND (user_id = auth.uid()::text OR public.is_admin(auth.uid())))
    OR
    (auth.role() = 'anon' AND guest_token = current_setting('request.headers', true)::json->>'x-guest-token')
  );

-- 4. Update RLS for conversation_messages to allow anon
DROP POLICY IF EXISTS "conv_messages_select_own_or_admin" ON public.conversation_messages;
CREATE POLICY "conv_messages_select_own_or_admin"
  ON public.conversation_messages
  FOR SELECT
  USING (
    (auth.role() = 'authenticated' AND public.is_admin(auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_messages.conversation_id
        AND (
          (auth.role() = 'authenticated' AND c.user_id = auth.uid()::text)
          OR
          (auth.role() = 'anon' AND c.guest_token = current_setting('request.headers', true)::json->>'x-guest-token')
        )
    )
  );

-- 5. Add Triggers for metadata automation (last_message_at, preview, unread counts)
CREATE OR REPLACE FUNCTION public.fn_update_conversation_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.message, 100),
    unread_admin = CASE WHEN NEW.sender_type = 'admin' THEN 0 ELSE unread_admin + 1 END,
    unread_user = CASE WHEN NEW.sender_type = 'admin' THEN unread_user + 1 ELSE 0 END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_conversation_metadata ON public.conversation_messages;
CREATE TRIGGER tr_update_conversation_metadata
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_conversation_metadata();

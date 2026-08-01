-- fix(chat): resolve pending issues - UUID type mismatch, RLS optimization, and notification scalability
-- This migration drops policies first to avoid the "cannot alter type of a column used in a policy definition" error.

-- 1. Drop dependent policies temporarily
DROP POLICY IF EXISTS "conversations_select_own_or_admin" ON public.conversations;
DROP POLICY IF EXISTS "conv_messages_select_own_or_admin" ON public.conversation_messages;

-- 2. Alter column types from TEXT to UUID
-- Conversations table
ALTER TABLE public.conversations 
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid,
  ALTER COLUMN assigned_admin_id TYPE uuid USING assigned_admin_id::uuid;

-- Conversation Messages table
ALTER TABLE public.conversation_messages
  ALTER COLUMN sender_id TYPE uuid USING sender_id::uuid;

-- 3. Re-create optimized policies with UUID support
-- Policy for conversations
CREATE POLICY "conversations_select_own_or_admin"
  ON public.conversations
  FOR SELECT
  USING (
    (auth.role() = 'authenticated' AND (user_id = auth.uid() OR public.is_admin(auth.uid())))
    OR
    (auth.role() = 'anon' AND guest_token = current_setting('request.headers', true)::json->>'x-guest-token')
  );

-- Policy for conversation_messages (optimized using IN subquery)
CREATE POLICY "conv_messages_select_own_or_admin"
  ON public.conversation_messages
  FOR SELECT
  USING (
    (auth.role() = 'authenticated' AND public.is_admin(auth.uid()))
    OR
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE 
        (auth.role() = 'authenticated' AND user_id = auth.uid())
        OR
        (auth.role() = 'anon' AND guest_token = current_setting('request.headers', true)::json->>'x-guest-token')
    )
  );

-- ============================================================
-- Live Chat fix: RLS, GRANT, dan Realtime untuk tabel percakapan
--
-- Perbaikan: user_id sekarang bertipe UUID, sehingga perbandingan
-- dengan auth.uid() tidak memerlukan casting ::text lagi.
-- ============================================================

-- ── Grants ────────────────────────────────────────────────────
GRANT SELECT ON public.conversations TO authenticated;
GRANT SELECT ON public.conversation_messages TO authenticated;
GRANT ALL ON public.conversations TO service_role;
GRANT ALL ON public.conversation_messages TO service_role;

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select_own_or_admin" ON public.conversations;
CREATE POLICY "conversations_select_own_or_admin"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "conv_messages_select_own_or_admin" ON public.conversation_messages;
CREATE POLICY "conv_messages_select_own_or_admin"
  ON public.conversation_messages
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

-- ── Realtime ──────────────────────────────────────────────────
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public' AND tablename = 'conversations'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public' AND tablename = 'conversation_messages'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages';
    END IF;
  END IF;
END
$$;

-- Access log for private pilgrim document signed URLs
CREATE TABLE IF NOT EXISTS public.pilgrim_doc_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  pilgrim_id uuid,
  doc_type text,
  storage_path text NOT NULL,
  context text,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pilgrim_doc_access_logs TO authenticated;
GRANT INSERT ON public.pilgrim_doc_access_logs TO authenticated;
GRANT ALL ON public.pilgrim_doc_access_logs TO service_role;

ALTER TABLE public.pilgrim_doc_access_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pilgrim_doc_access_logs' AND policyname = 'Admins view doc access logs') THEN
    CREATE POLICY "Admins view doc access logs"
      ON public.pilgrim_doc_access_logs
      FOR SELECT
      TO authenticated
      USING (public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pilgrim_doc_access_logs' AND policyname = 'Users insert own doc access log') THEN
    CREATE POLICY "Users insert own doc access log"
      ON public.pilgrim_doc_access_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pilgrim_doc_access_logs_user ON public.pilgrim_doc_access_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pilgrim_doc_access_logs_pilgrim ON public.pilgrim_doc_access_logs(pilgrim_id, created_at DESC);
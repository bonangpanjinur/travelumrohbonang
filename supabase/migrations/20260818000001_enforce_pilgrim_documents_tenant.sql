-- Enforce tenant ownership for pilgrim documents.
-- Safe to run once through the project's migration runner.

ALTER TABLE public.pilgrim_documents
  ADD COLUMN IF NOT EXISTS branch_id text;

UPDATE public.pilgrim_documents d
SET branch_id = COALESCE(b.branch_id, 'hq')
FROM public.bookings b
WHERE b.id = d.booking_id
  AND d.branch_id IS NULL;

UPDATE public.pilgrim_documents
SET branch_id = 'hq'
WHERE branch_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pilgrim_documents_branch_id_fkey'
      AND conrelid = 'public.pilgrim_documents'::regclass
  ) THEN
    ALTER TABLE public.pilgrim_documents
      ADD CONSTRAINT pilgrim_documents_branch_id_fkey
      FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE public.pilgrim_documents
  ALTER COLUMN branch_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pilgrim_docs_branch_id
  ON public.pilgrim_documents(branch_id);

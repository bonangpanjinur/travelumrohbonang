
ALTER TABLE public.faqs
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.packages(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_faqs_scope ON public.faqs(scope) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_faqs_package_id ON public.faqs(package_id) WHERE package_id IS NOT NULL;

-- Soft constraint: scope must be one of allowed values
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'faqs_scope_check') THEN
    ALTER TABLE public.faqs ADD CONSTRAINT faqs_scope_check
      CHECK (scope IN ('general','paket','package'));
  END IF;
END $$;

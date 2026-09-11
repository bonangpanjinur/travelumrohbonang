-- Agent directory/profile upgrade.
-- The migration is intentionally idempotent because this repository is deployed
-- through both Supabase migrations and the Drizzle schema tooling.

ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS code text;

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS agent_code text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS public_slug text,
  ADD COLUMN IF NOT EXISTS public_description text,
  ADD COLUMN IF NOT EXISTS public_page_enabled boolean NOT NULL DEFAULT true;

-- Preserve existing referral links as the initial agent code. Existing rows
-- without a referral code can be completed from the admin form later.
UPDATE public.agents
SET agent_code = NULLIF(trim(referral_code), '')
WHERE (agent_code IS NULL OR trim(agent_code) = '')
  AND NULLIF(trim(referral_code), '') IS NOT NULL;

-- Stable, readable public URLs for existing agents. The short id suffix keeps
-- names such as "Siti Aminah" collision-safe without exposing the full UUID.
UPDATE public.agents
SET public_slug = lower(
  trim(both '-' from regexp_replace(
    coalesce(NULLIF(trim(name), ''), 'agen') || '-' || left(replace(id, '-', ''), 8),
    '[^a-zA-Z0-9]+', '-', 'g'
  ))
)
WHERE public_slug IS NULL OR trim(public_slug) = '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_branches_code
  ON public.branches (code)
  WHERE code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_agents_agent_code
  ON public.agents (agent_code)
  WHERE agent_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_agents_public_slug
  ON public.agents (public_slug)
  WHERE public_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agents_public_directory
  ON public.agents (is_active, public_page_enabled, public_slug);

COMMENT ON COLUMN public.agents.agent_code IS 'Kode agen internal, terpisah dari referral code legacy.';
COMMENT ON COLUMN public.agents.public_slug IS 'Slug unik untuk halaman publik agen dan target QR.';
COMMENT ON COLUMN public.agents.public_page_enabled IS 'Kontrol publikasi halaman agen tanpa menonaktifkan akun agen.';

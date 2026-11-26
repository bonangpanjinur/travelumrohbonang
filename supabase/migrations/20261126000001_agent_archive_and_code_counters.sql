-- Preserve agent history and allocate codes monotonically.

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by text,
  ADD COLUMN IF NOT EXISTS archived_reason text;

CREATE INDEX IF NOT EXISTS idx_agents_archived_at
  ON public.agents (archived_at);

CREATE TABLE IF NOT EXISTS public.agent_code_counters (
  scope_key text PRIMARY KEY,
  last_value integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_agent_code_counters_last_value_nonnegative CHECK (last_value >= 0)
);

-- Seed counters from existing A###...YY codes. The counter is global per year,
-- matching the existing generator's intended global sequence.
INSERT INTO public.agent_code_counters (scope_key, last_value)
SELECT
  'global:' || code_year,
  max(sequence_no)
FROM (
  SELECT
    right(a.agent_code, 2) AS code_year,
    substring(a.agent_code from '^A([0-9]{3})')::integer AS sequence_no
  FROM public.agents a
  WHERE a.agent_code ~ '^A[0-9]{3}[A-Z0-9]+[0-9]{2}$'
  UNION ALL
  SELECT
    right(a.referral_code, 2) AS code_year,
    substring(a.referral_code from '^A([0-9]{3})')::integer AS sequence_no
  FROM public.agents a
  WHERE a.referral_code ~ '^A[0-9]{3}[A-Z0-9]+[0-9]{2}$'
) existing_codes
GROUP BY code_year
ON CONFLICT (scope_key) DO UPDATE
SET last_value = GREATEST(public.agent_code_counters.last_value, EXCLUDED.last_value),
    updated_at = now();

COMMENT ON TABLE public.agent_code_counters IS
  'Monotonic agent-code allocation; counters are never decremented or reused.';

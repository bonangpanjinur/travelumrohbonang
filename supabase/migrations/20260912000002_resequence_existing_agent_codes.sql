-- Repair historical agent codes that were generated per branch.
--
-- The old generator could create A001 for more than one branch. Keep the
-- branch/year suffix and legacy referral_code intact, but resequence the
-- numeric portion globally per two-digit year in creation order.
--
-- A temporary value is used first because uq_agents_agent_code is an
-- immediate unique index and a direct swap could otherwise collide midway.

BEGIN;

CREATE TEMP TABLE _agent_code_resequence ON COMMIT DROP AS
SELECT
  id,
  right(agent_code, 2) AS year_suffix,
  row_number() OVER (
    PARTITION BY right(agent_code, 2)
    ORDER BY created_at NULLS LAST, id
  )::integer AS sequence_no,
  right(agent_code, length(agent_code) - 4) AS code_suffix
FROM public.agents
WHERE agent_code ~ '^A[0-9]{3}[A-Z0-9]+[0-9]{2}$';

UPDATE public.agents AS a
SET agent_code = 'AGFIX-' || a.id
FROM _agent_code_resequence AS r
WHERE a.id = r.id;

UPDATE public.agents AS a
SET agent_code = 'A'
  || lpad(r.sequence_no::text, 3, '0')
  || r.code_suffix
FROM _agent_code_resequence AS r
WHERE a.id = r.id;

COMMIT;

COMMENT ON COLUMN public.agents.agent_code IS
  'Kode agen internal unik; nomor urut global per tahun, terpisah dari referral code legacy.';

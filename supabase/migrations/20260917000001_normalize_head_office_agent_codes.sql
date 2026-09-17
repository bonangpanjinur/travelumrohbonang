-- Head-office agents use one canonical code suffix: VINS.
-- Older versions generated VINSU for agent_code while the referral-code
-- trigger mirrored it, producing values such as A003VINSU26.
DO $$
BEGIN
  CREATE TEMP TABLE _head_office_agent_codes ON COMMIT DROP AS
  SELECT a.id, a.agent_code
  FROM public.agents AS a
  LEFT JOIN public.branches AS b ON b.id = a.branch_id
  WHERE a.agent_code ~ '^A[0-9]{3}VINSU[0-9]{2}$'
    AND (
      a.branch_id = 'branch_pusat'
      OR upper(coalesce(b.code, '')) = 'VINS'
      OR upper(coalesce(b.name, '')) ~ 'KANTOR[[:space:]]*PUSAT|PUSAT'
    );

  -- Avoid collisions with the unique agent_code index while changing values.
  UPDATE public.agents AS a
  SET agent_code = 'AGFIX-HQ-' || a.id
  FROM _head_office_agent_codes AS h
  WHERE a.id = h.id;

  UPDATE public.agents AS a
  SET agent_code = regexp_replace(h.agent_code, 'VINSU', 'VINS')
  FROM _head_office_agent_codes AS h
  WHERE a.id = h.id;

  -- The trigger keeps referral_code aligned with agent_code. This explicit
  -- update also supports databases where enforcement is not yet applied.
  UPDATE public.agents AS a
  SET referral_code = a.agent_code
  FROM _head_office_agent_codes AS h
  WHERE a.id = h.id;
END
$$;

COMMENT ON COLUMN public.agents.agent_code IS
  'Kode agen internal unik; kantor pusat memakai suffix VINS dan referral code mengikuti nilai ini.';

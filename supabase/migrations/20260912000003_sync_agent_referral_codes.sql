-- Referral/legacy codes intentionally use the same value as the agent code.
-- This repairs existing rows after the agent-code resequencing migration.

UPDATE public.agents
SET referral_code = agent_code
WHERE referral_code IS DISTINCT FROM agent_code;

COMMENT ON COLUMN public.agents.referral_code IS
  'Kode referral legacy yang selalu mengikuti agents.agent_code.';

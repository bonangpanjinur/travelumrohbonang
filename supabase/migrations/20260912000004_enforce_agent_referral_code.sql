-- Enforce the business rule at database level:
-- referral_code is a legacy alias of agent_code and must never diverge.

CREATE OR REPLACE FUNCTION public.sync_agent_referral_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.referral_code := NEW.agent_code;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_agent_referral_code ON public.agents;

CREATE TRIGGER trg_sync_agent_referral_code
BEFORE INSERT OR UPDATE OF agent_code, referral_code
ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.sync_agent_referral_code();

UPDATE public.agents
SET referral_code = agent_code
WHERE referral_code IS DISTINCT FROM agent_code;

COMMENT ON FUNCTION public.sync_agent_referral_code() IS
  'Keeps the legacy referral code equal to the canonical agent code.';

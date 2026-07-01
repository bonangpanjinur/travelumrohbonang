-- Server-side phone normalization for agents table
CREATE OR REPLACE FUNCTION public.normalize_phone_id(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  cleaned text;
  digits text;
BEGIN
  IF raw IS NULL THEN RETURN NULL; END IF;
  cleaned := regexp_replace(raw, '[\s\-().]', '', 'g');
  IF cleaned = '' THEN RETURN NULL; END IF;

  IF left(cleaned, 3) = '+62' THEN
    digits := regexp_replace(substring(cleaned from 2), '\D', '', 'g');
    RETURN '+' || digits;
  END IF;

  digits := regexp_replace(cleaned, '\D', '', 'g');
  IF digits = '' THEN RETURN NULL; END IF;

  IF left(digits, 2) = '62' THEN RETURN '+' || digits; END IF;
  IF left(digits, 1) = '0' THEN RETURN '+62' || substring(digits from 2); END IF;
  IF left(digits, 1) = '8' THEN RETURN '+62' || digits; END IF;
  RETURN '+' || digits;
END;
$$;

CREATE OR REPLACE FUNCTION public.agents_normalize_phone()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    NEW.phone := public.normalize_phone_id(NEW.phone);
  ELSE
    NEW.phone := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agents_normalize_phone ON public.agents;
CREATE TRIGGER trg_agents_normalize_phone
BEFORE INSERT OR UPDATE OF phone ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.agents_normalize_phone();
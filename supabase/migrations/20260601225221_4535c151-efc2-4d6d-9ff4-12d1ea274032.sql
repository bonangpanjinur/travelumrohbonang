
ALTER VIEW public.package_hpp_summary SET (security_invoker = on);

CREATE OR REPLACE FUNCTION public.to_idr(_amount numeric, _currency text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(_amount, 0) * COALESCE(
    (SELECT rate_to_idr FROM public.currencies WHERE code = UPPER(_currency) LIMIT 1),
    1
  );
$$;

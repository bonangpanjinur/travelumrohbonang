
DROP VIEW IF EXISTS public.loyalty_balances;
CREATE VIEW public.loyalty_balances WITH (security_invoker = true) AS
  SELECT user_id, COALESCE(SUM(points),0) AS total_points
  FROM public.loyalty_points GROUP BY user_id;
GRANT SELECT ON public.loyalty_balances TO authenticated;

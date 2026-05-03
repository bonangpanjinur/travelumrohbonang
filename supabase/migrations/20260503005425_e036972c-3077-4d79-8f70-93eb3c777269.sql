-- Tighten RLS for agents viewing bookings: must match their own active agent record
DROP POLICY IF EXISTS "Agents view own referred bookings" ON public.bookings;

CREATE POLICY "Agents view own referred bookings"
ON public.bookings
FOR SELECT
USING (
  agent_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.agents a
    WHERE a.id = bookings.agent_id
      AND a.user_id = auth.uid()
      AND a.is_active = true
  )
);
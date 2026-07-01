DROP POLICY IF EXISTS "Agents update own profile" ON public.agents;
CREATE POLICY "Agents update own profile"
ON public.agents
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
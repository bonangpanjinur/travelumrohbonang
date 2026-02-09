-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create a more restrictive insert policy - only service role or admin can insert
CREATE POLICY "Service role can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) OR 
  auth.uid() = user_id
);
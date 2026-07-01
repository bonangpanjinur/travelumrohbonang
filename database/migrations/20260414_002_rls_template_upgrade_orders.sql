CREATE POLICY "Users can update own pending upgrade orders"
ON public.template_upgrade_orders
FOR UPDATE
TO public
USING (auth.uid() = requested_by AND status = 'pending')
WITH CHECK (auth.uid() = requested_by AND status = 'cancelled');
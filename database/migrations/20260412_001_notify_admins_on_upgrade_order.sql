
-- Function to create notifications for admins when a new upgrade order is created
CREATE OR REPLACE FUNCTION public.notify_admins_on_upgrade_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
  site_name TEXT;
BEGIN
  -- Get the tenant site name
  SELECT ts.site_name INTO site_name
  FROM public.tenant_sites ts
  WHERE ts.id = NEW.tenant_site_id;

  -- Create notification for each admin
  FOR admin_record IN
    SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'super_admin')
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      admin_record.user_id,
      'Pengajuan Upgrade Template',
      'Pengajuan upgrade template ke "' || NEW.target_template || '" dari site "' || COALESCE(site_name, 'Unknown') || '".',
      'upgrade'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_upgrade_order_created
AFTER INSERT ON public.template_upgrade_orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_on_upgrade_order();

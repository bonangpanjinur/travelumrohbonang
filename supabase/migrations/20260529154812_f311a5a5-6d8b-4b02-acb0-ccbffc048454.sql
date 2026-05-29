
-- Audit trail for integration_secrets and auth (login/2FA) settings
CREATE OR REPLACE FUNCTION public.audit_integration_secrets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_provider text;
  v_old jsonb;
  v_new jsonb;
  mask_keys text[] := ARRAY['api_key','token','secret','password','client_secret'];
  k text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'integration_secret.create';
    v_provider := NEW.provider;
    v_new := jsonb_build_object('provider', NEW.provider, 'is_active', NEW.is_active, 'config_keys', COALESCE((SELECT jsonb_agg(key) FROM jsonb_object_keys(NEW.config) key), '[]'::jsonb));
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'integration_secret.update';
    v_provider := NEW.provider;
    v_old := jsonb_build_object('is_active', OLD.is_active, 'config_keys', COALESCE((SELECT jsonb_agg(key) FROM jsonb_object_keys(OLD.config) key), '[]'::jsonb));
    v_new := jsonb_build_object('is_active', NEW.is_active, 'config_keys', COALESCE((SELECT jsonb_agg(key) FROM jsonb_object_keys(NEW.config) key), '[]'::jsonb));
  ELSE
    v_action := 'integration_secret.delete';
    v_provider := OLD.provider;
    v_old := jsonb_build_object('provider', OLD.provider, 'is_active', OLD.is_active);
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    v_action,
    'integration_secrets',
    COALESCE(NEW.id::text, OLD.id::text),
    jsonb_build_object('provider', v_provider, 'old', v_old, 'new', v_new)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_integration_secrets ON public.integration_secrets;
CREATE TRIGGER trg_audit_integration_secrets
AFTER INSERT OR UPDATE OR DELETE ON public.integration_secrets
FOR EACH ROW EXECUTE FUNCTION public.audit_integration_secrets();

-- Audit site_settings changes scoped to auth category (login/2FA)
CREATE OR REPLACE FUNCTION public.audit_site_settings_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_cat text := COALESCE(NEW.category, OLD.category);
  v_key text := COALESCE(NEW.key, OLD.key);
BEGIN
  -- Only audit auth/login/2FA related settings
  IF v_cat NOT IN ('auth','login','security') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN v_action := 'auth_setting.create';
  ELSIF TG_OP = 'UPDATE' THEN v_action := 'auth_setting.update';
  ELSE v_action := 'auth_setting.delete';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    v_action,
    'site_settings',
    COALESCE(NEW.id::text, OLD.id::text),
    jsonb_build_object(
      'category', v_cat,
      'key', v_key,
      'old', to_jsonb(OLD.value),
      'new', to_jsonb(NEW.value)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_site_settings_auth ON public.site_settings;
CREATE TRIGGER trg_audit_site_settings_auth
AFTER INSERT OR UPDATE OR DELETE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.audit_site_settings_auth();

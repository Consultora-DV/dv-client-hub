-- La migración 20260423174906 (Lovable) dejó el trigger handle_new_user con:
--   ON CONFLICT (user_id, role) DO NOTHING
-- pero el UNIQUE constraint real en user_roles es UNIQUE(user_id) (migración 20260415211811).
-- PostgreSQL no puede resolver ON CONFLICT contra un constraint que no existe
-- → los signups nuevos fallaban silenciosamente al intentar insertar el rol por defecto.
-- Fix: alinear a ON CONFLICT (user_id) DO NOTHING.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cliente')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

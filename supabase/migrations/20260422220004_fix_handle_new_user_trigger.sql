-- P2-4: El trigger handle_new_user solo insertaba en profiles.
-- Al crear un usuario nuevo con invite-user/sign-up, user_roles quedaba vacío
-- y AuthContext.tsx:40 asumía 'cliente' pero la DB no tenía la fila.
-- Fix: también insertar en user_roles con role='cliente' por defecto.
-- invite-user ya puede sobreescribir el rol después con su propio INSERT.

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

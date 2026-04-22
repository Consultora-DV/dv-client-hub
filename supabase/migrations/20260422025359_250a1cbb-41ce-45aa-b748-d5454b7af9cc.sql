-- 1. Crear enum para estado de aprobación
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- 2. Agregar columna a profiles
ALTER TABLE public.profiles
ADD COLUMN approval_status public.approval_status NOT NULL DEFAULT 'pending';

-- 3. Aprobar a todos los usuarios existentes
UPDATE public.profiles SET approval_status = 'approved';

-- 4. Actualizar trigger handle_new_user para que nuevos registros queden pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, approval_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'pending'
  );
  RETURN NEW;
END;
$function$;

-- 5. Asegurar que el trigger esté conectado a auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Política: solo admins pueden actualizar approval_status (UPDATE de profiles por admin)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Índice para filtrar pendientes rápido
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON public.profiles(approval_status);
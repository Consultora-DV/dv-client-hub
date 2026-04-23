-- P1-2: Crear tabla notifications para sincronizar entre dispositivos y usuarios.
-- Anteriormente las notificaciones vivían solo en localStorage (por browser, por dispositivo).
-- user_id identifica al usuario destinatario de cada notificación.

CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Admin: acceso completo a todas las notificaciones
CREATE POLICY "Admin can manage notifications"
  ON public.notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Editor: ver y actualizar solo sus propias notificaciones
CREATE POLICY "Editor can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'editor') AND user_id = auth.uid());

CREATE POLICY "Editor can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'editor') AND user_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'editor') AND user_id = auth.uid());

-- Cualquier usuario autenticado puede ver sus propias notificaciones
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Cualquier usuario autenticado puede insertar solo para sí mismo
CREATE POLICY "Users can create own notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Usuarios pueden marcar sus notificaciones como leídas
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Usuarios pueden borrar sus propias notificaciones
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Activar realtime para sincronización entre pestañas y dispositivos
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

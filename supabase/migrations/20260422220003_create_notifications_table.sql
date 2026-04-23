-- P1-2: Crear tabla notifications para sincronizar entre dispositivos y usuarios.
-- Anteriormente las notificaciones vivían solo en localStorage (por browser, por dispositivo).

CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Admin: acceso completo (crear, leer, marcar leídas, borrar)
CREATE POLICY "Admin can manage notifications"
  ON public.notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Editor: ver y marcar como leídas (no borrar)
CREATE POLICY "Editor can view notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Editor can update notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'editor'));

-- Cualquier usuario autenticado puede insertar notificaciones
-- (clientes generan notificaciones al aprobar videos/scripts)
CREATE POLICY "Authenticated can create notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Activar realtime para sincronización entre pestañas y dispositivos
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- P2-6: Agregar FK NOT VALID con CASCADE para borrar datos huérfanos al eliminar usuario
-- NOT VALID evita validar filas existentes (por si hay cliente_id sin user en auth.users)
-- pero aplica la constraint a futuras inserciones y borrados en cascada.

-- Limpiar primero filas huérfanas existentes (cliente_id sin user en auth.users)
DELETE FROM public.videos WHERE cliente_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.calendar_events WHERE cliente_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.post_metrics WHERE cliente_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.documents WHERE cliente_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.scripts WHERE cliente_id NOT IN (SELECT id FROM auth.users);

-- Agregar FK CASCADE en cada tabla con cliente_id
ALTER TABLE public.videos
  ADD CONSTRAINT videos_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.post_metrics
  ADD CONSTRAINT post_metrics_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.scripts
  ADD CONSTRAINT scripts_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- P2-2: Las tablas hijas tenían cliente_id sin FK formal a auth.users.
-- Sin FK, borrar un usuario dejaba filas huérfanas si delete-user fallaba a mitad.
-- Con CASCADE, Postgres limpia automáticamente aunque la Edge Function falle.
-- Nota: delete-user ya borra manualmente en orden seguro; CASCADE es defensa adicional.

ALTER TABLE public.videos
  ADD CONSTRAINT fk_videos_cliente
  FOREIGN KEY (cliente_id) REFERENCES auth.users(id) ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.calendar_events
  ADD CONSTRAINT fk_calendar_events_cliente
  FOREIGN KEY (cliente_id) REFERENCES auth.users(id) ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.post_metrics
  ADD CONSTRAINT fk_post_metrics_cliente
  FOREIGN KEY (cliente_id) REFERENCES auth.users(id) ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.documents
  ADD CONSTRAINT fk_documents_cliente
  FOREIGN KEY (cliente_id) REFERENCES auth.users(id) ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.scripts
  ADD CONSTRAINT fk_scripts_cliente
  FOREIGN KEY (cliente_id) REFERENCES auth.users(id) ON DELETE CASCADE
  NOT VALID;

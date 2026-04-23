-- P0-8: Agregar políticas RLS para el rol 'diseñador' en tablas que las omitieron.
-- Las tablas videos, calendar_events, video_comments y post_metrics solo tenían
-- políticas para admin, editor y cliente. El diseñador necesita lectura completa
-- para ver el trabajo de todos los clientes y poder coordinar.

-- videos: diseñador puede leer todos los videos
CREATE POLICY "Diseñadores can view all videos"
  ON public.videos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'diseñador'));

-- calendar_events: diseñador puede leer todos los eventos
CREATE POLICY "Diseñadores can view all events"
  ON public.calendar_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'diseñador'));

-- video_comments: diseñador puede leer todos los comentarios
CREATE POLICY "Diseñadores can view all comments"
  ON public.video_comments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'diseñador'));

-- post_metrics: diseñador puede leer todas las métricas
CREATE POLICY "Diseñadores can view all metrics"
  ON public.post_metrics FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'diseñador'));

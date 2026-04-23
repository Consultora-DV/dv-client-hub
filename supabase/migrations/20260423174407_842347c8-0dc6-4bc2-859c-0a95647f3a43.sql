-- P1-3: Permitir lectura a diseñador en videos, calendar_events y post_metrics
-- Antes: solo admin y editor podían ver estos datos
-- Ahora: diseñador también puede leer (read-only) para hacer su trabajo

CREATE POLICY "Designers can view all videos"
  ON public.videos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'diseñador'));

CREATE POLICY "Designers can view all events"
  ON public.calendar_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'diseñador'));

CREATE POLICY "Designers can view all metrics"
  ON public.post_metrics FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'diseñador'));

CREATE POLICY "Designers can view all video comments"
  ON public.video_comments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'diseñador'));
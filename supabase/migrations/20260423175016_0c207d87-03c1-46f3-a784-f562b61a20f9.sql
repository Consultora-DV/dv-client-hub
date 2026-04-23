-- P2-3: Las políticas de cliente solo verificaban cliente_id = auth.uid() sin has_role.
-- Fix: agregar AND has_role(auth.uid(), 'cliente') a todas las políticas de cliente.

DROP POLICY IF EXISTS "Clients can view own videos" ON public.videos;
CREATE POLICY "Clients can view own videos"
  ON public.videos FOR SELECT TO authenticated
  USING (cliente_id = auth.uid() AND public.has_role(auth.uid(), 'cliente'));

DROP POLICY IF EXISTS "Clients can view own events" ON public.calendar_events;
CREATE POLICY "Clients can view own events"
  ON public.calendar_events FOR SELECT TO authenticated
  USING (cliente_id = auth.uid() AND public.has_role(auth.uid(), 'cliente'));

DROP POLICY IF EXISTS "Clients can view own metrics" ON public.post_metrics;
CREATE POLICY "Clients can view own metrics"
  ON public.post_metrics FOR SELECT TO authenticated
  USING (cliente_id = auth.uid() AND public.has_role(auth.uid(), 'cliente'));

DROP POLICY IF EXISTS "Clients can view own documents" ON public.documents;
CREATE POLICY "Clients can view own documents"
  ON public.documents FOR SELECT TO authenticated
  USING (cliente_id = auth.uid() AND public.has_role(auth.uid(), 'cliente'));

DROP POLICY IF EXISTS "Clients can view own scripts" ON public.scripts;
CREATE POLICY "Clients can view own scripts"
  ON public.scripts FOR SELECT TO authenticated
  USING (cliente_id = auth.uid() AND public.has_role(auth.uid(), 'cliente'));

DROP POLICY IF EXISTS "Clients can view comments on own videos" ON public.video_comments;
DROP POLICY IF EXISTS "Clients can add comments on own videos" ON public.video_comments;

CREATE POLICY "Clients can view comments on own videos"
  ON public.video_comments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'cliente')
    AND EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND v.cliente_id = auth.uid())
  );

CREATE POLICY "Clients can add comments on own videos"
  ON public.video_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.has_role(auth.uid(), 'cliente')
    AND EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND v.cliente_id = auth.uid())
  );

DROP POLICY IF EXISTS "Clients can view comments on own scripts" ON public.script_comments;
DROP POLICY IF EXISTS "Clients can add comments on own scripts" ON public.script_comments;

CREATE POLICY "Clients can view comments on own scripts"
  ON public.script_comments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'cliente')
    AND EXISTS (SELECT 1 FROM public.scripts s WHERE s.id = script_comments.script_id AND s.cliente_id = auth.uid())
  );

CREATE POLICY "Clients can add comments on own scripts"
  ON public.script_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.has_role(auth.uid(), 'cliente')
    AND EXISTS (SELECT 1 FROM public.scripts s WHERE s.id = script_comments.script_id AND s.cliente_id = auth.uid())
  );
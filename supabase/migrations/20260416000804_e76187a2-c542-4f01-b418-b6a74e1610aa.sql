
-- Videos table
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  title TEXT NOT NULL,
  platform TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'changes', 'published')),
  thumbnail TEXT DEFAULT '',
  delivery_date TIMESTAMPTZ,
  embed_url TEXT DEFAULT '',
  drive_link TEXT DEFAULT '#',
  status_history JSONB NOT NULL DEFAULT '[]',
  ig_caption TEXT DEFAULT '',
  ig_likes INTEGER DEFAULT 0,
  ig_comments INTEGER DEFAULT 0,
  ig_views INTEGER DEFAULT 0,
  ig_hashtags TEXT[] DEFAULT '{}',
  ig_short_code TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything with videos"
  ON public.videos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can do everything with videos"
  ON public.videos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Clients can view own videos"
  ON public.videos FOR SELECT TO authenticated
  USING (cliente_id = auth.uid());

CREATE INDEX idx_videos_cliente ON public.videos(cliente_id);
CREATE INDEX idx_videos_ig_short_code ON public.videos(ig_short_code);

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Calendar events table
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  platform TEXT[] NOT NULL DEFAULT '{}',
  content_type TEXT DEFAULT '',
  time TEXT DEFAULT '00:00',
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  ig_short_code TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything with events"
  ON public.calendar_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can do everything with events"
  ON public.calendar_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Clients can view own events"
  ON public.calendar_events FOR SELECT TO authenticated
  USING (cliente_id = auth.uid());

CREATE INDEX idx_events_cliente ON public.calendar_events(cliente_id);

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Video comments table
CREATE TABLE public.video_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  is_client BOOLEAN NOT NULL DEFAULT false,
  text TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything with comments"
  ON public.video_comments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can do everything with comments"
  ON public.video_comments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Clients can view comments on own videos"
  ON public.video_comments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.videos v WHERE v.id = video_id AND v.cliente_id = auth.uid()
  ));

CREATE POLICY "Clients can add comments on own videos"
  ON public.video_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.videos v WHERE v.id = video_id AND v.cliente_id = auth.uid()
    )
  );

CREATE INDEX idx_comments_video ON public.video_comments(video_id);

-- Post metrics table
CREATE TABLE public.post_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  platform TEXT NOT NULL DEFAULT 'instagram',
  post_url TEXT DEFAULT '',
  thumbnail TEXT DEFAULT '',
  title TEXT DEFAULT '',
  date TIMESTAMPTZ,
  type TEXT DEFAULT 'POST',
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement NUMERIC(8,4) DEFAULT 0,
  ig_short_code TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.post_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything with metrics"
  ON public.post_metrics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can do everything with metrics"
  ON public.post_metrics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Clients can view own metrics"
  ON public.post_metrics FOR SELECT TO authenticated
  USING (cliente_id = auth.uid());

CREATE INDEX idx_metrics_cliente ON public.post_metrics(cliente_id);
CREATE INDEX idx_metrics_ig_short_code ON public.post_metrics(ig_short_code);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_comments;

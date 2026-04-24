-- Restauración de feature de guiones.
CREATE TABLE public.scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'nuevo',
  drive_link text NOT NULL DEFAULT '#',
  is_new boolean NOT NULL DEFAULT true,
  visto boolean NOT NULL DEFAULT false,
  status_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.script_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  author text NOT NULL,
  is_client boolean NOT NULL DEFAULT false,
  text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_scripts_cliente_id ON public.scripts(cliente_id);
CREATE INDEX idx_scripts_sort_order ON public.scripts(cliente_id, sort_order, created_at DESC);
CREATE INDEX idx_script_comments_script_id ON public.script_comments(script_id, created_at DESC);

CREATE TRIGGER update_scripts_updated_at
  BEFORE UPDATE ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all scripts"
  ON public.scripts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can manage all scripts"
  ON public.scripts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Designers can manage all scripts"
  ON public.scripts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'diseñador'))
  WITH CHECK (public.has_role(auth.uid(), 'diseñador'));

CREATE POLICY "Clients can view own scripts"
  ON public.scripts FOR SELECT TO authenticated
  USING (cliente_id = auth.uid() AND public.has_role(auth.uid(), 'cliente'));

CREATE POLICY "Clients can approve or request changes on own scripts"
  ON public.scripts FOR UPDATE TO authenticated
  USING (cliente_id = auth.uid() AND public.has_role(auth.uid(), 'cliente'))
  WITH CHECK (
    cliente_id = auth.uid()
    AND public.has_role(auth.uid(), 'cliente')
    AND status IN ('aprobado', 'cambios_solicitados')
  );

CREATE POLICY "Admins can manage all script comments"
  ON public.script_comments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can manage all script comments"
  ON public.script_comments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Designers can manage all script comments"
  ON public.script_comments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'diseñador'))
  WITH CHECK (public.has_role(auth.uid(), 'diseñador'));

CREATE POLICY "Clients can view comments on own scripts"
  ON public.script_comments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'cliente')
    AND EXISTS (
      SELECT 1 FROM public.scripts s
      WHERE s.id = script_comments.script_id
        AND s.cliente_id = auth.uid()
    )
  );

CREATE POLICY "Clients can add comments on own scripts"
  ON public.script_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.has_role(auth.uid(), 'cliente')
    AND EXISTS (
      SELECT 1 FROM public.scripts s
      WHERE s.id = script_comments.script_id
        AND s.cliente_id = auth.uid()
    )
  );

INSERT INTO public.scripts SELECT * FROM jsonb_populate_record(NULL::public.scripts, '{"id":"f00d1601-05f2-445f-9ad3-f3500c88eb2d","date":"2026-04-15","title":"7MA GRABACION","visto":true,"is_new":true,"status":"nuevo","cliente_id":"611abc2a-c6ac-4dc3-967d-1d552def4931","created_at":"2026-04-22T08:50:37.687616+00:00","drive_link":"https://docs.google.com/document/d/1PkkzOqJapHAYO82M_-POhyVlEWXN2BvD7fPkzY9TkNY/edit?tab=t.0#heading=h.pufrhv6tz0lz","sort_order":0,"updated_at":"2026-04-22T08:50:37.687616+00:00","status_history":[{"by":"Sistema","date":"2026-04-15","status":"Creado"}]}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.scripts SELECT * FROM jsonb_populate_record(NULL::public.scripts, '{"id":"bbbc7191-3967-403b-850c-48485075d563","date":"2026-04-16","title":"PENDIENTES 6TA GRABACION","visto":false,"is_new":true,"status":"nuevo","cliente_id":"611abc2a-c6ac-4dc3-967d-1d552def4931","created_at":"2026-04-22T08:50:37.697397+00:00","drive_link":"https://docs.google.com/document/d/1oEA5bpJ55w-S75Cm8qeN9dmY4jlxIXqtcc-DeGeKLGc/edit?usp=drive_link","sort_order":0,"updated_at":"2026-04-22T08:50:37.697397+00:00","status_history":[{"by":"Sistema","date":"2026-04-16","status":"Creado"}]}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.scripts SELECT * FROM jsonb_populate_record(NULL::public.scripts, '{"id":"f2a529fe-887a-4a0c-890b-d73d783b1786","date":"2026-04-16","title":"6TA GRABACION","visto":false,"is_new":true,"status":"nuevo","cliente_id":"611abc2a-c6ac-4dc3-967d-1d552def4931","created_at":"2026-04-22T08:50:37.701105+00:00","drive_link":"https://docs.google.com/document/d/1l5j1UbNUe7cdQuj8LR5lFAdeztN09ZM7eYhONnHVNDw/edit?usp=drive_link","sort_order":0,"updated_at":"2026-04-22T08:50:37.701105+00:00","status_history":[{"by":"Sistema","date":"2026-04-16","status":"Creado"}]}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.scripts SELECT * FROM jsonb_populate_record(NULL::public.scripts, '{"id":"9f724f09-b0bc-4c22-af40-3ac1286e231d","date":"2026-04-16","title":"5TA GRABACION","visto":false,"is_new":true,"status":"nuevo","cliente_id":"611abc2a-c6ac-4dc3-967d-1d552def4931","created_at":"2026-04-22T08:50:37.713289+00:00","drive_link":"https://docs.google.com/document/d/1N8uern-ThHwWuIaHkn_ujhMmhDVy1oF8HX-ZrU9XySg/edit?usp=drive_link","sort_order":0,"updated_at":"2026-04-22T08:50:37.713289+00:00","status_history":[{"by":"Sistema","date":"2026-04-16","status":"Creado"}]}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.scripts SELECT * FROM jsonb_populate_record(NULL::public.scripts, '{"id":"3a960577-c3e4-4005-aa7c-a240b4adcf51","date":"2026-04-16","title":"1ER GRABACION","visto":false,"is_new":true,"status":"nuevo","cliente_id":"611abc2a-c6ac-4dc3-967d-1d552def4931","created_at":"2026-04-22T08:50:37.713999+00:00","drive_link":"https://docs.google.com/document/d/1rgL3d6aJtxEdVutfBLil7iJqLLtE-2-CdfzXN38RU-U/edit?usp=drive_link","sort_order":0,"updated_at":"2026-04-22T08:50:37.713999+00:00","status_history":[{"by":"Sistema","date":"2026-04-16","status":"Creado"}]}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.scripts SELECT * FROM jsonb_populate_record(NULL::public.scripts, '{"id":"023dd2fa-98ed-40e1-b6dd-2e25c41b089b","date":"2026-04-16","title":"4TA GRABACION","visto":false,"is_new":true,"status":"nuevo","cliente_id":"611abc2a-c6ac-4dc3-967d-1d552def4931","created_at":"2026-04-22T08:50:37.829922+00:00","drive_link":"https://docs.google.com/document/d/1AqIXl2WSvPhzx8QKqi5zwslMY_sGdmbDosA-4BPnFpk/edit?usp=drive_link","sort_order":0,"updated_at":"2026-04-22T08:50:37.829922+00:00","status_history":[{"by":"Sistema","date":"2026-04-16","status":"Creado"}]}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.scripts SELECT * FROM jsonb_populate_record(NULL::public.scripts, '{"id":"00187265-b97d-4d3f-946b-6f1d7a5d28fd","date":"2026-04-16","title":"3ER GRABACION","visto":false,"is_new":true,"status":"nuevo","cliente_id":"611abc2a-c6ac-4dc3-967d-1d552def4931","created_at":"2026-04-22T08:50:37.841385+00:00","drive_link":"https://docs.google.com/document/d/1JQkpLknys9rrhqAzefUZX551WfEsBbYGJ5TVsZs6i-M/edit?usp=drive_link","sort_order":0,"updated_at":"2026-04-22T08:50:37.841385+00:00","status_history":[{"by":"Sistema","date":"2026-04-16","status":"Creado"}]}'::jsonb) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.scripts SELECT * FROM jsonb_populate_record(NULL::public.scripts, '{"id":"725d0155-35c7-476d-a3f4-5bc4941870ff","date":"2026-04-16","title":"2DA GRABACION","visto":false,"is_new":true,"status":"nuevo","cliente_id":"611abc2a-c6ac-4dc3-967d-1d552def4931","created_at":"2026-04-22T08:50:37.841163+00:00","drive_link":"https://docs.google.com/document/d/1lrFZUDdu9779VcBTE8Zn0lOJmIQy62mbDyKwaEfAKEc/edit?usp=drive_link","sort_order":0,"updated_at":"2026-04-22T08:50:37.841163+00:00","status_history":[{"by":"Sistema","date":"2026-04-16","status":"Creado"}]}'::jsonb) ON CONFLICT (id) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.scripts, public.script_comments;

-- Corrección de alta automática de usuario.
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

INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20260423190000'), ('20260423200000')
ON CONFLICT (version) DO NOTHING;
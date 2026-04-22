CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'pdf',
  date date NOT NULL DEFAULT CURRENT_DATE,
  drive_link text NOT NULL DEFAULT '#',
  file_url text,
  is_new boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
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
  date timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_cliente_id ON public.documents(cliente_id);
CREATE INDEX idx_documents_sort_order ON public.documents(cliente_id, sort_order, created_at DESC);
CREATE INDEX idx_scripts_cliente_id ON public.scripts(cliente_id);
CREATE INDEX idx_scripts_sort_order ON public.scripts(cliente_id, sort_order, created_at DESC);
CREATE INDEX idx_script_comments_script_id ON public.script_comments(script_id, date DESC);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all documents"
ON public.documents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can manage all documents"
ON public.documents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'editor'))
WITH CHECK (public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Designers can manage all documents"
ON public.documents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'diseñador'))
WITH CHECK (public.has_role(auth.uid(), 'diseñador'));

CREATE POLICY "Clients can view own documents"
ON public.documents
FOR SELECT
TO authenticated
USING (cliente_id = auth.uid());

CREATE POLICY "Admins can manage all scripts"
ON public.scripts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can manage all scripts"
ON public.scripts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'editor'))
WITH CHECK (public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Designers can manage all scripts"
ON public.scripts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'diseñador'))
WITH CHECK (public.has_role(auth.uid(), 'diseñador'));

CREATE POLICY "Clients can view own scripts"
ON public.scripts
FOR SELECT
TO authenticated
USING (cliente_id = auth.uid());

CREATE POLICY "Clients can update own scripts"
ON public.scripts
FOR UPDATE
TO authenticated
USING (cliente_id = auth.uid())
WITH CHECK (cliente_id = auth.uid());

CREATE POLICY "Admins can manage all script comments"
ON public.script_comments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can manage all script comments"
ON public.script_comments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'editor'))
WITH CHECK (public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Designers can manage all script comments"
ON public.script_comments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'diseñador'))
WITH CHECK (public.has_role(auth.uid(), 'diseñador'));

CREATE POLICY "Clients can view comments on own scripts"
ON public.script_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.scripts s
    WHERE s.id = script_comments.script_id
      AND s.cliente_id = auth.uid()
  )
);

CREATE POLICY "Clients can add comments on own scripts"
ON public.script_comments
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.scripts s
    WHERE s.id = script_comments.script_id
      AND s.cliente_id = auth.uid()
  )
);

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scripts_updated_at
BEFORE UPDATE ON public.scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.documents, public.scripts, public.script_comments;
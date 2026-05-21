-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Editor Portal v1                                            ║
-- ║  REC system + editor↔cliente assignments + financial fields  ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── 1. Extend videos with REC system, ownership, financial ────
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS rec_number       int,
  ADD COLUMN IF NOT EXISTS rec_order        int,
  ADD COLUMN IF NOT EXISTS editor_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS editor_name      text,           -- legacy / import (when no auth user yet)
  ADD COLUMN IF NOT EXISTS priority         text DEFAULT 'normal'
    CHECK (priority IN ('alta','normal','baja')),
  ADD COLUMN IF NOT EXISTS referencia_guion text,           -- link al Google Doc / referencia
  ADD COLUMN IF NOT EXISTS link_publicado   text,           -- link al post final en IG / TikTok
  ADD COLUMN IF NOT EXISTS costo            numeric(10,2),  -- costo de edición
  ADD COLUMN IF NOT EXISTS moneda           text CHECK (moneda IN ('USD','MXN') OR moneda IS NULL),
  ADD COLUMN IF NOT EXISTS pagado           boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at     timestamptz;    -- cuándo salió en redes

CREATE INDEX IF NOT EXISTS idx_videos_editor_id ON videos (editor_id);
CREATE INDEX IF NOT EXISTS idx_videos_editor_name ON videos (editor_name);
CREATE INDEX IF NOT EXISTS idx_videos_rec        ON videos (rec_number, rec_order);
CREATE INDEX IF NOT EXISTS idx_videos_pagado     ON videos (pagado);

-- ── 2. Editor ↔ Cliente assignment pivot ──────────────────────
CREATE TABLE IF NOT EXISTS editor_clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  editor_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (editor_id, cliente_id)
);

CREATE INDEX IF NOT EXISTS idx_editor_clients_editor  ON editor_clients (editor_id);
CREATE INDEX IF NOT EXISTS idx_editor_clients_cliente ON editor_clients (cliente_id);

-- ── 3. RLS for editor_clients ────────────────────────────────
ALTER TABLE editor_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_editor_clients" ON editor_clients
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "editor_read_own_assignments" ON editor_clients
  FOR SELECT
  USING (editor_id = auth.uid());

-- ── 4. REC counter helpers ────────────────────────────────────
-- Same REC# holds multiple videos (a recording session).
-- next_rec_number(): if last REC had a video in the last 48h, stay; else +1.
CREATE OR REPLACE FUNCTION public.next_rec_number()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  last_rec     int;
  last_created timestamptz;
BEGIN
  SELECT MAX(rec_number) INTO last_rec FROM videos WHERE rec_number IS NOT NULL;
  IF last_rec IS NULL THEN RETURN 1; END IF;
  SELECT MAX(created_at) INTO last_created FROM videos WHERE rec_number = last_rec;
  IF last_created IS NULL OR last_created < now() - interval '48 hours' THEN
    RETURN last_rec + 1;
  END IF;
  RETURN last_rec;
END;
$$;

CREATE OR REPLACE FUNCTION public.next_rec_order(_rec_number int)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_order int;
BEGIN
  SELECT COALESCE(MAX(rec_order), 0) + 1
    INTO next_order
    FROM videos
   WHERE rec_number = _rec_number;
  RETURN next_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_rec_number()             TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_rec_order(int)           TO authenticated;

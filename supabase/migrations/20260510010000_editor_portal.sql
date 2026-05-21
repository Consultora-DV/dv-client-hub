-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Editor Portal: REC system + editor↔cliente assignments      ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── 1. Extend videos table with REC system + editor ownership ──
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS rec_number int,                       -- 3 in "R3-02" (global, monotonic)
  ADD COLUMN IF NOT EXISTS rec_order  int,                       -- 02 in "R3-02" (within REC)
  ADD COLUMN IF NOT EXISTS editor_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority   text DEFAULT 'normal'
    CHECK (priority IN ('alta','normal','baja'));

-- Composite display "R{rec_number}-{rec_order:02}" is built in the app

CREATE INDEX IF NOT EXISTS idx_videos_editor_id ON videos (editor_id);
CREATE INDEX IF NOT EXISTS idx_videos_rec        ON videos (rec_number, rec_order);

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

-- Admins can do anything
CREATE POLICY "admin_all_editor_clients" ON editor_clients
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Editors can READ their own assignments (to know which clients they have)
CREATE POLICY "editor_read_own_assignments" ON editor_clients
  FOR SELECT
  USING (editor_id = auth.uid());

-- ── 4. REC counter helper function ───────────────────────────
-- Returns the next REC number to suggest in the UI.
-- Logic: same REC number can hold multiple videos for the same shoot/session,
-- but if last REC was finalized (any video older than 48h), suggest next.
CREATE OR REPLACE FUNCTION public.next_rec_number()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_rec     int;
  last_created timestamptz;
BEGIN
  SELECT MAX(rec_number) INTO last_rec FROM videos WHERE rec_number IS NOT NULL;
  IF last_rec IS NULL THEN RETURN 1; END IF;

  SELECT MAX(created_at) INTO last_created FROM videos WHERE rec_number = last_rec;
  -- if last REC's most recent video is >48h old, start a new REC
  IF last_created IS NULL OR last_created < now() - interval '48 hours' THEN
    RETURN last_rec + 1;
  END IF;
  RETURN last_rec;
END;
$$;

-- Returns next order number inside a given REC
CREATE OR REPLACE FUNCTION public.next_rec_order(_rec_number int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_order int;
BEGIN
  SELECT COALESCE(MAX(rec_order), 0) + 1
    INTO next_order
    FROM videos
   WHERE rec_number = _rec_number;
  RETURN next_order;
END;
$$;

-- ── 5. Grant execute on helpers ──────────────────────────────
GRANT EXECUTE ON FUNCTION public.next_rec_number()             TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_rec_order(int)           TO authenticated;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Editor RLS — allow reading profiles of assigned clients     ║
-- ╚══════════════════════════════════════════════════════════════╝
-- Bug: editors couldn't see their assigned clients because they
-- could read editor_clients (cliente_id ok) but RLS blocked them
-- from reading the matching profiles rows. Result: empty client list.
--
-- This adds a permissive SELECT policy: editors can read profiles
-- of clients that are explicitly assigned to them via editor_clients.

CREATE POLICY "editor_reads_assigned_client_profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM editor_clients ec
       WHERE ec.cliente_id = profiles.user_id
         AND ec.editor_id  = auth.uid()
    )
  );

-- Also allow editors to read VIDEOS of their assigned clients
-- (for the dashboard to show clienteName joined to videos).
-- If a permissive policy already covers this, this is additive (no harm).
CREATE POLICY "editor_reads_assigned_videos" ON videos
  FOR SELECT
  USING (
    editor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM editor_clients ec
       WHERE ec.cliente_id = videos.cliente_id
         AND ec.editor_id  = auth.uid()
    )
  );

-- And allow editors to INSERT videos for their assigned clients
-- (so /editor/nueva works end-to-end without admin policy override).
CREATE POLICY "editor_inserts_videos_for_assigned" ON videos
  FOR INSERT
  WITH CHECK (
    editor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM editor_clients ec
       WHERE ec.cliente_id = videos.cliente_id
         AND ec.editor_id  = auth.uid()
    )
  );

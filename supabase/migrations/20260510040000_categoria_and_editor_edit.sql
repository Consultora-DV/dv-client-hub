-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Categoria (0-4) + editor self-edit/delete RLS               ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── 1. Fix status check constraint (incluye in_review) ─────────
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_status_check;
ALTER TABLE videos ADD CONSTRAINT videos_status_check
  CHECK (status IN ('pending', 'in_review', 'approved', 'changes', 'published', 'entregado'));

-- ── 2. Categoría del video (0-4) ───────────────────────────────
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS categoria smallint
    CHECK (categoria BETWEEN 0 AND 4 OR categoria IS NULL);

CREATE INDEX IF NOT EXISTS idx_videos_categoria ON videos (categoria);

-- ── 3. Editor: puede editar SUS videos mientras estén en revisión
CREATE POLICY "editor_updates_own_in_review" ON videos
  FOR UPDATE
  USING (editor_id = auth.uid() AND status = 'in_review')
  WITH CHECK (editor_id = auth.uid());

-- ── 4. Editor: puede borrar SUS videos mientras estén en revisión
CREATE POLICY "editor_deletes_own_in_review" ON videos
  FOR DELETE
  USING (editor_id = auth.uid() AND status = 'in_review');

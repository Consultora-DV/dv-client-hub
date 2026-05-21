-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Editor Preferences                                          ║
-- ║  Per-editor payment scheme + UI visibility settings          ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS editor_preferences (
  editor_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_scheme   text NOT NULL DEFAULT 'per_video'
    CHECK (payment_scheme IN ('per_video','fixed_monthly','fixed_weekly','fixed_biweekly','none')),
  fixed_amount     numeric(10,2),
  fixed_currency   text CHECK (fixed_currency IN ('USD','MXN') OR fixed_currency IS NULL),
  -- Field visibility flags (admin controls what each editor sees)
  show_costo       boolean NOT NULL DEFAULT true,
  show_referencia  boolean NOT NULL DEFAULT false,   -- editors usually shouldn't see this
  show_publicado   boolean NOT NULL DEFAULT false,   -- admin updates this, not editor
  show_thumbnail   boolean NOT NULL DEFAULT true,
  show_embed       boolean NOT NULL DEFAULT false,
  notes            text,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE editor_preferences ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admin_all_editor_prefs" ON editor_preferences
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Editor: read own prefs only
CREATE POLICY "editor_read_own_prefs" ON editor_preferences
  FOR SELECT
  USING (editor_id = auth.uid());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_editor_prefs_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_editor_prefs_touch ON editor_preferences;
CREATE TRIGGER trg_editor_prefs_touch
  BEFORE UPDATE ON editor_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_editor_prefs_updated_at();

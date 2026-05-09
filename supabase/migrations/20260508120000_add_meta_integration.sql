-- Meta / Instagram API Integration
-- Adds platform_tokens table for secure per-client token storage
-- and extends client_profiles with meta account IDs

-- ─────────────────────────────────────────────
-- 1. platform_tokens — stores access tokens per client per platform
--    RLS: only admin/service role can read/write
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id   uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  platform     text NOT NULL,            -- 'instagram', 'facebook_ads', 'tiktok'
  token        text NOT NULL,
  ig_user_id   text,                     -- Instagram Business Account ID
  ig_username  text,                     -- @username
  page_id      text,                     -- Facebook Page ID
  ad_account_id text,                    -- act_XXXXXXXXX
  expires_at   timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (cliente_id, platform)
);

-- Only admins/service role can access tokens (never exposed to 'cliente' role)
ALTER TABLE platform_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on platform_tokens"
  ON platform_tokens
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'editor')
    )
  );

-- ─────────────────────────────────────────────
-- 2. ig_sync_log — audit trail of sync operations
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ig_sync_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id   uuid NOT NULL,
  synced_at    timestamptz DEFAULT now(),
  posts_synced integer DEFAULT 0,
  posts_refreshed integer DEFAULT 0,
  errors       integer DEFAULT 0,
  triggered_by text DEFAULT 'manual'   -- 'manual' | 'cron'
);

ALTER TABLE ig_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on ig_sync_log"
  ON ig_sync_log
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'editor')
    )
  );

-- ─────────────────────────────────────────────
-- 3. Index for fast post_metrics lookups by platform + cliente
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_post_metrics_cliente_platform
  ON post_metrics (cliente_id, platform);

CREATE INDEX IF NOT EXISTS idx_post_metrics_ig_short_code
  ON post_metrics (ig_short_code)
  WHERE ig_short_code IS NOT NULL;

-- ─────────────────────────────────────────────
-- 4. Updated_at trigger for platform_tokens
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_platform_tokens_updated_at ON platform_tokens;
CREATE TRIGGER set_platform_tokens_updated_at
  BEFORE UPDATE ON platform_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

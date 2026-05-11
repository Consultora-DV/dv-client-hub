-- Meta Ads API response cache
-- Prevents hammering Meta API and hitting rate limits.
-- TTL is enforced in application code; fetched_at is the timestamp of the last successful fetch.

CREATE TABLE IF NOT EXISTS meta_ads_cache (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  text NOT NULL,
  cache_key   text NOT NULL,          -- e.g. "insights_last_30d", "campaigns_last_30d"
  date_preset text NOT NULL,          -- "last_30d", "last_7d", etc.
  data        jsonb NOT NULL,
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, cache_key)
);

-- Only admins and editors can read/write this cache (not clients)
ALTER TABLE meta_ads_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_editor_meta_cache"
  ON meta_ads_cache
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR
    public.has_role(auth.uid(), 'editor'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR
    public.has_role(auth.uid(), 'editor'::app_role)
  );

-- Index for fast lookups by client + key
CREATE INDEX IF NOT EXISTS idx_meta_ads_cache_lookup
  ON meta_ads_cache (cliente_id, cache_key);

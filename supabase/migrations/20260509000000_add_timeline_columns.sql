-- Unified Timeline: extend calendar_events with source tracking
-- event_source: 'manual' | 'ig_post' | 'fb_post' | 'meta_ad'
--             | 'video_aprobado' | 'video_en_corrección' | 'video_publicado' | 'video_entregado'

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS event_source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_id     text,
  ADD COLUMN IF NOT EXISTS metadata      jsonb DEFAULT '{}';

-- Unique constraint enables idempotent upsert for auto-generated events.
-- NULL source_id (manual events) are excluded from uniqueness check by SQL semantics.
ALTER TABLE calendar_events
  DROP CONSTRAINT IF EXISTS uq_calendar_events_source;

ALTER TABLE calendar_events
  ADD CONSTRAINT uq_calendar_events_source
  UNIQUE (cliente_id, event_source, source_id);

-- Fast lookups by source type
CREATE INDEX IF NOT EXISTS idx_calendar_events_source
  ON calendar_events (cliente_id, event_source, date);

CREATE INDEX IF NOT EXISTS idx_calendar_events_source_id
  ON calendar_events (source_id)
  WHERE source_id IS NOT NULL;

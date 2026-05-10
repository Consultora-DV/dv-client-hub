// Unified Timeline Service
// Writes calendar events from any source (posts, ads, video milestones)
// with idempotent upsert on (cliente_id, event_source, source_id).

import { supabase } from "@/integrations/supabase/client";
import type { CalendarEventSource } from "@/data/mockData";
export type { CalendarEventSource } from "@/data/mockData";

export interface TimelineEventInput {
  clienteId: string;
  date: string;              // "YYYY-MM-DD"
  title: string;
  platform: string[];
  contentType?: string;
  eventSource: CalendarEventSource;
  sourceId?: string;         // post id, ad id, video id — drives deduplication
  videoId?: string;          // UUID ref to videos table
  igShortCode?: string;
  time?: string;
  metadata?: Record<string, any>;
}

// SOURCE_CONFIG drives visual appearance everywhere in the app
export const SOURCE_CONFIG: Record<
  CalendarEventSource,
  { label: string; color: string; emoji: string; filterGroup: string }
> = {
  manual:               { label: "Manual",      color: "#9CA3AF", emoji: "📌", filterGroup: "manual" },
  ig_post:              { label: "Post IG",      color: "#E4405F", emoji: "📸", filterGroup: "posts" },
  fb_post:              { label: "Post FB",      color: "#1877F2", emoji: "📘", filterGroup: "posts" },
  meta_ad:              { label: "Meta Ad",      color: "#F59E0B", emoji: "🎯", filterGroup: "ads" },
  video_aprobado:       { label: "Aprobado",     color: "#10B981", emoji: "✅", filterGroup: "videos" },
  "video_en_corrección":{ label: "Corrección",   color: "#FBBF24", emoji: "✏️", filterGroup: "videos" },
  video_publicado:      { label: "Publicado",    color: "#14B8A6", emoji: "🌐", filterGroup: "videos" },
  video_entregado:      { label: "Entregado",    color: "#8B5CF6", emoji: "📦", filterGroup: "videos" },
};

export const FILTER_GROUPS = [
  { key: "all",    label: "Todos" },
  { key: "posts",  label: "Posts" },
  { key: "ads",    label: "Ads" },
  { key: "videos", label: "Videos" },
  { key: "manual", label: "Manual" },
];

/**
 * Upsert timeline events into calendar_events.
 * Auto-events (with sourceId) use ON CONFLICT upsert for idempotency.
 * Manual events (no sourceId) are plain inserts.
 */
export async function upsertTimelineEvents(events: TimelineEventInput[]): Promise<void> {
  if (events.length === 0) return;

  const rows = events.map((e) => ({
    cliente_id:   e.clienteId,
    date:         e.date,
    title:        e.title,
    platform:     e.platform,
    content_type: e.contentType || null,
    time:         e.time || null,
    event_source: e.eventSource,
    source_id:    e.sourceId || null,
    video_id:     e.videoId || null,
    ig_short_code: e.igShortCode || null,
    metadata:     e.metadata || {},
  }));

  // Auto-generated events with a sourceId → upsert (idempotent re-sync)
  const autoRows = rows.filter((r) => r.source_id);
  if (autoRows.length > 0) {
    const { error } = await supabase
      .from("calendar_events")
      .upsert(autoRows, {
        onConflict: "cliente_id,event_source,source_id",
        ignoreDuplicates: false,
      });
    if (error) console.error("upsertTimelineEvents (auto):", error);
  }

  // Manual / no-sourceId → plain insert (duplicates allowed)
  const manualRows = rows.filter((r) => !r.source_id);
  if (manualRows.length > 0) {
    const { error } = await supabase
      .from("calendar_events")
      .insert(manualRows);
    if (error) console.error("upsertTimelineEvents (manual):", error);
  }
}

/**
 * Build a "video milestone" timeline event for a given status change.
 * Returns null if the status doesn't warrant a calendar entry.
 */
export function videoStatusToTimeline(
  videoId: string,
  videoTitle: string,
  clienteId: string,
  newStatus: string,
  thumbnailUrl?: string
): TimelineEventInput | null {
  const today = new Date().toISOString().split("T")[0];

  const STATUS_MAP: Record<string, CalendarEventSource> = {
    aprobado:           "video_aprobado",
    "en corrección":    "video_en_corrección",
    "en_corrección":    "video_en_corrección",
    publicado:          "video_publicado",
    entregado:          "video_entregado",
  };

  const src = STATUS_MAP[newStatus.toLowerCase()];
  if (!src) return null;

  const cfg = SOURCE_CONFIG[src];
  return {
    clienteId,
    date: today,
    title: `${cfg.emoji} ${videoTitle}`,
    platform: ["instagram"],
    eventSource: src,
    sourceId: `${videoId}_${src}`, // unique per video per milestone
    videoId,
    metadata: { status: newStatus, thumbnail: thumbnailUrl },
  };
}

import { supabase } from "@/integrations/supabase/client";
import { Video, CalendarEvent, Comment } from "@/data/mockData";

// ── Helpers to convert between app models and DB rows ──

function videoFromRow(row: any): Video {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    title: row.title,
    platform: row.platform || [],
    status: row.status,
    thumbnail: row.thumbnail || "",
    deliveryDate: row.delivery_date || "",
    embedUrl: row.embed_url || "",
    driveLink: row.drive_link || "#",
    comments: [],
    statusHistory: row.status_history || [],
    igCaption: row.ig_caption || "",
    igLikes: row.ig_likes || 0,
    igComments: row.ig_comments || 0,
    igViews: row.ig_views || 0,
    igHashtags: row.ig_hashtags || [],
    igShortCode: row.ig_short_code || "",
  };
}

function videoToRow(v: Video) {
  return {
    id: v.id.startsWith("ig_") ? undefined : undefined, // let DB generate UUID
    cliente_id: v.clienteId,
    title: v.title,
    platform: v.platform,
    status: v.status,
    thumbnail: v.thumbnail,
    delivery_date: v.deliveryDate || null,
    embed_url: v.embedUrl || "",
    drive_link: v.driveLink || "#",
    status_history: JSON.parse(JSON.stringify(v.statusHistory || [])),
    ig_caption: (v as any).igCaption || "",
    ig_likes: (v as any).igLikes || 0,
    ig_comments: (v as any).igComments || 0,
    ig_views: (v as any).igViews || 0,
    ig_hashtags: (v as any).igHashtags || [],
    ig_short_code: (v as any).igShortCode || "",
  };
}

function eventFromRow(row: any): CalendarEvent {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    date: row.date,
    title: row.title,
    platform: row.platform || [],
    contentType: row.content_type || "",
    time: row.time || "00:00",
    videoId: row.video_id || undefined,
    igShortCode: row.ig_short_code || undefined,
  };
}

function eventToRow(e: CalendarEvent) {
  return {
    cliente_id: e.clienteId,
    date: e.date,
    title: e.title,
    platform: e.platform,
    content_type: e.contentType || "",
    time: e.time || "00:00",
    ig_short_code: (e as any).igShortCode || "",
  };
}

function commentFromRow(row: any): Comment {
  return {
    id: row.id,
    author: row.author,
    isClient: row.is_client,
    text: row.text,
    date: row.date,
  };
}

// ── Fetch ──

export async function fetchVideos(): Promise<Video[]> {
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("fetchVideos:", error); return []; }
  return (data || []).map(videoFromRow);
}

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .order("date", { ascending: false });
  if (error) { console.error("fetchCalendarEvents:", error); return []; }
  return (data || []).map(eventFromRow);
}

export async function fetchVideoComments(videoId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("video_comments")
    .select("*")
    .eq("video_id", videoId)
    .order("date", { ascending: false });
  if (error) { console.error("fetchVideoComments:", error); return []; }
  return (data || []).map(commentFromRow);
}

export async function fetchAllComments(): Promise<Record<string, Comment[]>> {
  const { data, error } = await supabase
    .from("video_comments")
    .select("*")
    .order("date", { ascending: false });
  if (error) { console.error("fetchAllComments:", error); return {}; }
  const map: Record<string, Comment[]> = {};
  for (const row of data || []) {
    const vid = row.video_id;
    if (!map[vid]) map[vid] = [];
    map[vid].push(commentFromRow(row));
  }
  return map;
}

// ── Write ──

export async function insertVideos(videos: Video[]): Promise<Video[]> {
  if (videos.length === 0) return [];
  const rows = videos.map(videoToRow);
  const { data, error } = await supabase
    .from("videos")
    .insert(rows)
    .select();
  if (error) { console.error("insertVideos:", error); throw error; }
  return (data || []).map(videoFromRow);
}

export async function insertCalendarEvents(events: CalendarEvent[]): Promise<CalendarEvent[]> {
  if (events.length === 0) return [];
  const rows = events.map(eventToRow);
  const { data, error } = await supabase
    .from("calendar_events")
    .insert(rows)
    .select();
  if (error) { console.error("insertCalendarEvents:", error); throw error; }
  return (data || []).map(eventFromRow);
}

export async function insertComment(
  videoId: string,
  author: string,
  text: string,
  isClient: boolean,
  userId: string
): Promise<Comment> {
  const { data, error } = await supabase
    .from("video_comments")
    .insert({
      video_id: videoId,
      author,
      text,
      is_client: isClient,
      user_id: userId,
      date: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) { console.error("insertComment:", error); throw error; }
  return commentFromRow(data);
}

export async function updateVideoStatus(
  videoId: string,
  status: string,
  statusHistory: any[]
): Promise<void> {
  const { error } = await supabase
    .from("videos")
    .update({ status, status_history: statusHistory })
    .eq("id", videoId);
  if (error) { console.error("updateVideoStatus:", error); throw error; }
}

export async function insertPostMetrics(
  clienteId: string,
  platform: string,
  posts: Array<{
    url: string; thumbnail: string; title: string; date: string;
    type: string; views: number; likes: number; comments: number;
    shares: number; reach: number; engagement: number; igShortCode: string;
  }>
): Promise<number> {
  if (posts.length === 0) return 0;

  // Check existing to deduplicate
  const { data: existing } = await supabase
    .from("post_metrics")
    .select("ig_short_code, post_url")
    .eq("cliente_id", clienteId)
    .eq("platform", platform);

  const existingKeys = new Set(
    (existing || []).map((e: any) => e.ig_short_code || e.post_url)
  );

  const unique = posts.filter(
    (p) => !existingKeys.has(p.igShortCode || p.url)
  );

  if (unique.length === 0) return 0;

  const rows = unique.map((p) => ({
    cliente_id: clienteId,
    platform,
    post_url: p.url,
    thumbnail: p.thumbnail,
    title: p.title,
    date: p.date || null,
    type: p.type,
    views: p.views,
    likes: p.likes,
    comments: p.comments,
    shares: p.shares,
    reach: p.reach,
    engagement: p.engagement,
    ig_short_code: p.igShortCode,
  }));

  const { error } = await supabase.from("post_metrics").insert(rows);
  if (error) { console.error("insertPostMetrics:", error); throw error; }
  return unique.length;
}

// ── Deduplication check for videos by ig_short_code ──

export async function getExistingShortCodes(clienteId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("videos")
    .select("ig_short_code, embed_url")
    .eq("cliente_id", clienteId);
  const keys = new Set<string>();
  for (const row of data || []) {
    if (row.ig_short_code) keys.add(row.ig_short_code);
    if (row.embed_url) keys.add(row.embed_url);
  }
  return keys;
}

export async function getExistingEventKeys(clienteId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("calendar_events")
    .select("ig_short_code, date, title")
    .eq("cliente_id", clienteId);
  const keys = new Set<string>();
  for (const row of data || []) {
    if (row.ig_short_code) keys.add(row.ig_short_code);
    keys.add(`${row.date}|${row.title}|${clienteId}`);
  }
  return keys;
}

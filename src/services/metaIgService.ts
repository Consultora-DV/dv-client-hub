import { supabase } from "@/integrations/supabase/client";

export interface MetaSyncResult {
  synced: number;
  refreshed: number;
  errors: number;
  total: number;
  message: string;
}

export interface IgTokenConfig {
  clienteId: string;
  igUserId: string;
  accessToken: string;
  pageId?: string;
  limit?: number;
}

const IG_API = "https://graph.facebook.com/v21.0";
const POST_METRICS = "reach,saved,total_interactions,shares";

// Safe truncate that respects emoji surrogate pairs
function safeTruncate(str: string, maxLen: number): string {
  if (!str) return "";
  return Array.from(str).slice(0, maxLen).join("");
}

// Extract hashtags from caption
function extractHashtags(caption: string): string[] {
  const matches = caption.match(/#[\wÀ-žЀ-ӿ]+/g) || [];
  return matches.slice(0, 30); // cap at 30
}

// ── Instagram / Facebook Graph API helpers ────────────────────

async function igGet(path: string, token: string): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${IG_API}${path}${sep}access_token=${token}`);
  const data = await res.json();
  if (data.error) throw new Error(`Meta API: ${data.error.message}`);
  return data;
}

async function fetchPostInsights(mediaId: string, token: string) {
  try {
    const data = await igGet(`/${mediaId}/insights?metric=${POST_METRICS}`, token);
    const result = { reach: 0, saved: 0, total_interactions: 0, shares: 0 };
    for (const m of data.data || []) {
      const val = m.values?.[0]?.value ?? m.value ?? 0;
      if (m.name in result) (result as any)[m.name] = val;
    }
    return result;
  } catch {
    return { reach: 0, saved: 0, total_interactions: 0, shares: 0 };
  }
}

// ── Paginated media fetch — follows IG cursors until maxLimit ─

async function fetchAllIgMedia(igUserId: string, token: string, fields: string, maxLimit: number): Promise<any[]> {
  const pageSize = 100; // IG API max per page
  let url = `/${igUserId}/media?fields=${fields}&limit=${pageSize}`;
  const all: any[] = [];

  while (all.length < maxLimit) {
    const data = await igGet(url, token);
    const items: any[] = data.data || [];
    all.push(...items);
    if (!data.paging?.next || items.length === 0) break;
    const after = data.paging?.cursors?.after;
    if (!after) break;
    url = `/${igUserId}/media?fields=${fields}&limit=${pageSize}&after=${encodeURIComponent(after)}`;
  }

  return all.slice(0, maxLimit);
}

// ── Upload thumbnail to Supabase Storage (permanent URL) ─────────
async function storeThumbnail(clienteId: string, key: string, cdnUrl: string): Promise<string> {
  if (!cdnUrl) return "";
  try {
    const res = await fetch(cdnUrl);
    if (!res.ok) return cdnUrl;
    const blob = await res.blob();
    const ext = blob.type.includes("png") ? "png" : "jpg";
    const path = `${clienteId}/${key}.${ext}`;
    const { error } = await supabase.storage
      .from("thumbnails")
      .upload(path, blob, { contentType: blob.type, upsert: true });
    if (error) return cdnUrl; // fall back to CDN URL if upload fails
    return supabase.storage.from("thumbnails").getPublicUrl(path).data.publicUrl;
  } catch {
    return cdnUrl; // fall back silently
  }
}

// ── Batch insights fetch — runs INSIGHT_BATCH requests in parallel ─
const INSIGHT_BATCH = 10;

async function fetchInsightsBatch(items: any[], token: string): Promise<Map<string, ReturnType<typeof fetchPostInsights> extends Promise<infer T> ? T : never>> {
  const map = new Map<string, any>();
  for (let i = 0; i < items.length; i += INSIGHT_BATCH) {
    const batch = items.slice(i, i + INSIGHT_BATCH);
    const results = await Promise.all(batch.map((item) => fetchPostInsights(item.id, token)));
    batch.forEach((item, idx) => map.set(item.id, results[idx]));
  }
  return map;
}

// ── Instagram sync ────────────────────────────────────────────

export async function syncInstagramPosts(config: IgTokenConfig): Promise<MetaSyncResult> {
  const { clienteId, igUserId, accessToken, limit = 500 } = config;

  const fields = "id,shortcode,media_type,timestamp,like_count,comments_count,permalink,thumbnail_url,media_url,caption";
  const items = await fetchAllIgMedia(igUserId, accessToken, fields, limit);

  if (items.length === 0) {
    return { synced: 0, refreshed: 0, errors: 0, total: 0, message: "No se encontraron posts" };
  }

  // ── 1. Get existing shortcodes in post_metrics ──
  const { data: existingPm } = await supabase
    .from("post_metrics")
    .select("ig_short_code")
    .eq("cliente_id", clienteId)
    .eq("platform", "instagram");

  const existingPmCodes = new Set((existingPm || []).map((r: any) => r.ig_short_code).filter(Boolean));

  // ── 2. Get existing shortcodes in videos ──
  const { data: existingVids } = await supabase
    .from("videos")
    .select("ig_short_code")
    .eq("cliente_id", clienteId);

  const existingVidCodes = new Set((existingVids || []).map((r: any) => r.ig_short_code).filter(Boolean));

  // ── 3. Fetch all insights + store thumbnails in parallel batches ──
  const insightsMap = await fetchInsightsBatch(items, accessToken);

  // Upload thumbnails to Supabase Storage in batches of 10
  const thumbnailMap = new Map<string, string>();
  for (let i = 0; i < items.length; i += INSIGHT_BATCH) {
    const batch = items.slice(i, i + INSIGHT_BATCH);
    const results = await Promise.all(
      batch.map((item) => {
        const cdnUrl = item.thumbnail_url || item.media_url || "";
        return storeThumbnail(clienteId, item.shortcode, cdnUrl);
      })
    );
    batch.forEach((item, idx) => thumbnailMap.set(item.shortcode, results[idx]));
  }

  // ── 4. Process each post ──
  let synced = 0;
  let refreshed = 0;
  let errors = 0;
  const newPmRows: any[] = [];
  const newVideoRows: any[] = [];

  for (const item of items) {
    const shortcode = item.shortcode;
    const ins = insightsMap.get(item.id) ?? { reach: 0, saved: 0, total_interactions: 0, shares: 0 };
    const caption = safeTruncate((item.caption || "").replace(/\n/g, " "), 200);
    const fullCaption = safeTruncate(item.caption || "", 2200);
    // Use permanent Supabase URL if uploaded, otherwise fall back to CDN URL
    const thumbnail = thumbnailMap.get(shortcode) || item.thumbnail_url || item.media_url || "";
    const engagement = (item.like_count || 0) + (item.comments_count || 0) + ins.shares + ins.saved;

    if (existingPmCodes.has(shortcode)) {
      // Refresh existing post_metrics row
      const { error } = await supabase
        .from("post_metrics")
        .update({
          likes: item.like_count,
          comments: item.comments_count,
          shares: ins.shares,
          reach: ins.reach,
          views: ins.reach,
          engagement,
        })
        .eq("ig_short_code", shortcode)
        .eq("cliente_id", clienteId)
        .eq("platform", "instagram");

      if (error) errors++; else refreshed++;
    } else {
      // Queue new post_metrics row
      newPmRows.push({
        cliente_id: clienteId,
        platform: "instagram",
        post_url: item.permalink,
        thumbnail,
        title: caption,
        date: item.timestamp?.slice(0, 10) || null,
        type: item.media_type,
        views: ins.reach,
        likes: item.like_count,
        comments: item.comments_count,
        shares: ins.shares,
        reach: ins.reach,
        engagement,
        ig_short_code: shortcode,
      });
    }

    // Queue new videos row (if not already in videos table)
    if (!existingVidCodes.has(shortcode)) {
      newVideoRows.push({
        cliente_id: clienteId,
        title: caption || shortcode,
        platform: ["instagram"],
        status: "published",
        thumbnail,
        delivery_date: item.timestamp?.slice(0, 10) || null,
        embed_url: item.permalink || "",
        drive_link: "#",
        status_history: [],
        ig_caption: fullCaption,
        ig_likes: item.like_count || 0,
        ig_comments: item.comments_count || 0,
        ig_views: ins.reach || 0,
        ig_hashtags: extractHashtags(item.caption || ""),
        ig_short_code: shortcode,
      });
    } else {
      // Update existing video ig fields
      await supabase
        .from("videos")
        .update({
          ig_likes: item.like_count,
          ig_comments: item.comments_count,
          ig_views: ins.reach,
        })
        .eq("ig_short_code", shortcode)
        .eq("cliente_id", clienteId);
    }
  }

  // ── 5. Upsert post_metrics (safe on re-sync) ──
  if (newPmRows.length > 0) {
    const { error } = await supabase
      .from("post_metrics")
      .upsert(newPmRows, { onConflict: "cliente_id,platform,ig_short_code", ignoreDuplicates: false });
    if (error) {
      // Fallback: insert individually, skip conflicts
      let inserted = 0;
      for (const row of newPmRows) {
        const { error: e2 } = await supabase.from("post_metrics").insert(row);
        if (!e2) inserted++;
        else errors++;
      }
      synced = inserted;
    } else {
      synced = newPmRows.length;
    }
  }

  // ── 6. Upsert videos (delete-then-insert to avoid duplicates) ──
  if (newVideoRows.length > 0) {
    const shortcodes = newVideoRows.map((r) => r.ig_short_code).filter(Boolean);
    const permalinks = newVideoRows.map((r) => r.embed_url).filter((u) => u && u !== "#");

    // Remove any existing videos with same shortcode or permalink for this client
    if (shortcodes.length > 0) {
      await supabase.from("videos").delete()
        .eq("cliente_id", clienteId)
        .in("ig_short_code", shortcodes);
    }
    if (permalinks.length > 0) {
      await supabase.from("videos").delete()
        .eq("cliente_id", clienteId)
        .in("embed_url", permalinks);
    }

    const { error } = await supabase.from("videos").insert(newVideoRows);
    if (error) console.error("videos insert error:", error);
  }

  const message = `${synced} nuevos posts · ${refreshed} actualizados · ${items.length} total`;
  return { synced, refreshed, errors, total: items.length, message };
}

// ── Facebook Page posts sync ──────────────────────────────────

export async function syncFacebookPosts(config: IgTokenConfig): Promise<MetaSyncResult> {
  const { clienteId, pageId, accessToken, limit = 200 } = config;

  if (!pageId) {
    return { synced: 0, refreshed: 0, errors: 0, total: 0, message: "Page ID no configurado" };
  }

  // Try to get a page access token (needed for insights)
  let pageToken = accessToken;
  try {
    const pageData = await igGet(`/${pageId}?fields=access_token`, accessToken);
    if (pageData.access_token) pageToken = pageData.access_token;
  } catch {
    // Fall back to user token
  }

  // Fetch Facebook Page posts
  const fields = "id,message,created_time,permalink_url,full_picture,shares,reactions.summary(true),comments.summary(true)";
  const pageSize = Math.min(100, limit);
  let url = `/${pageId}/posts?fields=${fields}&limit=${pageSize}`;
  const allPosts: any[] = [];

  while (allPosts.length < limit) {
    let data: any;
    try {
      data = await igGet(url, pageToken);
    } catch {
      break;
    }
    const items: any[] = data.data || [];
    allPosts.push(...items);
    if (!data.paging?.next || items.length === 0) break;
    const after = data.paging?.cursors?.after;
    if (!after) break;
    url = `/${pageId}/posts?fields=${fields}&limit=${pageSize}&after=${encodeURIComponent(after)}`;
  }

  if (allPosts.length === 0) {
    return { synced: 0, refreshed: 0, errors: 0, total: 0, message: "No se encontraron posts de Facebook" };
  }

  // Get existing post_urls for deduplication
  const { data: existingFb } = await supabase
    .from("post_metrics")
    .select("post_url")
    .eq("cliente_id", clienteId)
    .eq("platform", "facebook");

  const existingUrls = new Set((existingFb || []).map((r: any) => r.post_url).filter(Boolean));

  let synced = 0;
  let refreshed = 0;
  let errors = 0;
  const newRows: any[] = [];
  const newVideoRows: any[] = [];

  for (const post of allPosts) {
    const postUrl = post.permalink_url || `https://www.facebook.com/${post.id}`;
    const likes = post.reactions?.summary?.total_count || 0;
    const comments = post.comments?.summary?.total_count || 0;
    const shares = post.shares?.count || 0;
    const caption = safeTruncate((post.message || "").replace(/\n/g, " "), 200);
    const thumbnail = post.full_picture || "";
    const dateStr = post.created_time?.slice(0, 10) || null;
    const engagement = likes + comments + shares;

    if (existingUrls.has(postUrl)) {
      const { error } = await supabase
        .from("post_metrics")
        .update({ likes, comments, shares, engagement })
        .eq("post_url", postUrl)
        .eq("cliente_id", clienteId)
        .eq("platform", "facebook");

      if (error) errors++; else refreshed++;
    } else {
      newRows.push({
        cliente_id: clienteId,
        platform: "facebook",
        post_url: postUrl,
        thumbnail,
        title: caption,
        date: dateStr,
        type: "POST",
        views: 0,
        likes,
        comments,
        shares,
        reach: 0,
        engagement,
      });

      newVideoRows.push({
        cliente_id: clienteId,
        title: caption || post.id,
        platform: ["facebook"],
        status: "published",
        thumbnail,
        delivery_date: dateStr,
        embed_url: postUrl,
        drive_link: "#",
        status_history: [],
        ig_caption: safeTruncate(post.message || "", 2200),
        ig_likes: likes,
        ig_comments: comments,
        ig_views: 0,
        ig_hashtags: extractHashtags(post.message || ""),
        ig_short_code: "",
      });
    }
  }

  if (newRows.length > 0) {
    const { error } = await supabase
      .from("post_metrics")
      .upsert(newRows, { onConflict: "cliente_id,platform,post_url", ignoreDuplicates: false });
    if (error) {
      let inserted = 0;
      for (const row of newRows) {
        const { error: e2 } = await supabase.from("post_metrics").insert(row);
        if (!e2) inserted++; else errors++;
      }
      synced = inserted;
    } else {
      synced = newRows.length;
    }
  }

  if (newVideoRows.length > 0) {
    const fbPermalinks = newVideoRows.map((r) => r.embed_url).filter((u) => u && u !== "#");
    if (fbPermalinks.length > 0) {
      await supabase.from("videos").delete()
        .eq("cliente_id", clienteId)
        .in("embed_url", fbPermalinks);
    }
    await supabase.from("videos").insert(newVideoRows);
  }

  const message = `Facebook: ${synced} nuevos · ${refreshed} actualizados`;
  return { synced, refreshed, errors, total: allPosts.length, message };
}

// ── Token storage in platform_tokens table ────────────────────

export async function savePlatformToken(
  clienteId: string,
  igUserId: string,
  igUsername: string,
  accessToken: string,
  pageId?: string,
  adAccountId?: string,
  expiresAt?: Date
): Promise<void> {
  const { error } = await (supabase as any)
    .from("platform_tokens")
    .upsert(
      {
        cliente_id: clienteId,
        platform: "instagram",
        token: accessToken,
        ig_user_id: igUserId,
        ig_username: igUsername,
        page_id: pageId ?? null,
        ad_account_id: adAccountId ?? null,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
      },
      { onConflict: "cliente_id,platform" }
    );
  if (error) throw error;
}

export async function loadPlatformToken(clienteId: string): Promise<{
  igUserId: string;
  igUsername: string;
  accessToken: string;
  pageId: string | null;
  adAccountId: string | null;
  expiresAt: Date | null;
} | null> {
  const { data, error } = await (supabase as any)
    .from("platform_tokens")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("platform", "instagram")
    .maybeSingle();

  if (error || !data) return null;

  return {
    igUserId: data.ig_user_id || "",
    igUsername: data.ig_username || "",
    accessToken: data.token || "",
    pageId: data.page_id || null,
    adAccountId: data.ad_account_id || null,
    expiresAt: data.expires_at ? new Date(data.expires_at) : null,
  };
}

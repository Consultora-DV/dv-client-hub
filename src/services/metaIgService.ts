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
  limit?: number;
}

const IG_API = "https://graph.facebook.com/v21.0";
const POST_METRICS = "reach,saved,total_interactions,shares";

// Safe truncate that respects emoji surrogate pairs
function safeTruncate(str: string, maxLen: number): string {
  if (!str) return "";
  return Array.from(str).slice(0, maxLen).join("");
}

// ── Instagram Graph API helpers ───────────────────────────────

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

// ── Main sync — runs fully client-side ───────────────────────

export async function syncInstagramPosts(config: IgTokenConfig): Promise<MetaSyncResult> {
  const { clienteId, igUserId, accessToken, limit = 50 } = config;

  // 1. Fetch media list from Instagram
  const fields = "id,shortcode,media_type,timestamp,like_count,comments_count,permalink,thumbnail_url,media_url,caption";
  const mediaData = await igGet(`/${igUserId}/media?fields=${fields}&limit=${Math.min(limit, 100)}`, accessToken);
  const items: any[] = mediaData.data || [];

  if (items.length === 0) {
    return { synced: 0, refreshed: 0, errors: 0, total: 0, message: "No se encontraron posts" };
  }

  // 2. Get existing shortcodes for deduplication
  const { data: existing } = await supabase
    .from("post_metrics")
    .select("ig_short_code")
    .eq("cliente_id", clienteId)
    .eq("platform", "instagram");

  const existingCodes = new Set((existing || []).map((r: any) => r.ig_short_code).filter(Boolean));

  // 3. Process each post
  let synced = 0;
  let refreshed = 0;
  let errors = 0;
  const newRows: any[] = [];

  for (const item of items) {
    const shortcode = item.shortcode;

    if (existingCodes.has(shortcode)) {
      // Update existing row with fresh counts
      const ins = await fetchPostInsights(item.id, accessToken);
      const { error } = await supabase
        .from("post_metrics")
        .update({
          likes: item.like_count,
          comments: item.comments_count,
          shares: ins.shares,
          reach: ins.reach,
          engagement: item.like_count + item.comments_count + ins.shares + ins.saved,
        })
        .eq("ig_short_code", shortcode)
        .eq("cliente_id", clienteId)
        .eq("platform", "instagram");

      if (error) errors++; else refreshed++;
      continue;
    }

    // New post — queue for insert
    const ins = await fetchPostInsights(item.id, accessToken);
    const thumbnail = item.thumbnail_url || item.media_url || "";
    const caption = safeTruncate((item.caption || "").replace(/\n/g, " "), 200);

    newRows.push({
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
      engagement: item.like_count + item.comments_count + ins.shares + ins.saved,
      ig_short_code: shortcode,
    });
  }

  // 4. Batch insert new posts
  if (newRows.length > 0) {
    const { error } = await supabase.from("post_metrics").insert(newRows);
    if (error) { console.error("insert error:", error); errors += newRows.length; }
    else synced = newRows.length;
  }

  // 5. Update videos table ig_* fields for matching shortcodes
  const allShortcodes = items.map((m: any) => m.shortcode).filter(Boolean);
  if (allShortcodes.length > 0) {
    const { data: matchedVideos } = await supabase
      .from("videos")
      .select("id, ig_short_code")
      .eq("cliente_id", clienteId)
      .in("ig_short_code", allShortcodes);

    for (const vid of matchedVideos || []) {
      const match = items.find((m: any) => m.shortcode === (vid as any).ig_short_code);
      if (!match) continue;
      const ins = await fetchPostInsights(match.id, accessToken);
      await supabase
        .from("videos")
        .update({ ig_likes: match.like_count, ig_comments: match.comments_count, ig_views: ins.reach })
        .eq("id", (vid as any).id);
    }
  }

  const message = `${synced} nuevos posts · ${refreshed} actualizados`;
  return { synced, refreshed, errors, total: items.length, message };
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const IG_API = "https://graph.facebook.com/v21.0";
const MAX_POSTS = 50;

// Metrics that work in v21.0 for all media types
const POST_METRICS = "reach,saved,total_interactions,shares";

interface IgMediaItem {
  id: string;
  shortcode: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  timestamp: string;
  like_count: number;
  comments_count: number;
  permalink: string;
  thumbnail_url?: string;
  media_url?: string;
  caption?: string;
}

interface IgInsights {
  reach: number;
  saved: number;
  total_interactions: number;
  shares: number;
}

async function igGet(path: string, token: string): Promise<any> {
  const url = `${IG_API}${path}${path.includes("?") ? "&" : "?"}access_token=${token}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(`IG API: ${data.error.message} (code ${data.error.code})`);
  return data;
}

async function fetchPostInsights(mediaId: string, token: string): Promise<IgInsights> {
  try {
    const data = await igGet(`/${mediaId}/insights?metric=${POST_METRICS}`, token);
    const result: IgInsights = { reach: 0, saved: 0, total_interactions: 0, shares: 0 };
    for (const m of data.data || []) {
      const val = m.values?.[0]?.value ?? m.value ?? 0;
      if (m.name in result) (result as any)[m.name] = val;
    }
    return result;
  } catch {
    return { reach: 0, saved: 0, total_interactions: 0, shares: 0 };
  }
}

async function fetchAllMedia(igUserId: string, token: string, limit = MAX_POSTS): Promise<IgMediaItem[]> {
  const fields = "id,shortcode,media_type,timestamp,like_count,comments_count,permalink,thumbnail_url,media_url,caption";
  const data = await igGet(`/${igUserId}/media?fields=${fields}&limit=${limit}`, token);
  return data.data || [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "No autorizado" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verify user auth
  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await anonClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "No autorizado" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify role: admin or editor only
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  const userRole = roleData?.role || "cliente";
  if (userRole !== "admin" && userRole !== "editor") {
    return new Response(
      JSON.stringify({ error: "Se requiere rol admin o editor" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { clienteId, igUserId, accessToken, limit } = body;

    if (!clienteId || !igUserId || !accessToken) {
      return new Response(
        JSON.stringify({ error: "clienteId, igUserId y accessToken son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const postLimit = Math.min(limit || MAX_POSTS, 100);

    // 1. Fetch media list from Instagram Graph API
    const mediaItems = await fetchAllMedia(igUserId, accessToken, postLimit);

    if (mediaItems.length === 0) {
      return new Response(
        JSON.stringify({ synced: 0, skipped: 0, errors: 0, message: "No se encontraron posts" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check which shortcodes already exist (deduplication)
    const { data: existing } = await adminClient
      .from("post_metrics")
      .select("ig_short_code")
      .eq("cliente_id", clienteId)
      .eq("platform", "instagram");

    const existingCodes = new Set((existing || []).map((r: any) => r.ig_short_code).filter(Boolean));

    // 3. Fetch insights for each post and upsert
    let synced = 0;
    let skipped = 0;
    let errors = 0;

    const rows = [];
    for (const item of mediaItems) {
      if (existingCodes.has(item.shortcode)) {
        // Update existing record with fresh metrics
        const insights = await fetchPostInsights(item.id, accessToken);
        const { error: updateErr } = await adminClient
          .from("post_metrics")
          .update({
            views: item.media_type === "VIDEO" ? insights.total_interactions : null,
            likes: item.like_count,
            comments: item.comments_count,
            shares: insights.shares,
            reach: insights.reach,
            engagement: item.like_count + item.comments_count + insights.shares + insights.saved,
          })
          .eq("ig_short_code", item.shortcode)
          .eq("cliente_id", clienteId)
          .eq("platform", "instagram");

        if (updateErr) errors++;
        else skipped++; // counted as "refreshed"
        continue;
      }

      // New post — fetch insights and queue for insert
      const insights = await fetchPostInsights(item.id, accessToken);
      const thumbnail = item.thumbnail_url || item.media_url || "";

      rows.push({
        cliente_id: clienteId,
        platform: "instagram",
        post_url: item.permalink,
        thumbnail,
        title: (item.caption || "").slice(0, 200).replace(/\n/g, " "),
        date: item.timestamp.slice(0, 10),
        type: item.media_type,
        views: insights.reach, // reach as "views" proxy
        likes: item.like_count,
        comments: item.comments_count,
        shares: insights.shares,
        reach: insights.reach,
        engagement: item.like_count + item.comments_count + insights.shares + insights.saved,
        ig_short_code: item.shortcode,
      });
    }

    // Batch insert new posts
    if (rows.length > 0) {
      const { error: insertErr } = await adminClient.from("post_metrics").insert(rows);
      if (insertErr) {
        console.error("insert error:", insertErr);
        errors += rows.length;
      } else {
        synced = rows.length;
      }
    }

    // 4. Also update videos table ig_* fields for matching shortcodes
    const shortCodesInThisRun = mediaItems.map((m) => m.shortcode).filter(Boolean);
    if (shortCodesInThisRun.length > 0) {
      const { data: matchedVideos } = await adminClient
        .from("videos")
        .select("id, ig_short_code")
        .eq("cliente_id", clienteId)
        .in("ig_short_code", shortCodesInThisRun);

      for (const vid of matchedVideos || []) {
        const match = mediaItems.find((m) => m.shortcode === vid.ig_short_code);
        if (!match) continue;
        const ins = await fetchPostInsights(match.id, accessToken);
        await adminClient
          .from("videos")
          .update({
            ig_likes: match.like_count,
            ig_comments: match.comments_count,
            ig_views: ins.reach,
          })
          .eq("id", vid.id);
      }
    }

    return new Response(
      JSON.stringify({
        synced,
        refreshed: skipped,
        errors,
        total: mediaItems.length,
        message: `${synced} nuevos posts importados, ${skipped} actualizados`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("meta-ig-sync error:", err);
    const message = err instanceof Error ? err.message : "Error interno";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

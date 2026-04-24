import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Allowlist de dominios permitidos para descargar imágenes (previene SSRF)
const ALLOWED_IMAGE_HOSTS = [
  "cdninstagram.com",
  "fbcdn.net",
  "instagram.com",
  "apify.com",
  "api.apify.com",
];

function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Solo HTTP/HTTPS, nunca file://, ftp://, etc.
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    // Bloquear IPs privadas y metadata de cloud
    const hostname = parsed.hostname.toLowerCase();
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.|::1|localhost)/.test(hostname)) return false;
    // Verificar contra allowlist de dominios
    return ALLOWED_IMAGE_HOSTS.some((allowed) => hostname === allowed || hostname.endsWith("." + allowed));
  } catch {
    return false;
  }
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

async function downloadImage(url: string): Promise<{ buffer: Uint8Array; contentType: string } | null> {
  if (!isAllowedImageUrl(url)) {
    console.warn("downloadImage: URL bloqueada por allowlist:", url);
    return null;
  }
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "image/*",
      },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    // Límite de tamaño para evitar DoS
    const blob = await res.blob();
    if (blob.size > MAX_IMAGE_BYTES) {
      console.warn("downloadImage: imagen demasiado grande:", blob.size);
      return null;
    }
    const buffer = new Uint8Array(await blob.arrayBuffer());
    return { buffer, contentType };
  } catch {
    return null;
  }
}

async function fetchThumbnailViaApify(shortCode: string, apifyKey: string): Promise<string | null> {
  // Use Apify Instagram Post Scraper to get a single post's display URL
  const runUrl = "https://api.apify.com/v2/acts/apify~instagram-post-scraper/run-sync-get-dataset-items?token=" + apifyKey;
  try {
    const res = await fetch(runUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        directUrls: [`https://www.instagram.com/reel/${shortCode}/`],
        resultsLimit: 1,
      }),
    });
    if (!res.ok) return null;
    const items = await res.json();
    if (items?.[0]?.displayUrl) return items[0].displayUrl;
    if (items?.[0]?.thumbnailUrl) return items[0].thumbnailUrl;
  } catch (e) {
    console.warn("Apify fetch failed for", shortCode, e);
  }
  return null;
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
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const apifyKey = Deno.env.get("APIFY_API_KEY") || "";

  // Verify user
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

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Verificar rol del usuario: solo admin/editor pueden usar esta función
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  const userRole = roleData?.role || "cliente";
  if (userRole !== "admin" && userRole !== "editor") {
    return new Response(
      JSON.stringify({ error: "No autorizado: se requiere rol admin o editor" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();

    // Batch repair mode
    if (body.mode === "repair") {
      const { clienteId } = body;
      if (!clienteId) {
        return new Response(
          JSON.stringify({ error: "clienteId requerido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: videos } = await supabase
        .from("videos")
        .select("id, ig_short_code, thumbnail")
        .eq("cliente_id", clienteId)
        .neq("ig_short_code", "");

      const toRepair = (videos || []).filter(
        (v: any) => v.ig_short_code && (!v.thumbnail || !v.thumbnail.includes("supabase.co"))
      );

      if (toRepair.length === 0) {
        return new Response(
          JSON.stringify({ repaired: 0, failed: 0, total: 0 }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let repaired = 0;
      let failed = 0;

      // Process in batches of 5 to avoid timeouts
      const batchSize = 5;
      for (let i = 0; i < Math.min(toRepair.length, 20); i += batchSize) {
        const batch = toRepair.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async (v: any) => {
            // First try downloading the existing URL (might still work)
            let img = v.thumbnail ? await downloadImage(v.thumbnail) : null;

            // If original URL failed and we have Apify, try getting a fresh URL
            if (!img && apifyKey) {
              const freshUrl = await fetchThumbnailViaApify(v.ig_short_code, apifyKey);
              if (freshUrl) {
                img = await downloadImage(freshUrl);
              }
            }

            if (!img) throw new Error("Could not fetch image");

            const ext = img.contentType.includes("png") ? "png" : "jpg";
            const filePath = `thumbnails/${clienteId}/${v.ig_short_code}.${ext}`;

            const { error: uploadError } = await supabase.storage
              .from("documents")
              .upload(filePath, img.buffer, { contentType: img.contentType, upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
              .from("documents")
              .getPublicUrl(filePath);

            await supabase
              .from("videos")
              .update({ thumbnail: urlData.publicUrl })
              .eq("id", v.id);
          })
        );

        for (const r of results) {
          if (r.status === "fulfilled") repaired++;
          else failed++;
        }
      }

      return new Response(
        JSON.stringify({ repaired, failed, total: toRepair.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Single mode
    const { imageUrl, clienteId, shortCode } = body;

    if (!clienteId || !shortCode) {
      return new Response(
        JSON.stringify({ error: "clienteId y shortCode son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let imgData = imageUrl ? await downloadImage(imageUrl) : null;

    if (!imgData && apifyKey) {
      const freshUrl = await fetchThumbnailViaApify(shortCode, apifyKey);
      if (freshUrl) {
        imgData = await downloadImage(freshUrl);
      }
    }

    if (!imgData) {
      return new Response(
        JSON.stringify({ error: "No se pudo obtener la imagen" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ext = imgData.contentType.includes("png") ? "png" : "jpg";
    const filePath = `thumbnails/${clienteId}/${shortCode}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, imgData.buffer, { contentType: imgData.contentType, upsert: true });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: `Error subiendo imagen: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: urlData } = supabase.storage
      .from("documents")
      .getPublicUrl(filePath);

    return new Response(
      JSON.stringify({ publicUrl: urlData.publicUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("store-thumbnail error:", err);
    const message = err instanceof Error ? err.message : "Error interno";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

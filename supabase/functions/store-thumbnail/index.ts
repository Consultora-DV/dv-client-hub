import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function fetchThumbnailUrl(shortCode: string): Promise<string | null> {
  // Try Instagram oEmbed API (public, no token needed)
  try {
    const oembedUrl = `https://api.instagram.com/oembed/?url=https://www.instagram.com/reel/${shortCode}/&maxwidth=1080`;
    const res = await fetch(oembedUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.thumbnail_url) return data.thumbnail_url;
    }
  } catch (e) {
    console.warn("oEmbed failed for", shortCode, e);
  }
  return null;
}

async function downloadImage(url: string): Promise<{ buffer: Uint8Array; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "image/*",
      },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const blob = await res.blob();
    const buffer = new Uint8Array(await blob.arrayBuffer());
    return { buffer, contentType };
  } catch {
    return null;
  }
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

  try {
    const body = await req.json();

    // Batch mode: repair all thumbnails for a client
    if (body.mode === "repair") {
      const { clienteId } = body;
      if (!clienteId) {
        return new Response(
          JSON.stringify({ error: "clienteId requerido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get all videos with non-storage thumbnails
      const { data: videos } = await supabase
        .from("videos")
        .select("id, ig_short_code, thumbnail")
        .eq("cliente_id", clienteId)
        .neq("ig_short_code", "");

      const toRepair = (videos || []).filter(
        (v: any) => v.ig_short_code && (!v.thumbnail || !v.thumbnail.includes("supabase.co"))
      );

      let repaired = 0;
      let failed = 0;

      for (const v of toRepair) {
        try {
          // Get fresh thumbnail URL via oEmbed
          const freshUrl = await fetchThumbnailUrl(v.ig_short_code);
          if (!freshUrl) { failed++; continue; }

          // Download
          const img = await downloadImage(freshUrl);
          if (!img) { failed++; continue; }

          const ext = img.contentType.includes("png") ? "png" : "jpg";
          const filePath = `thumbnails/${clienteId}/${v.ig_short_code}.${ext}`;

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from("documents")
            .upload(filePath, img.buffer, { contentType: img.contentType, upsert: true });

          if (uploadError) { failed++; continue; }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from("documents")
            .getPublicUrl(filePath);

          // Update video row
          await supabase
            .from("videos")
            .update({ thumbnail: urlData.publicUrl })
            .eq("id", v.id);

          repaired++;
        } catch {
          failed++;
        }
      }

      return new Response(
        JSON.stringify({ repaired, failed, total: toRepair.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Single mode (original behavior)
    const { imageUrl, clienteId, shortCode } = body;

    if (!clienteId || !shortCode) {
      return new Response(
        JSON.stringify({ error: "clienteId y shortCode son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try provided URL first, fall back to oEmbed
    let imgData: { buffer: Uint8Array; contentType: string } | null = null;

    if (imageUrl) {
      imgData = await downloadImage(imageUrl);
    }

    if (!imgData) {
      const freshUrl = await fetchThumbnailUrl(shortCode);
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
    return new Response(
      JSON.stringify({ error: err.message || "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

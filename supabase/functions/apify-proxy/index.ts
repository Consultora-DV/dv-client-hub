import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const APIFY_BASE = "https://api.apify.com/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Verificar autenticación
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "No autorizado" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const anonClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await anonClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "No autorizado" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verificar rol: solo admin o editor pueden usar Apify (evita abuso de créditos)
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: roleData } = await adminClient
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

  const apifyToken = Deno.env.get("APIFY_API_KEY");
  if (!apifyToken) {
    return new Response(
      JSON.stringify({ error: "Apify API key no configurada en el servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { action, runId, datasetId, scraperBody } = body;

    let apifyUrl: string;
    let apifyMethod = "GET";
    let apifyBody: string | undefined;

    switch (action) {
      case "start":
        apifyUrl = `${APIFY_BASE}/acts/apify~instagram-post-scraper/runs?token=${apifyToken}&memory=2048`;
        apifyMethod = "POST";
        apifyBody = JSON.stringify(scraperBody);
        break;
      case "poll":
        if (!runId) throw new Error("runId required");
        apifyUrl = `${APIFY_BASE}/actor-runs/${runId}?token=${apifyToken}`;
        break;
      case "results":
        if (!datasetId) throw new Error("datasetId required");
        apifyUrl = `${APIFY_BASE}/datasets/${datasetId}/items?token=${apifyToken}&clean=true&format=json`;
        break;
      default:
        throw new Error("Invalid action");
    }

    const apifyRes = await fetch(apifyUrl, {
      method: apifyMethod,
      headers: apifyMethod === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: apifyBody,
    });

    const data = await apifyRes.json();

    return new Response(JSON.stringify(data), {
      status: apifyRes.ok ? 200 : apifyRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Error interno" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

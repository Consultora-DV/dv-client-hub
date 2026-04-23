import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GATEWAY_URL = "https://ai-gateway.lovable.dev";

const SYSTEM_PROMPT =
  "Eres un asistente que extrae información estructurada de documentos de briefing para agencias de marketing. Devuelve SOLO un JSON válido con la estructura solicitada, sin texto adicional, sin markdown, sin ```json.";

function buildUserPrompt(text: string) {
  return `Extrae la información de este documento y devuélvela como JSON con estos campos: nombre, apellido, negocio, giro, ciudad, pais, objetivos, redes (array con plataforma/usuario/seguidores/url), metricas (array con plataforma/seguidores/alcance_mensual/publicaciones_mes), notas. Si un campo no existe en el documento, omítelo. Documento:\n\n${text}`;
}

function unauthorized(msg = "No autorizado") {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth check: only authenticated admin/editor users can use AI parsing ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return unauthorized("Falta el token de autenticación.");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return unauthorized("Sesión inválida o expirada.");
    }

    const userId = userData.user.id;

    // Verify role: admin or editor only (this is an admin-facing onboarding tool)
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (rolesError) {
      console.error("ai-parse-blueprint: roles fetch error", rolesError);
      return unauthorized("No se pudo validar tu rol.");
    }

    const allowed = (roles || []).some(
      (r: { role: string }) => r.role === "admin" || r.role === "editor"
    );
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Solo administradores o editores pueden usar el análisis con IA." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "El texto del documento es muy corto o está vacío." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cap input length defensively to avoid runaway gateway costs
    const safeText = text.substring(0, 15000);

    const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(safeText) },
        ],
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("AI Gateway error:", res.status, errText);
      throw new Error(`Error del servicio de IA (${res.status})`);
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      const match = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        parsed = JSON.parse(match[1].trim());
      } else {
        const start = rawContent.indexOf("{");
        const end = rawContent.lastIndexOf("}");
        if (start !== -1 && end > start) {
          parsed = JSON.parse(rawContent.substring(start, end + 1));
        } else {
          throw new Error("No se pudo interpretar la respuesta de la IA.");
        }
      }
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("ai-parse-blueprint error:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

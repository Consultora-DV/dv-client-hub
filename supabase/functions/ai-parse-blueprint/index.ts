import { corsHeaders } from '@supabase/supabase-js/cors'

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GATEWAY_URL = "https://ai-gateway.lovable.dev";

const SYSTEM_PROMPT =
  "Eres un asistente que extrae información estructurada de documentos de briefing para agencias de marketing. Devuelve SOLO un JSON válido con la estructura solicitada, sin texto adicional, sin markdown, sin ```json.";

function buildUserPrompt(text: string) {
  return `Extrae la información de este documento y devuélvela como JSON con estos campos: nombre, apellido, negocio, giro, ciudad, pais, objetivos, redes (array con plataforma/usuario/seguidores/url), metricas (array con plataforma/seguidores/alcance_mensual/publicaciones_mes), notas. Si un campo no existe en el documento, omítelo. Documento:\n\n${text}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    // Use Lovable AI Gateway with gemini-2.5-flash (fast, good for structured extraction)
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
          { role: "user", content: buildUserPrompt(text.substring(0, 15000)) },
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

    // Extract JSON from response
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

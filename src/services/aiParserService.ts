export interface BlueprintResult {
  nombre?: string;
  apellido?: string;
  negocio?: string;
  giro?: string;
  ciudad?: string;
  pais?: string;
  objetivos?: string;
  redes?: {
    plataforma: string;
    usuario: string;
    seguidores?: number;
    url?: string;
  }[];
  metricas?: {
    plataforma: string;
    seguidores?: number;
    alcance_mensual?: number;
    publicaciones_mes?: number;
  }[];
  notas?: string;
}

const SYSTEM_PROMPT =
  "Eres un asistente que extrae información estructurada de documentos de briefing para agencias de marketing. Devuelve SOLO un JSON válido con la estructura solicitada, sin texto adicional, sin markdown, sin ```json.";

const USER_PROMPT = (text: string) =>
  `Extrae la información de este documento y devuélvela como JSON con estos campos: nombre, apellido, negocio, giro, ciudad, pais, objetivos, redes (array con plataforma/usuario/seguidores/url), metricas (array con plataforma/seguidores/alcance_mensual/publicaciones_mes), notas. Si un campo no existe en el documento, omítelo. Documento:\n\n${text}`;

function extractJson(raw: string): BlueprintResult {
  // Try direct parse first
  try { return JSON.parse(raw); } catch {}
  // Try extracting from markdown code block
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    try { return JSON.parse(match[1].trim()); } catch {}
  }
  // Try finding first { ... }
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(raw.substring(start, end + 1)); } catch {}
  }
  throw new Error("No se pudo interpretar la respuesta de la IA. Verifica que el documento tenga texto legible.");
}

export async function parseBlueprint(
  text: string,
  provider: "claude" | "openai",
  apiKey: string
): Promise<BlueprintResult> {
  if (provider === "claude") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: USER_PROMPT(text) }],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Error de Claude (${res.status}): ${t}`);
    }
    const data = await res.json();
    return extractJson(data.content?.[0]?.text || "");
  }

  // OpenAI
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT(text) },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Error de OpenAI (${res.status}): ${t}`);
  }
  const data = await res.json();
  return extractJson(data.choices?.[0]?.message?.content || "");
}

import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sbForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_videos",
  title: "Listar videos",
  description:
    "Lista los videos del panel de Consultora DV visibles para el usuario autenticado (respeta RLS). Filtros opcionales por estado (pending/approved/rejected/in_review) y cliente.",
  inputSchema: {
    status: z.string().optional().describe("Filtrar por estado exacto del video."),
    cliente_id: z.string().uuid().optional().describe("Filtrar por ID del cliente."),
    limit: z.number().int().min(1).max(100).optional().describe("Máximo de filas (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, cliente_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    let q = sbForUser(ctx)
      .from("videos")
      .select("id,title,status,platform,delivery_date,embed_url,cliente_id,rec_number,editor_name,priority,updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 25);
    if (status) q = q.eq("status", status);
    if (cliente_id) q = q.eq("cliente_id", cliente_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { videos: data ?? [] },
    };
  },
});

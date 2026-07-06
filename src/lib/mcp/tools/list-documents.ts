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
  name: "list_documents",
  title: "Listar documentos",
  description:
    "Lista los documentos del panel visibles para el usuario autenticado. Respeta RLS.",
  inputSchema: {
    cliente_id: z.string().uuid().optional(),
    type: z.string().optional().describe("Filtrar por tipo (contrato, brief, etc.)."),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ cliente_id, type, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    let q = sbForUser(ctx)
      .from("documents")
      .select("id,name,type,date,drive_link,file_url,cliente_id,updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 25);
    if (cliente_id) q = q.eq("cliente_id", cliente_id);
    if (type) q = q.eq("type", type);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { documents: data ?? [] },
    };
  },
});

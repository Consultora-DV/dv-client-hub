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
  name: "list_scripts",
  title: "Listar guiones",
  description:
    "Lista los guiones (scripts) del panel visibles para el usuario autenticado. Respeta RLS.",
  inputSchema: {
    status: z.string().optional().describe("Filtrar por estado."),
    cliente_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, cliente_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    let q = sbForUser(ctx)
      .from("scripts")
      .select("id,title,status,date,drive_link,cliente_id,updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 25);
    if (status) q = q.eq("status", status);
    if (cliente_id) q = q.eq("cliente_id", cliente_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { scripts: data ?? [] },
    };
  },
});

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
  name: "list_calendar_events",
  title: "Listar eventos del calendario",
  description:
    "Lista eventos del calendario editorial en un rango de fechas (YYYY-MM-DD). Respeta RLS.",
  inputSchema: {
    from: z.string().optional().describe("Fecha inicial YYYY-MM-DD (inclusive)."),
    to: z.string().optional().describe("Fecha final YYYY-MM-DD (inclusive)."),
    cliente_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, cliente_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    let q = sbForUser(ctx)
      .from("calendar_events")
      .select("id,title,date,time,platform,content_type,cliente_id,video_id")
      .order("date", { ascending: true })
      .limit(limit ?? 50);
    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);
    if (cliente_id) q = q.eq("cliente_id", cliente_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { events: data ?? [] },
    };
  },
});

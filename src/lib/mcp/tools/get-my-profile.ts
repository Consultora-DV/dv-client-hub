import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function sbForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_my_profile",
  title: "Mi perfil",
  description:
    "Devuelve el perfil, rol y estado de aprobación del usuario autenticado en el panel de Consultora DV.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const sb = sbForUser(ctx);
    const userId = ctx.getUserId();
    const [{ data: profile, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      sb.from("profiles").select("display_name,email,business,approval_status,phone,bio").eq("user_id", userId).maybeSingle(),
      sb.from("user_roles").select("role").eq("user_id", userId),
    ]);
    if (pErr) return { content: [{ type: "text", text: pErr.message }], isError: true };
    if (rErr) return { content: [{ type: "text", text: rErr.message }], isError: true };
    const result = { user_id: userId, email: ctx.getUserEmail(), profile, roles: (roles ?? []).map((r) => r.role) };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});

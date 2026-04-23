import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ALLOWED_ORIGINS = [
  "https://paneldecliente.lovable.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(origin) });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Sesión inválida" }), {
        status: 401, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Solo administradores" }), {
        status: 403, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId requerido" }), {
        status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }
    if (userId === caller.id) {
      return new Response(JSON.stringify({ error: "No puedes eliminarte a ti mismo" }), {
        status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // Borrar filas dependientes en orden seguro.
    // Si algún paso falla, retornamos error antes de llegar a auth.users
    // para evitar dejar el usuario vivo con datos huérfanos.
    const steps: Array<{ table: string; field: string }> = [
      { table: "user_roles",      field: "user_id" },
      { table: "client_profiles", field: "user_id" },
      { table: "video_comments",  field: "user_id" },
      { table: "videos",          field: "cliente_id" },
      { table: "calendar_events", field: "cliente_id" },
      { table: "post_metrics",    field: "cliente_id" },
      { table: "profiles",        field: "user_id" },
    ];

    for (const step of steps) {
      const { error: stepErr } = await adminClient
        .from(step.table)
        .delete()
        .eq(step.field, userId);
      if (stepErr) {
        console.error(`delete-user: error borrando ${step.table}:`, stepErr);
        return new Response(
          JSON.stringify({ error: `Error eliminando datos en ${step.table}: ${stepErr.message}` }),
          { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
        );
      }
    }

    // Solo borramos auth.users cuando todos los datos relacionados ya fueron eliminados
    const { error: delErr } = await adminClient.auth.admin.deleteUser(userId);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("delete-user error:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
});

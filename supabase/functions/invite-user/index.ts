import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  try {
    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin using their token
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await callerClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const callerId = claims.claims.sub;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller is admin
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Solo administradores pueden invitar usuarios" }), {
        status: 403, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const { email, name, role } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email requerido" }), {
        status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // Validar rol contra el enum antes de crear el usuario
    const VALID_ROLES = ["admin", "editor", "diseñador", "cliente"];
    const assignedRole = role || "cliente";
    if (!VALID_ROLES.includes(assignedRole)) {
      return new Response(JSON.stringify({ error: `Rol inválido: '${assignedRole}'. Roles permitidos: ${VALID_ROLES.join(", ")}` }), {
        status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // Create user via admin API (does NOT affect caller's session)
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      email_confirm: true,
      user_metadata: { display_name: name?.trim() || email.split("@")[0] },
    });

    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), {
        status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // Assign role (always explicit now que validamos el enum arriba)
    if (assignedRole !== "cliente" && newUser.user) {
      await adminClient.from("user_roles").upsert(
        { user_id: newUser.user.id, role: assignedRole },
        { onConflict: "user_id" }
      );
    }

    // Auto-approve users created by admin (they don't need manual approval)
    if (newUser.user) {
      await adminClient
        .from("profiles")
        .update({ approval_status: "approved" })
        .eq("user_id", newUser.user.id);
    }

    // Send password reset email so user can set their own password
    await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: email.trim(),
      options: {
        redirectTo: `${req.headers.get("origin") || "https://paneldecliente.lovable.app"}/auth`,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      userId: newUser.user?.id,
    }), {
      status: 200,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("invite-user error:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, name, role } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign role if not cliente (cliente is default)
    if (role && role !== "cliente" && newUser.user) {
      await adminClient.from("user_roles").upsert(
        { user_id: newUser.user.id, role },
        { onConflict: "user_id" }
      );
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("invite-user error:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

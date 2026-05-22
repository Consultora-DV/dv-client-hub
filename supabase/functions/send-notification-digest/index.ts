// Edge Function: send-notification-digest
// Sends a digest email of all unsent notifications for a given user via Resend,
// then marks them as email_sent=true.
//
// REQUIRES SECRETS in Supabase:
//   - RESEND_API_KEY:    your Resend API key (https://resend.com/api-keys)
//   - RESEND_FROM:       sender email (e.g. "DV Hub <noreply@tudominio.com>")
//                        For testing you can use "DV Hub <onboarding@resend.dev>"
//   - APP_URL:           e.g. "https://dv-client-hub-claudecode.vercel.app"
//
// CORS: enabled for browser invocation.

// @ts-nocheck — Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const RESEND_FROM    = Deno.env.get("RESEND_FROM") || "DV Hub <onboarding@resend.dev>";
    const APP_URL        = Deno.env.get("APP_URL") || "https://dv-client-hub-claudecode.vercel.app";
    const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY no configurada en Supabase secrets" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Fetch user profile
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr || !profile?.email) {
      return new Response(JSON.stringify({ error: "Usuario sin email registrado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch unsent notifications
    const { data: notifs, error: nErr } = await supabase
      .from("notifications")
      .select("id, type, message, link, date")
      .eq("user_id", userId)
      .eq("email_sent", false)
      .order("date", { ascending: false });
    if (nErr) throw nErr;
    if (!notifs || notifs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No hay notificaciones pendientes" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = profile.display_name || profile.email.split("@")[0];

    // 3. Build email HTML
    const itemsHtml = notifs.map((n) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #2a2a2a;color:#e5e5e5;font-size:14px;">
          ${escapeHtml(n.message)}
          <div style="color:#888;font-size:11px;margin-top:4px;">
            ${new Date(n.date).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
          </div>
        </td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#161616;border-radius:14px;border:1px solid #2a2a2a;overflow:hidden;">
        <tr><td style="padding:24px 32px;background:linear-gradient(135deg,#d4af37 0%,#a88824 100%);">
          <h1 style="margin:0;font-size:20px;color:#1a1a1a;font-weight:600;">DV Client Hub</h1>
          <p style="margin:4px 0 0;font-size:13px;color:#2a2a2a;">Resumen de actividad</p>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <p style="margin:0 0 8px;color:#e5e5e5;font-size:15px;">Hola ${escapeHtml(name)},</p>
          <p style="margin:0;color:#888;font-size:13px;">Tienes <strong style="color:#d4af37;">${notifs.length} actualización${notifs.length === 1 ? "" : "es"}</strong> pendiente${notifs.length === 1 ? "" : "s"} de revisar en tu panel:</p>
        </td></tr>
        <tr><td style="padding:0 16px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0e0e0e;border-radius:10px;border:1px solid #2a2a2a;">
            ${itemsHtml}
          </table>
        </td></tr>
        <tr><td style="padding:8px 32px 28px;" align="center">
          <a href="${APP_URL}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#d4af37,#a88824);color:#1a1a1a;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Entrar al panel →</a>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #2a2a2a;color:#666;font-size:11px;" align="center">
          Este email fue enviado manualmente por el administrador.<br/>
          Para detenerlos, responde a este correo.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    // 4. Send via Resend
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [profile.email],
        subject: `📬 Tienes ${notifs.length} actualización${notifs.length === 1 ? "" : "es"} — DV Hub`,
        html,
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      console.error("Resend error:", err);
      return new Response(JSON.stringify({ error: `Resend: ${err}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Mark as sent
    const ids = notifs.map((n) => n.id);
    await supabase
      .from("notifications")
      .update({ email_sent: true, email_sent_at: new Date().toISOString() })
      .in("id", ids);

    return new Response(JSON.stringify({ sent: notifs.length, to: profile.email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-notification-digest error:", err);
    return new Response(JSON.stringify({ error: err.message || "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

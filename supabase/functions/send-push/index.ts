// Edge Function: send-push
// Delivers Web Push notifications to a user's devices (works with the app CLOSED).
//
// The CLIENT only sends an EVENT ('video_delivered' | 'video_status' |
// 'editor_assigned' | 'test'); recipients and message are computed HERE,
// server-side, so a user can't spam arbitrary people.
//
// REQUIRES SECRETS in Supabase (Project → Edge Functions → Secrets):
//   - VAPID_PUBLIC_KEY    (matches src/config/push.ts)
//   - VAPID_PRIVATE_KEY
//   - VAPID_SUBJECT       e.g. "mailto:adantevele@gmail.com"
//   (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
//
// @ts-nocheck — Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:adantevele@gmail.com";

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return json({ error: "Faltan los secrets VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY" }, 500);
    }
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    // ── Authenticate caller ──
    const authHeader = req.headers.get("Authorization") || "";
    const authed = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await authed.auth.getUser();
    const caller = userData?.user;
    if (!caller) return json({ error: "No autenticado" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const event = body.event as string;

    const isAdmin = async (uid: string) => {
      const { data } = await admin.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
      return !!data;
    };

    // ── Resolve recipients + payload (server-side) ──
    let recipients: string[] = [];
    let payload: { title: string; body: string; url: string; tag?: string };

    if (event === "test") {
      recipients = [caller.id];
      payload = { title: "🔔 Prueba de notificación", body: "¡Funciona! Las notificaciones push están activas en este dispositivo.", url: "/", tag: "test" };
    } else if (event === "video_delivered") {
      const { data: v } = await admin.from("videos").select("id, title, editor_id, editor_name, rec_number, rec_order, cliente_id").eq("id", body.videoId).maybeSingle();
      if (!v) return json({ error: "Video no encontrado" }, 404);
      const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
      recipients = (admins || []).map((r) => r.user_id).filter((id) => id !== v.editor_id);
      const rec = v.rec_number != null ? `R${v.rec_number}-${String(v.rec_order ?? 0).padStart(2, "0")}` : "sin REC";
      payload = { title: "🎬 Nueva entrega", body: `${v.editor_name || "Un editor"} subió "${v.title}" (${rec})`, url: "/admin/entregas", tag: `video-${v.id}` };
    } else if (event === "video_status") {
      const { data: v } = await admin.from("videos").select("id, title, editor_id, status, cliente_id").eq("id", body.videoId).maybeSingle();
      if (!v) return json({ error: "Video no encontrado" }, 404);
      // Allowed: an admin, or the client who owns this video (they approve / request changes).
      if (!(await isAdmin(caller.id)) && caller.id !== v.cliente_id) return json({ error: "No autorizado" }, 403);
      if (!v.editor_id) return json({ sent: 0, message: "Sin editor asignado" });
      recipients = [v.editor_id];
      const status = body.status || v.status;
      const label: Record<string, string> = {
        approved: "aprobada ✅", changes: "requiere cambios ✏️", published: "publicada 🌐",
        in_review: "en revisión 👀", pending: "por hacer 📝",
      };
      payload = { title: "📹 Actualización de tu entrega", body: `"${v.title}" → ${label[status] || status}`, url: "/editor/dashboard", tag: `video-${v.id}` };
    } else if (event === "editor_assigned") {
      if (!(await isAdmin(caller.id))) return json({ error: "Solo admin" }, 403);
      recipients = [body.editorId];
      const { data: c } = await admin.from("profiles").select("display_name, email").eq("user_id", body.clienteId).maybeSingle();
      const name = c?.display_name || c?.email || "un cliente";
      payload = { title: "👥 Nuevo cliente asignado", body: `Te asignaron a ${name}`, url: "/editor/dashboard", tag: "assignment" };
    } else {
      return json({ error: "Evento no reconocido" }, 400);
    }

    recipients = [...new Set(recipients.filter(Boolean))];
    if (recipients.length === 0) return json({ sent: 0, message: "Sin destinatarios" });

    // ── Fetch subscriptions ──
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", recipients);

    if (!subs || subs.length === 0) return json({ sent: 0, message: "Destinatarios sin dispositivos suscritos" });

    const notifPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url,
      tag: payload.tag,
      icon: "/icons/icon-192.png",
    });

    let sent = 0;
    const expired: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            notifPayload
          );
          sent++;
        } catch (err: any) {
          const code = err?.statusCode;
          if (code === 404 || code === 410) expired.push(s.id);
          else console.error("push error:", code, err?.body || err?.message);
        }
      })
    );

    // Prune dead subscriptions.
    if (expired.length) await admin.from("push_subscriptions").delete().in("id", expired);

    return json({ sent, expired: expired.length, recipients: recipients.length });
  } catch (err: any) {
    console.error("send-push error:", err);
    return json({ error: err?.message || "Error desconocido" }, 500);
  }
});

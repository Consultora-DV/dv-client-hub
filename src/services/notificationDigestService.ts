// Notification Digest Service (admin)
// Lets admin manually send email summaries of pending (unsent) notifications.

import { supabase } from "@/integrations/supabase/client";

export interface PendingDigestUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  count: number;
  latestAt: string;
  notifications: {
    id: string;
    message: string;
    link: string;
    type: string;
    date: string;
  }[];
}

export async function fetchPendingDigests(): Promise<PendingDigestUser[]> {
  // 1. all unread + unsent notifications
  const { data: notifs, error } = await supabase
    .from("notifications")
    .select("id, user_id, type, message, link, date, email_sent")
    .eq("email_sent", false)
    .order("date", { ascending: false });
  if (error || !notifs) { console.error(error); return []; }

  if (notifs.length === 0) return [];

  // 2. group by user_id
  const byUser = new Map<string, typeof notifs>();
  for (const n of notifs) {
    if (!byUser.has(n.user_id)) byUser.set(n.user_id, []);
    byUser.get(n.user_id)!.push(n);
  }

  // 3. fetch profiles for these users
  const userIds = Array.from(byUser.keys());
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, email")
    .in("user_id", userIds);
  const { data: roles } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", userIds);

  const profileMap = new Map<string, { name: string; email: string }>(
    (profiles || []).map((p: any) => [p.user_id, {
      name: p.display_name || p.email?.split("@")[0] || "Usuario",
      email: p.email || "",
    }])
  );
  const roleMap = new Map<string, string>(
    (roles || []).map((r: any) => [r.user_id, r.role])
  );

  // 4. compose result
  const result: PendingDigestUser[] = [];
  for (const [userId, items] of byUser.entries()) {
    const prof = profileMap.get(userId);
    if (!prof || !prof.email) continue; // skip users with no email
    result.push({
      userId,
      name: prof.name,
      email: prof.email,
      role: roleMap.get(userId) || "cliente",
      count: items.length,
      latestAt: items[0].date,
      notifications: items.map((n) => ({
        id: n.id,
        message: n.message,
        link: n.link,
        type: n.type,
        date: n.date,
      })),
    });
  }

  // Sort by latest activity
  result.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
  return result;
}

/** Calls the Supabase Edge Function that sends the email + marks notifs as sent */
export async function sendDigestToUser(userId: string): Promise<{ ok: boolean; sent: number; error?: string }> {
  const { data, error } = await supabase.functions.invoke("send-notification-digest", {
    body: { userId },
  });
  if (error) return { ok: false, sent: 0, error: error.message };
  if (data?.error) return { ok: false, sent: 0, error: data.error };
  return { ok: true, sent: data?.sent || 0 };
}

/** Marks notifications as email_sent WITHOUT sending email (for cleanup) */
export async function dismissDigestForUser(userId: string): Promise<{ ok: boolean }> {
  const { error } = await supabase
    .from("notifications")
    .update({ email_sent: true, email_sent_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("email_sent", false);
  if (error) { console.error(error); return { ok: false }; }
  return { ok: true };
}

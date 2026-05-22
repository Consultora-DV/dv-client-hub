// Browser Desktop Notification helper
// Fires native OS notification when app tab is hidden/not focused.

const KEY_ASKED = "dv_notif_asked";
const KEY_ENABLED = "dv_notif_enabled";

export type NotifPermission = "default" | "granted" | "denied" | "unsupported";

export function getPermission(): NotifPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as NotifPermission;
}

export function wasAskedAlready(): boolean {
  return localStorage.getItem(KEY_ASKED) === "1";
}

export function markAsked() {
  localStorage.setItem(KEY_ASKED, "1");
}

export async function requestPermission(): Promise<NotifPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  markAsked();
  try {
    const p = await Notification.requestPermission();
    if (p === "granted") localStorage.setItem(KEY_ENABLED, "1");
    return p as NotifPermission;
  } catch {
    return "denied";
  }
}

export interface DesktopNotif {
  title: string;
  body: string;
  link?: string;
  tag?: string;
}

/** Shows OS notification only if tab is hidden/unfocused. Returns true if shown. */
export function showDesktopNotification(n: DesktopNotif): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;
  // Skip when tab is focused — in-app toast is enough
  if (document.visibilityState === "visible" && document.hasFocus()) return false;

  try {
    const notif = new Notification(n.title, {
      body: n.body,
      icon: "/favicon.ico",
      tag: n.tag || `dv-${Date.now()}`,
      requireInteraction: false,
    });
    if (n.link) {
      notif.onclick = () => {
        window.focus();
        window.location.href = n.link!;
        notif.close();
      };
    }
    setTimeout(() => notif.close(), 8000);
    return true;
  } catch (e) {
    console.warn("Desktop notification failed:", e);
    return false;
  }
}

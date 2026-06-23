// Service-worker registration + lightweight update flow.
// Registers /sw.js (which handles Web Push + offline). When a new version is
// detected, it activates immediately so users always run the latest build.

let registration: ServiceWorkerRegistration | null = null;

export function getRegistration(): ServiceWorkerRegistration | null {
  return registration;
}

export async function ensureRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (registration) return registration;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    registration = await navigator.serviceWorker.ready;
    return registration;
  } catch {
    return null;
  }
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      registration = reg;

      // When a new SW is found, let it take over as soon as it's installed.
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            sw.postMessage("SKIP_WAITING");
          }
        });
      });

      // Check for updates periodically (covers long-lived installed PWAs).
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    } catch (err) {
      console.warn("[PWA] Service worker registration failed:", err);
    }
  });

  // Reload once when the new SW takes control, so the UI matches the new assets.
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

/** True when running as an installed PWA (standalone display mode). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as any).standalone === true
  );
}

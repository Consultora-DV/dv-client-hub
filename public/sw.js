/* Consultora DV — Service Worker
 * Responsibilities:
 *   1. Web Push: show notifications + handle clicks (works with the app CLOSED).
 *   2. Safe offline support: network-first for navigation, cache-first ONLY for
 *      Vite's hashed static assets. Never caches Supabase/API responses, so data
 *      is always fresh and new deploys are never served stale.
 *
 * Bump CACHE_VERSION to force old caches to be purged on the next visit.
 */
const CACHE_VERSION = "dv-hub-v1";
const APP_SHELL = "/";

self.addEventListener("install", (event) => {
  // Activate this SW immediately without waiting for old tabs to close.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.add(APP_SHELL)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// ── Fetch strategy ───────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only handle our own origin. Let Supabase / Meta / CDNs go straight to network.
  if (url.origin !== self.location.origin) return;

  // Navigations (HTML): network-first so a fresh deploy is always picked up.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(APP_SHELL, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(APP_SHELL).then((r) => r || caches.match(request)))
    );
    return;
  }

  // Hashed static assets (immutable): cache-first for speed.
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(request, copy)).catch(() => {});
            return res;
          })
      )
    );
  }
});

// ── Web Push ─────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "DV Hub", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Consultora DV";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.tag || undefined,
    renotify: !!payload.tag,
    data: { url: payload.url || "/", ...(payload.data || {}) },
    vibrate: [80, 40, 80],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Focus an existing tab if one is open, then navigate it.
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client && targetUrl) {
            try {
              await client.navigate(targetUrl);
            } catch {
              /* cross-origin navigate guard */
            }
          }
          return;
        }
      }
      // Otherwise open a fresh window.
      if (self.clients.openWindow) await self.clients.openWindow(targetUrl);
    })()
  );
});

// Allow the page to trigger an immediate update.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

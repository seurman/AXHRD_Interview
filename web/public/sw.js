/**
 * Kill-switch service worker (replaces axhrd-shell-v1..v4).
 *
 * Old workers called respondWith(fetch) for pathname === "/", which broke
 * Next.js App Router soft navigation and surfaced error.tsx.
 *
 * Clients still holding a registration will update to this file, which:
 * 1) clears Cache Storage
 * 2) unregisters itself
 * 3) reloads controlled windows
 *
 * There is intentionally no fetch handler.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        /* ignore */
      }
      try {
        await self.registration.unregister();
      } catch {
        /* ignore */
      }
      try {
        const clients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        await Promise.all(
          clients.map((client) =>
            "navigate" in client ? client.navigate(client.url) : undefined,
          ),
        );
      } catch {
        /* ignore */
      }
    })(),
  );
});

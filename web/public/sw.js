/**
 * Kill-switch service worker.
 * Legacy v1–v4 intercepted `/` with respondWith(fetch), which broke
 * Next.js App Router soft navigation (error.tsx).
 * Any client that still has an old SW will update to this file, which
 * clears caches, unregisters itself, and reloads controlled pages.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      await Promise.all(
        clients.map((client) => {
          if ("navigate" in client) {
            return client.navigate(client.url);
          }
          return undefined;
        }),
      );
    })(),
  );
});

// Intentionally no fetch handler — never intercept navigations again.

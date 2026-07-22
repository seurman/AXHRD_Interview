const CACHE = "axhrd-shell-v6";
const OFFLINE_SHELL = [
  "/manifest.json",
  "/brand/logo/axhrd-favicon.svg",
  "/brand/logo/axhrd-app-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(OFFLINE_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(async () => {
        for (const name of await caches.keys()) {
          const cache = await caches.open(name);
          const home = await cache.match("/");
          if (home) await cache.delete("/");
        }
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept App Router / RSC / home document navigations.
  // respondWith(fetch("/")) broke soft-nav and showed error.tsx.
  if (
    request.headers.has("RSC") ||
    request.headers.has("Next-Router-State-Tree") ||
    request.headers.has("Next-Router-Prefetch") ||
    request.headers.has("Next-Url") ||
    url.pathname === "/"
  ) {
    return;
  }

  if (!OFFLINE_SHELL.some((path) => url.pathname === path)) return;

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((res) => {
          const copy = res.clone();
          void caches.open(CACHE).then((cache) => cache.put(request, copy));
          return res;
        }),
    ),
  );
});

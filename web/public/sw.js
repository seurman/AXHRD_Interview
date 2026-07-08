const CACHE = "axhrd-shell-v3";
const OFFLINE_SHELL = ["/manifest.json", "/icons/icon-192.svg", "/icons/icon-512.svg"];

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
        const cache = await caches.open(CACHE);
        const home = await cache.match("/");
        if (home) await cache.delete("/");
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

  // 홈 HTML은 절대 캐시하지 않음 — 구버전 PWA 셸이 히어로 UI를 가리는 문제 방지
  if (url.pathname === "/") {
    event.respondWith(fetch(request));
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

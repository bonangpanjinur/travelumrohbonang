const CACHE_NAME = "portal-jamaah-v4";
const APP_SHELL = ["/", "/portal-jamaah", "/manifest.webmanifest"];

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Branding icons are resolved from the database and must not be cached by
  // the service worker, otherwise a previous logo can remain installed.
  if (url.pathname === "/api/cms/site-icon") {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok && request.method === "GET") {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }).catch(() => caches.match(request)));
    return;
  }

  // Dokumen navigasi harus selalu mencoba versi terbaru agar deployment baru
  // tidak menyisakan blank screen karena index.html dan asset lama tidak cocok.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }).catch(() => caches.match(request).then((cached) => cached || caches.match("/"))));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }
    return response;
  }).catch(() => caches.match("/"))));
});

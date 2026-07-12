const CACHE_NAME = "uang-ku-ni-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./brand-logo.png",
  "./icon-192.png",
  "./icon-512.png"
];

// Saat dipasang, simpan file utama agar aplikasi dapat dibuka kembali secara offline.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Hapus cache versi lama ketika service worker baru mulai aktif.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

// Halaman memakai jaringan lebih dulu agar deploy terbaru segera tampil.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", responseCopy));
          return networkResponse;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => cachedResponse || fetch(event.request).then((networkResponse) => {
      if (networkResponse.ok) {
        const responseCopy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseCopy));
      }
      return networkResponse;
    }))
  );
});

const CACHE_NAME = "smart-bin-monitor-v4";

// File lokal yang disimpan agar aplikasi bisa dibuka lebih cepat dan tetap tampil offline.
const CACHE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Saat service worker dipasang, simpan file penting ke cache browser.
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(CACHE_ASSETS);
      })
  );
});

// Menghapus cache lama jika nama cache berubah pada versi berikutnya.
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames
            .filter(function (cacheName) {
              return cacheName !== CACHE_NAME;
            })
            .map(function (cacheName) {
              return caches.delete(cacheName);
            })
        );
      })
  );
});

// Strategi cache-first untuk file lokal, dan network untuk request Firebase/CDN.
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function (cachedResponse) {
        return cachedResponse || fetch(event.request);
      })
      .catch(function () {
        return caches.match("./index.html");
      })
  );
});

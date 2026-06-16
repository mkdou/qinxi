const cacheName = "qinxi-v16";
const files = [
  "./",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(files)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== cacheName).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const isPage = request.mode === "navigate";
  const isLocalAsset = new URL(request.url).origin === self.location.origin;

  if (isPage || isLocalAsset) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(cacheName).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(response => response || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

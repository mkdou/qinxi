const cacheName = "qinxi-v42";
const files = [
  "./",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/apple-touch-icon.png",
  "./assets/Bravura.woff2",
  "./assets/piano/A0.mp3",
  "./assets/piano/C1.mp3",
  "./assets/piano/Ds1.mp3",
  "./assets/piano/Fs1.mp3",
  "./assets/piano/A1.mp3",
  "./assets/piano/C2.mp3",
  "./assets/piano/Ds2.mp3",
  "./assets/piano/Fs2.mp3",
  "./assets/piano/A2.mp3",
  "./assets/piano/C3.mp3",
  "./assets/piano/Ds3.mp3",
  "./assets/piano/Fs3.mp3",
  "./assets/piano/A3.mp3",
  "./assets/piano/C4.mp3",
  "./assets/piano/Ds4.mp3",
  "./assets/piano/Fs4.mp3",
  "./assets/piano/A4.mp3",
  "./assets/piano/C5.mp3",
  "./assets/piano/Ds5.mp3",
  "./assets/piano/Fs5.mp3",
  "./assets/piano/A5.mp3",
  "./assets/piano/C6.mp3",
  "./assets/piano/Ds6.mp3",
  "./assets/piano/Fs6.mp3",
  "./assets/piano/A6.mp3",
  "./assets/piano/C7.mp3",
  "./assets/piano/Ds7.mp3",
  "./assets/piano/Fs7.mp3",
  "./assets/piano/A7.mp3",
  "./assets/piano/C8.mp3"
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

  // Let Supabase, CDN, and other external requests use the browser's native network path.
});

self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

const CACHE = "uni-mission-lab-v0.9";
const SHELL = [
  "./",
  "./index.html",
  "./verify.html",
  "./verify.js",
  "./pilot.html",
  "./pilot.js",
  "./portfolio.html",
  "./portfolio.js",
  "./account.html",
  "./account.js",
  "./styles.css",
  "./app.js",
  "./core.js",
  "./runtime.js",
  "./runtime-config.public.js",
  "./app.webmanifest",
  "./assets/icon.svg",
  "./schemas/mission-lab-state.schema.json",
  "./schemas/goalos-bridge.schema.json",
  "./schemas/proof-bundle.schema.json",
  "./schemas/credential-collection.schema.json",
  "./schemas/mission-portfolio.schema.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});

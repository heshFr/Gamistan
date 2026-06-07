// sw.js — caches the app shell so Nine Lives plays fully offline.
const CACHE = "ninelives-v2";
const SHELL = [
  "./index.html", "./manifest.webmanifest", "./icon.svg",
  "./css/style.css",
  "./js/util.js", "./js/events.js", "./js/rng.js", "./js/storage.js", "./js/data.js",
  "./js/audio.js", "./js/sprites.js", "./js/particles.js", "./js/world.js",
  "./js/game.js", "./js/input.js", "./js/hud.js", "./js/menu.js", "./js/main.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res && res.status === 200 && e.request.url.startsWith(self.location.origin)) {
        const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});

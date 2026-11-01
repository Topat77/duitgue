// Duit Gue service worker: keeps a copy of the app so it opens without internet.
// App files are fetched fresh whenever there is internet, so normal updates arrive without touching this file.
// Only bump VERSION when you add, rename or remove a file in APP.
const VERSION = "duitgue-v14";
const APP = [
  "./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
  "./css/app.css",
  "./js/main.js", "./js/util.js", "./js/model.js", "./js/store.js", "./js/ui.js", "./js/views.js", "./js/pwa.js", "./js/xlsx.js", "./js/cloud.js", "./js/firebase-config.js",
  "./js/sheets/tx.js", "./js/sheets/wallet.js", "./js/sheets/categories.js", "./js/sheets/data.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)); }

// Network first (so updates show up right away), cached copy when offline or the network is too slow.
function networkFirst(req, cacheKey) {
  return Promise.race([fetch(req), timeout(3500)])
    .then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(cacheKey || req, copy)); }
      return res;
    })
    .catch(() => caches.match(cacheKey || req, { ignoreSearch: true }).then((hit) => hit || Response.error()));
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") { e.respondWith(networkFirst(req, "./index.html")); return; }

  // Google Fonts and the Firebase SDK (versioned URLs): cached copy first, they never change.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com" ||
      (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/"))) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res;
    })));
    return;
  }

  if (url.origin === self.location.origin) e.respondWith(networkFirst(req));
});

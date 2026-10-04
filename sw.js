// Duit Gue service worker: keeps a copy of the app so it opens without internet.
// Naikkan angka VERSION setiap kali file aplikasi diubah.
const VERSION = "duitgue-v6";
const APP = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

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

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Halaman aplikasi: ambil versi terbaru kalau ada internet, kalau nggak pakai salinan.
  if (req.mode === "navigate") {
    e.respondWith(
      Promise.race([fetch(req), timeout(3500)])
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Huruf dari Google Fonts: simpan salinannya biar tampilan tetap sama waktu offline.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        }).catch(() => hit || Response.error());
        return hit || net;
      })
    );
    return;
  }

  // File aplikasi lain (ikon, manifest): pakai salinan dulu.
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});

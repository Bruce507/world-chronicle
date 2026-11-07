/* 寰宇时序 service worker — offline fallback, network-first.
   Version is kept in sync by scripts/bump-version.mjs. */
const VERSION = "20261108w";
const CACHE = "world-atlas-" + VERSION;
const SHELL = [
  "./",
  "index.html",
  "css/style.css",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "js/data_bundle.js",
  "js/scenes.js",
  "js/historical.js",
  "js/entities.js",
  "js/theatre.js",
  "js/audio.js",
  "js/statechanges.js",
  "js/map.js",
  "js/i18n_extra.js",
  "js/app.js",
  "data/world.geo.json",
  "data/historical_entities.json",
  "data/state_changes.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => Promise.all(
      SHELL.map((url) => cache.add(url).catch(() => null))
    )).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k.startsWith("world-atlas-") && k !== CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

/* The page asks for the waiting worker to take over when the reader accepts
   the "new version" bar. */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Versioned assets (?v=...) change URL on every release, so a cache hit is
  // always the right bytes for that URL: serve it at once and refresh in the
  // background (stale-while-revalidate). Navigations and unversioned files
  // stay network-first so a deploy is never masked by the cache.
  const versioned = url.searchParams.has("v");
  event.respondWith((async () => {
    if (versioned) {
      const hit = await caches.match(req);
      if (hit) {
        fetch(req).then(async (res) => {
          if (res && res.ok) (await caches.open(CACHE)).put(req, res.clone()).catch(() => null);
        }).catch(() => null);
        return hit;
      }
    }
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone()).catch(() => null);
      }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === "navigate") {
        const shell = await caches.match("index.html", { ignoreSearch: true });
        if (shell) return shell;
      }
      return new Response("Offline", { status: 504, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  })());
});

// Dex Binder service worker: app shell offline, sprites and card images cached as you browse.
const SHELL = "dexbinder-shell-v4";
const MEDIA = "dexbinder-media-v1";
const API = "dexbinder-api-v1";
const SHELL_FILES = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  const keep = [SHELL, MEDIA, API];
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !keep.includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const isMedia = u => /raw\.githubusercontent\.com|images\.pokemontcg\.io|assets\.tcgdex\.net|fonts\.(gstatic|googleapis)\.com|cdn\.jsdelivr\.net/.test(u.host);
const isApi = u => /api\.pokemontcg\.io|api\.tcgdex\.net/.test(u.host);

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (isMedia(url)) { // cache first
    e.respondWith(caches.open(MEDIA).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }
      catch (_) { return new Response("", { status: 504 }); }
    }));
    return;
  }
  if (isApi(url)) { // network first, cached copy when offline
    e.respondWith(caches.open(API).then(async c => {
      try { const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; }
      catch (err) { const hit = await c.match(req); if (hit) return hit; throw err; }
    }));
    return;
  }
  if (url.origin === location.origin) { // stale while revalidate for the app itself
    e.respondWith(caches.open(SHELL).then(async c => {
      const hit = await c.match(req, { ignoreSearch: true }) || (req.mode === "navigate" ? await c.match("index.html") : null);
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});

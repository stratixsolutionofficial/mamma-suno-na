/* Mamma, Sunao Na · service worker
   Network-first for app files (so content.js edits show up), with a cache
   fallback so the book still opens when the net is slow or off. */
const CACHE = 'sunao-v22';
const CORE = ['./', './index.html', './content.js', './assets/styles.css', './assets/core.js', './assets/motifs.js', './assets/ui.js', './assets/collage.js', './assets/app.js', './assets/icon.svg', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return;
  // never cache or intercept the backup API — it must always hit the network
  if (sameOrigin && url.pathname.startsWith('/api/')) return;
  // Range requests (audio/video seeking, e.g. the birthday song's startAt):
  // let the browser talk to the server directly. 206 responses can't be cached.
  if (req.headers.has('range')) return;
  // media (photos/audio/videos): cache-first, they don't change
  if (sameOrigin && /\/(photos|audio|videos)\//.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  e.respondWith(fetch(req).then((res) => {
    if (res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))));
});

// Service Worker for Trading Journal (GitHub Pages)
const VERSION = 'v1.0.0';
const BASE_PATH = '/trading-journal/';
const CACHE_NAME = `tj-${VERSION}`;
const CORE_ASSETS = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.webmanifest',
  BASE_PATH + 'icons/icon-192.png',
  BASE_PATH + 'icons/icon-512.png',
  BASE_PATH + 'icons/icon-180.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS).catch(()=>{}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('tj-') && k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // only cache GET

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isAppAsset = isSameOrigin && url.pathname.startsWith(BASE_PATH);

  if (isAppAsset) {
    // Cache-first for own assets/pages
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        return cached || Response.error();
      }
    })());
    return;
  }

  // For cross-origin (CDNs: tailwind/dayjs/esm.sh), use network-first with fallback to cache
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const fresh = await fetch(req);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      const cached = await cache.match(req);
      return cached || Response.error();
    }
  })());
});

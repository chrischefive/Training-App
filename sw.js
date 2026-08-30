const CACHE_NAME = 'training-app-v23-explorer-clean-layout';
const CACHE_PREFIX = 'training-app-';
const ROOT = new URL('./', self.location.href);
const shellUrl = path => new URL(path, ROOT).href;
const APP_SHELL = [
  './', './index.html', './css/styles.css', './manifest.webmanifest', './apple-touch-icon-v180.png', './icons/apple-touch-icon-v180-120.png', './icons/apple-touch-icon-v180-152.png', './icons/apple-touch-icon-v180-167.png', './icons/apple-touch-icon-v180.png', './icons/icon-v180-192.png', './icons/icon-v180-512.png',
  './js/core.js', './js/navigation.js', './js/training.js', './js/weight.js',
  './js/statistics.js', './js/editors.js', './js/settings-backup.js', './js/insights.js', './js/safety-ui.js',
  './js/ui.js',
  './js/qol.js',
  './js/explorer.js',
  './js/features190.js',
  './js/features191.js',
  './js/badge.js'
].map(shellUrl);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Seitenaufruf: online die aktuelle Version holen, offline auf die gecachte App zurückfallen.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(shellUrl('./index.html'), response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(shellUrl('./index.html')))
    );
    return;
  }

  // CSS/JS: sofort aus dem Cache, parallel im Hintergrund aktualisieren.
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

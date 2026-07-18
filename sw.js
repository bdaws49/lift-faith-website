/* Agent 51 service worker — makes the app installable and usable offline.
   Strategy: cache-first for the app shell, network fallback for the rest. */
const CACHE = 'agent51-v5';
const SHELL = [
  '/agent51.html',
  '/memories.html',
  '/workshop.html',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.png',
  '/audio/sheilah-greeting.mp3',
  '/audio/sheilah-i-love-you.mp3',
  '/audio/sheilah-jer-michelle.mp3',
  '/audio/sheilah-prayer.mp3'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // Best-effort: don't fail the whole install if one file is missing.
      return Promise.all(SHELL.map(function (url) {
        return cache.add(url).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  // Only handle same-origin requests; let AI/search links go straight to the network.
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        // Offline fallback: serve the app if a navigation fails.
        if (req.mode === 'navigate') return caches.match('/agent51.html');
      });
    })
  );
});

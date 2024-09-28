const CACHE_NAME = 'rps-game-cache-v1';
const urlsToCache = [
  '/',
  '/static/styles.css',
  '/static/script.js',
  '/static/rps-bgm.mp3',
  '/static/EarnPoint.mp3',
  '/static/LosingPoint.mp3',
  '/static/default-avatar.png',
  '/static/game-trophy.png',
  '/static/icon-192x192.png',
  '/static/icon-512x512.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
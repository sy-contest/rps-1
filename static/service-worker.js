const CACHE_NAME = 'rps-game-cache-v1';
const urlsToCache = [
  '/',
  '/static/styles.css',
  '/static/script.js',
  '/static/index.html',
  '/static/rps-bgm.mp3',
  '/static/EarnPoint.mp3',
  '/static/LosingPoint.mp3',
  '/static/icon-192x192.png',
  '/static/icon-512x512.png',
  '/static/slider-1.gif',
  '/static/slider-2.gif',
  '/static/slider-3.gif',
  '/static/no-music.png',
  '/static/music.png',
  '/static/no-sound.png',
  '/static/sound.png',
  '/static/login-logo.png',
  '/static/menu-logo.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache).catch(error => {
          console.error('Failed to cache some files:', error);
        });
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
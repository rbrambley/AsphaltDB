const CACHE_NAME = 'asphalt-db-v39';
const PRECACHE = [
  './',
  'index.html',
  'cars.html',
  'tracks.html',
  'career.html',
  'events.html',
  'seasonpass.html',
  'garage.html',
  'calendar.html',
  'compare.html',
  'evo.html',
  'farming.html',
  'gauntlet.html',

  'roster.html',
  'upgrades.html',
  'css/style.css',
  'favicon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-192-maskable.png',
  'icons/icon-512-maskable.png',
  'js/app.js',
  'js/data.js',
  'js/missions.js',
  'js/garage_data.js',
  'manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const dataFiles = ['js/data.js', 'js/garage_data.js', 'js/missions.js'];
  const isData = dataFiles.some((p) => url.pathname.endsWith(p));

  if (isData) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached || fetch(e.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return response;
      })
    )
  );
});

// sw.js - Service Worker con estrategia Network-First para asegurar siempre la versión más reciente
const CACHE_NAME = 'lista-compra-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './categories.js',
  './crypto.js',
  './github-storage.js',
  './qrcode.min.js',
  './qrcode.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Eliminando caché antigua del Service Worker:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Las peticiones a la API de GitHub siempre van directas a la red
  if (event.request.url.includes('api.github.com')) {
    return;
  }

  // Network-First: intentar red primero para tener siempre el código más reciente, fallback a caché cuando no hay conexión
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

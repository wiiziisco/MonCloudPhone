const CACHE_NAME = 'f4ma-stock-v12'; // V12 : Ultra-Light

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/script.js',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700;900&display=swap'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW V12] Installation Light...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((network) => {
        if (network.status === 200 && network.type === 'basic') {
          const clone = network.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return network;
      }).catch(() => console.log('Offline'));
    })
  );
});

const CACHE_NAME = 'f4ma-stock-v9'; // VERSION 9 (Force Update)

// Fichiers CRITIQUES (L'app ne démarre pas sans eux)
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/script.js',
  '/manifest.json'
];

// Fichiers CONFORT (Design & Graphiques)
// Si ça échoue (mauvaise connexion), l'app marche quand même !
const OPTIONAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700;900&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force l'installation immédiate
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW V9] Installation du cœur...');
      await cache.addAll(CRITICAL_ASSETS);
      try {
        await cache.addAll(OPTIONAL_ASSETS);
      } catch (e) { console.log('Assets optionnels non chargés (pas grave)'); }
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
      }).catch(() => console.log('Offline : ', event.request.url));
    })
  );
});

const CACHE_NAME = 'f4ma-stock-v6'; // V6

// Fichiers CRITIQUES (Doivent être là pour que l'app démarre)
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/script.js',
  '/manifest.json'
];

// Fichiers SECONDAIRES (Design & Outils)
const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700;900&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// INSTALLATION (Stratégie robuste)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Installation V6...');
      
      // 1. On installe d'abord le cœur de l'app (Vital)
      await cache.addAll(CORE_ASSETS);
      
      // 2. On essaie d'installer le reste, mais sans bloquer si ça échoue
      try {
        await cache.addAll(EXTERNAL_ASSETS);
      } catch (err) {
        console.log('[SW] Avertissement: Certains fichiers externes ne sont pas en cache (pas grave)', err);
      }
    })
  );
  self.skipWaiting();
});

// ACTIVATION (Nettoyage)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Suppression ancien cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// INTERCEPTION (Offline)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Si c'est en cache, on sert le cache (OFFLINE OK)
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Sinon on cherche sur internet et on met en cache pour la prochaine fois
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        console.log("Pas d'internet et pas de cache pour : ", event.request.url);
      });
    })
  );
});

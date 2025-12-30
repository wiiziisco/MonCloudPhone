const CACHE_NAME = 'f4ma-stock-v3'; // On passe en V3 pour forcer le nettoyage

// Fichiers CRITIQUES (Locaux uniquement)
// On ne met PAS les liens https:// ici pour éviter les erreurs d'installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/script.js',
  '/manifest.json'
];

// 1. INSTALLATION (Rapide et Sûre)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Installation des fichiers critiques...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. ACTIVATION (Nettoyage V1 et V2)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Suppression ancien cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. INTERCEPTION (Stratégie "Cache First, puis Network + Mise en cache dynamique")
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // A. Si c'est dans le cache, on le sert tout de suite (OFFLINE OK)
      if (cachedResponse) {
        return cachedResponse;
      }

      // B. Sinon, on va le chercher sur Internet
      return fetch(event.request).then((networkResponse) => {
        // Si la réponse est valide, on la met en cache pour la prochaine fois !
        // C'est ici qu'on sauvegarde Tailwind, FontAwesome, etc. automatiquement
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // C. Si on est offline et qu'on a rien trouvé...
        console.log("Pas de connexion et pas de cache pour : ", event.request.url);
      });
    })
  );
});

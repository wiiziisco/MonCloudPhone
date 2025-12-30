// On change le nom pour forcer la mise à jour
const CACHE_NAME = 'f4ma-stock-v2';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/script.js',
  '/manifest.json', // Maintenant ce fichier existe !
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700;900&display=swap'
];

// INSTALLATION
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Mise en cache des fichiers...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Force l'activation immédiate
});

// ACTIVATION (Nettoyage des vieux caches v1)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Suppression ancien cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim(); // Prend le contrôle immédiat de la page
});

// INTERCEPTION (Mode Offline)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Si on a le fichier en cache, on le donne (Offline marche !)
      if (cachedResponse) {
        return cachedResponse;
      }
      // 2. Sinon on cherche sur internet
      return fetch(event.request).catch(() => {
        // 3. Si internet est coupé et qu'on a pas le fichier...
        // On pourrait retourner une page "Hors Connexion" personnalisée ici
      });
    })
  );
});

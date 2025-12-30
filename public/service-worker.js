const CACHE_NAME = 'f4ma-stock-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/script.js',
  '/manifest.json',
  // On cache aussi les outils externes pour que le design reste beau hors ligne
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700;900&display=swap'
];

// 1. Installation : On télécharge tout le site dans le cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Installation du mode Offline...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activation : On nettoie les vieux caches si on fait une mise à jour
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// 3. Interception : Quand l'utilisateur demande une page
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Si c'est dans le cache (mode hors ligne), on le donne direct
      if (cachedResponse) {
        return cachedResponse;
      }
      // Sinon, on cherche sur internet (et on pourrait le mettre en cache pour la prochaine fois)
      return fetch(event.request);
    })
  );
});

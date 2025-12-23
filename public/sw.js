self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
  // Simple pass-through (nécessaire pour la PWA)
  e.respondWith(fetch(e.request));
});

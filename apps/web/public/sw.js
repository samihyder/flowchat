// Minimal service worker — exists only to satisfy PWA installability
// criteria (Chrome/Edge require a controlling SW with a fetch handler).
// Deliberately does NOT cache anything: the dashboard is fully dynamic and
// an offline-first strategy here would risk serving stale conversations/
// contacts. Every request just passes straight through to the network.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

// Service Worker — Radar de Concursos PWA (Padrão Casa do Sagrado v3)
const CACHE_NAME = 'radar-concursos-v3';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.png',
  './css/base.css',
  './css/components.css',
  './css/modals.css',
  './js/state.js',
  './js/utils.js',
  './js/portais.js',
  './js/radar.js',
  './js/consulta.js',
  './js/supabase.js',
  './js/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Network-First para HTML, CSS e JS (garante atualizações imediatas em produção)
  if (
    e.request.mode === 'navigate' || 
    url.pathname.endsWith('.html') || 
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Cache-First para fontes e imagens
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});

// Recepção de Web Push Nativo (Notificação na barra do celular)
self.addEventListener('push', (e) => {
  let data = {
    title: 'Radar de Concursos SP',
    body: 'Novidade em concurso ou licitação na região!',
    url: './index.html'
  };

  if (e.data) {
    try {
      data = e.data.json();
    } catch(err) {
      data.body = e.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: './favicon.png',
    badge: './favicon.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || './index.html'
    },
    actions: [
      { action: 'open', title: 'Ver Detalhes' }
    ]
  };

  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const targetUrl = e.notification.data?.url || './index.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes('radar-concursos') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

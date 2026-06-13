// Lume · Service Worker (PWA)
const CACHE = 'lume-shell-v2';
const SHELL = ['/dashboard', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // NÃO intercepta dados/RSC do Next nem APIs: deixa o navegador resolver
  // direto, sem o overhead de passar pelo service worker. Isso é o que mais
  // pesava no app instalado — cada ação/navegação esperava o SW intermediar.
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/_next/data') ||
    url.searchParams.has('_rsc') ||
    req.headers.get('RSC') === '1' ||
    req.headers.get('Next-Router-Prefetch') === '1'
  ) {
    return;
  }

  // Estáticos do Next e ícones: cache-first
  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/icon') || url.pathname === '/apple-touch-icon.png') {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }))
    );
    return;
  }

  // Só navegações de documento (HTML): network-first com fallback offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match('/dashboard')))
    );
    return;
  }

  // Qualquer outra requisição GET: não intercepta (sem overhead do SW).
});

// ==========================================
// Web Push Notifications
// ==========================================

self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const title = data.title || 'Lume Agendamentos';
    const options = {
      body: data.body || 'Você tem uma nova notificação.',
      icon: '/icon-192.png',
      badge: '/icon-192.png', // Ícone monocromático idealmente
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      data: {
        url: data.url || '/dashboard'
      }
    };
    
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.error('Erro ao processar push data:', e);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se a aba já estiver aberta, foca nela e navega
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus().then(() => client.navigate(urlToOpen));
        }
      }
      // Se não, abre uma nova aba
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

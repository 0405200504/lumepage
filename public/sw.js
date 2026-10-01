// Lume · Service Worker (PWA)
const CACHE = 'lume-shell-v9'; // v9: tela de abertura com a altura certa no iPhone — troca a guardada
const SHELL = ['/dashboard', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png'];

// Tela de abertura instantânea (app/abertura/route.ts): um HTML avulso que
// já é a animação de abertura. Guardada à parte do SHELL porque o addAll é
// tudo-ou-nada — uma falha no /dashboard não pode deixá-la de fora.
const ABERTURA = '/abertura';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all([c.addAll(SHELL).catch(() => {}), c.add(ABERTURA).catch(() => {})])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// ==========================================
// Abertura instantânea do painel
// ==========================================
//
// No toque do ícone, o painel só pinta depois que o servidor monta a página
// — e a animação de abertura esperava junto, com a tela parada do sistema
// na frente. Agora, quando o app abre DO ZERO (nenhuma janela nossa aberta),
// a navegação para o /dashboard recebe na hora a tela de abertura do cache,
// que já começa a animação, e o painel de verdade é buscado em paralelo.
// Quando a tela de abertura chama o painel (aos 1,9 s, mesmo endereço), a
// resposta que já veio é entregue de uma vez.
//
// Recarregar, entrar pelo login ou navegar dentro do app NÃO passa por
// aqui: em todos esses casos já existe uma janela nossa aberta.

/** O painel buscado durante a animação: { url, at, res } — uso único. */
let antecipado = null;
const ANTECIPADO_TTL = 15000;

function ehPainel(url) {
  return url.pathname === '/dashboard' || url.pathname.startsWith('/dashboard/');
}

function redeComFallback(req) {
  return fetch(req).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
    return res;
  }).catch(() => caches.match(req).then((hit) => hit || caches.match('/dashboard')));
}

/**
 * `fundo` recebe o trabalho que continua depois da resposta (buscar o painel,
 * renovar a tela de abertura guardada). Quem segura o worker vivo por ele é o
 * waitUntil chamado NA HORA do evento, lá embaixo: depois de um await o
 * Safari pode recusar o waitUntil — e aí o iPhone matava o worker antes de
 * renovar a tela guardada, ficando para sempre com a versão antiga.
 */
async function navegarPainel(req, fundo) {
  // 1) A tela de abertura chamando o painel: entrega o que já foi buscado.
  //    (Se a busca falhou, segue pelo caminho normal.)
  if (antecipado && antecipado.url === req.url && Date.now() - antecipado.at < ANTECIPADO_TTL) {
    const pendente = antecipado.res;
    antecipado = null;
    const res = await pendente;
    if (res) return res;
    return redeComFallback(req);
  }

  // 2) Abertura do zero: nenhuma janela nossa aberta.
  const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (janelas.length === 0) {
    const cache = await caches.open(CACHE);
    const abertura = await cache.match(ABERTURA);
    if (abertura) {
      // O painel começa a ser montado no servidor agora, não daqui a 1,9 s.
      // Redirecionamento (sessão vencida → login) volta como opaqueredirect
      // e o navegador segue normalmente quando ele for entregue.
      const res = fetch(req).catch(() => null);
      antecipado = { url: req.url, at: Date.now(), res };
      // Atualiza a tela de abertura guardada para a próxima vez (deploy novo).
      const renovada = cache.add(ABERTURA).catch(() => {});
      fundo(Promise.all([res, renovada]));
      return abertura;
    }
  }

  return redeComFallback(req);
}

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
  // As do painel passam antes pela abertura instantânea (acima).
  if (req.mode === 'navigate') {
    if (ehPainel(url)) {
      let soltar;
      const trabalho = new Promise((r) => { soltar = r; });
      const resposta = navegarPainel(req, soltar);
      // Sem trabalho de fundo (ou se der erro), solta junto com a resposta.
      resposta.then(() => soltar(), () => soltar());
      event.respondWith(resposta);
      event.waitUntil(trabalho.catch(() => {}));
    } else {
      event.respondWith(redeComFallback(req));
    }
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

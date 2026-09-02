import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lume — Agenda & CRM',
    short_name: 'Lume',
    description: 'Agenda, agendamentos e controle financeiro 360 para profissionais da estética.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    // Vinho, e não creme: este é o fundo da splash NATIVA do Android (a que
    // mostra o ícone antes do app carregar). Com o creme antigo, a sequência
    // era clarão → cortina vinho → painel. Agora emenda na abertura da marca
    // (components/ui/AppSplash) sem piscar de cor.
    background_color: '#500b18',
    theme_color: '#500b18',
    lang: 'pt-BR',
    categories: ['business', 'productivity', 'lifestyle'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

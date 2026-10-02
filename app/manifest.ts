import type { MetadataRoute } from 'next';
import { SPLASH_BG } from '@/lib/ui/splashScene';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lume — Agenda & CRM',
    short_name: 'Lume',
    description: 'Agenda, agendamentos e controle financeiro 360 para profissionais da estética.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    // Bordô, e não creme: este é o fundo da splash NATIVA do Android (a que
    // mostra o ícone antes do app carregar). É exatamente a cor da cortina
    // de abertura (lib/ui/splashScene), então a emenda não pisca de cor.
    background_color: SPLASH_BG,
    theme_color: SPLASH_BG,
    lang: 'pt-BR',
    categories: ['business', 'productivity', 'lifestyle'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Maskable é o quadrado cheio: o Android recorta no formato do launcher.
      // Os de cima já vêm com o canto arredondado da arte.
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

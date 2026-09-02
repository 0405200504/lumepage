'use client';

import { useEffect } from 'react';
import { isChimeEnabled, playAppChime } from '@/lib/ui/appChime';

/** Marca "esta sessão já viu a abertura". Some quando o app é fechado de
 *  verdade — que é justamente quando a abertura deve voltar a acontecer. */
export const SPLASH_SESSION_KEY = 'lume:abertura-vista';

/** Cortina + som duram isto. Tem de casar com os keyframes de
 *  `#lume-splash` em globals.css (1180ms de exibição + 480ms de saída). */
const SPLASH_MS = 1700;

/**
 * A parte da abertura que precisa de JS: som, pular no toque e a limpeza.
 *
 * A cortina em si é CSS puro (components/ui/AppSplash) — este componente
 * nunca é o que a faz aparecer ou sumir na tela; ele só toca o sino e, no
 * fim, tira o nó da árvore de renderização para não sobrar um `position:
 * fixed` invisível por cima do painel.
 */
export function SplashRunner() {
  useEffect(() => {
    const html = document.documentElement;

    // Porteira já decidiu que esta sessão não vê abertura (recarregou a
    // página, ou voltou ao painel depois de sair). Sem som, sem cortina.
    if (html.dataset.splash === 'off') return;

    // Entrada por navegação de cliente (login → painel): aqui o script da
    // porteira não roda, então o carimbo da sessão é feito neste ponto.
    try {
      sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    } catch {
      /* modo privativo: a abertura volta a cada carregamento, tudo bem */
    }

    // Quem pediu menos movimento não recebe cortina (o bloco global de
    // prefers-reduced-motion já zera a animação) — e também não recebe som,
    // que sem a animação viraria um "tim" do nada.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      html.dataset.splash = 'off';
      return;
    }

    if (isChimeEnabled()) playAppChime();

    const finish = () => {
      html.dataset.splash = 'off';
    };
    let timer = window.setTimeout(finish, SPLASH_MS);

    // Toque/clique pula a abertura. Quem já está com pressa não espera —
    // mas some com um fade curto, porque cortina que corta seco parece bug.
    const el = document.getElementById('lume-splash');
    const skip = () => {
      window.clearTimeout(timer);
      html.dataset.splash = 'skip';
      timer = window.setTimeout(finish, 220);
    };
    el?.addEventListener('pointerdown', skip);

    return () => {
      window.clearTimeout(timer);
      el?.removeEventListener('pointerdown', skip);
    };
  }, []);

  return null;
}

export default SplashRunner;

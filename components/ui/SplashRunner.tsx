'use client';

import { useEffect } from 'react';
import { isChimeEnabled, playAppChime } from '@/lib/ui/appChime';

/** Marca "esta sessão já viu a abertura". Some quando o app é fechado de
 *  verdade — que é justamente quando a abertura deve voltar a acontecer. */
export const SPLASH_SESSION_KEY = 'lume:abertura-vista';

/** Cortina: 2350ms de cena + 450ms de saída. Tem de casar com os keyframes
 *  de `#lume-splash` em globals.css. */
const SPLASH_MS = 2800;

/** O som toca no encaixe das metades da estrela (o clarão), não no primeiro
 *  quadro: a nota chega junto com o gesto que ela sublinha. */
const CHIME_AT_MS = 860;

/**
 * A parte da abertura que precisa de JS: tocar o som, deixar pular no toque
 * e limpar tudo no fim. A animação em si é CSS e roda sozinha — pinta no
 * primeiro quadro e se apaga por `animation`; aqui só se acompanha o relógio.
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

    const overlay = document.getElementById('lume-splash');
    let encerrada = false;

    const encerrar = () => {
      if (encerrada) return;
      encerrada = true;
      html.dataset.splash = 'off';
    };

    // Relógio da animação de CSS.
    let timer = window.setTimeout(encerrar, SPLASH_MS);

    // O som, no tempo do encaixe. Quem pulou antes não ouve nada — uma nota
    // sobre o painel já aberto soaria fora de lugar.
    const chime = window.setTimeout(() => {
      if (!encerrada && isChimeEnabled()) playAppChime();
    }, CHIME_AT_MS);

    // Toque/clique pula a abertura: a cortina abrevia a saída ('skip') e
    // some logo depois.
    const pular = () => {
      if (encerrada) return;
      window.clearTimeout(timer);
      window.clearTimeout(chime);
      html.dataset.splash = 'skip';
      timer = window.setTimeout(encerrar, 160);
    };
    overlay?.addEventListener('pointerdown', pular);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(chime);
      overlay?.removeEventListener('pointerdown', pular);
    };
  }, []);

  return null;
}

export default SplashRunner;

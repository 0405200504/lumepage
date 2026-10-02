'use client';

import { useEffect } from 'react';
import { isChimeEnabled, playAppChime } from '@/lib/ui/appChime';
import {
  PANEL_FLAG_KEY,
  SPLASH_DIAG_KEY,
  SPLASH_EXIT_MS,
  SPLASH_HANDOFF_KEY,
  SPLASH_SCENE_MS,
  SPLASH_SESSION_KEY,
} from '@/lib/ui/splashScene';

/** Cortina: 2350ms de cena + 450ms de saída (lib/ui/splashScene). */
const SPLASH_MS = SPLASH_SCENE_MS + SPLASH_EXIT_MS;

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

    // "Esta pessoa entra no painel": a tela de abertura do service worker
    // (app/abertura/route.ts) só toca a cena quando sabe disso — senão a
    // estrela acenderia antes do formulário de login. O login apaga.
    // O bastão da tela de abertura já foi lido pela porteira (ou não serve
    // mais, se o painel chegou por navegação de cliente).
    try {
      localStorage.setItem(PANEL_FLAG_KEY, '1');
      sessionStorage.removeItem(SPLASH_HANDOFF_KEY);
    } catch {
      /* storage bloqueado: a abertura instantânea só não toca a cena */
    }

    // Diagnóstico da abertura no iPhone (temporário): a tela de abertura e a
    // porteira anotaram as medidas da janela; vai uma vez e some.
    try {
      const diag = sessionStorage.getItem(SPLASH_DIAG_KEY);
      if (diag) {
        sessionStorage.removeItem(SPLASH_DIAG_KEY);
        const dados = JSON.parse(diag);
        const estrela = document.querySelector('.lume-splash__star-wrap')?.getBoundingClientRect();
        dados.montado = {
          j: [window.innerWidth, window.innerHeight],
          c: html.clientHeight,
          dpr: window.devicePixelRatio,
          estrela: estrela ? [Math.round(estrela.top), Math.round(estrela.height)] : null,
        };
        void fetch('/api/diag/abertura', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      /* diagnóstico nunca atrapalha a abertura */
    }

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

    // Continuação da tela de abertura: a cena já vinha tocando, então o
    // relógio é o que falta da saída (a porteira gravou em --lume-exit). O
    // som não toca — o encaixe passou, e numa abertura fria sem toque o
    // navegador não deixaria tocar mesmo (lib/ui/appChime).
    const continuacao = html.dataset.splash === 'handoff';
    const restante = continuacao
      ? (parseFloat(html.style.getPropertyValue('--lume-exit')) || 0) + SPLASH_EXIT_MS
      : SPLASH_MS;

    // Relógio da animação de CSS.
    let timer = window.setTimeout(encerrar, restante);

    // O som, no tempo do encaixe. Quem pulou antes não ouve nada — uma nota
    // sobre o painel já aberto soaria fora de lugar.
    const chime = continuacao
      ? 0
      : window.setTimeout(() => {
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

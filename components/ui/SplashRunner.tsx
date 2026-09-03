'use client';

import { useEffect } from 'react';
import { isChimeEnabled, playAppChime } from '@/lib/ui/appChime';

/** Marca "esta sessão já viu a abertura". Some quando o app é fechado de
 *  verdade — que é justamente quando a abertura deve voltar a acontecer. */
export const SPLASH_SESSION_KEY = 'lume:abertura-vista';

/** Cortina de CSS: 1180ms de exibição + 480ms de saída. Tem de casar com os
 *  keyframes de `#lume-splash` em globals.css. */
const SPLASH_MS = 1700;

/** O filme é 9:16 — em tela de computador ficaria cortado ou com tarja. O
 *  corte é o mesmo `lg` do resto do app. */
const MOBILE_QUERY = '(max-width: 1023px)';

/** Onde o filme ACABA de verdade. O arquivo tem 10s, mas de 7,6s em diante é
 *  só o logo parado com a trilha decaindo: seria espera pura. */
const VIDEO_CUT_S = 7.6;

/** Velocidade do filme. 1 = como foi feito. Subir para 1.4 encurta a abertura
 *  para ~5,2s sem alterar o tom da trilha (`preservesPitch` é o padrão). */
const VIDEO_RATE = 1;

/** Saída do filme: imagem e trilha desaparecem juntas neste tempo. */
const VIDEO_FADE_MS = 450;

/**
 * A parte da abertura que precisa de JS: escolher entre o filme e a animação
 * de CSS, tocar o som, deixar pular no toque e limpar tudo no fim.
 *
 * A REGRA QUE ORGANIZA ESTE ARQUIVO: a animação de CSS é o piso e roda
 * sozinha, sem JS nenhum — ela pinta no primeiro quadro e se apaga por
 * `animation`. O filme é um ENFEITE que entra por cima quando dá: celular,
 * arquivo já em cache e autoplay liberado. Se qualquer uma dessas três
 * faltar, a abertura acontece igual, só que sem o filme. É por isso que este
 * componente nunca "segura" a tela esperando o vídeo carregar.
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
    const video = document.getElementById('lume-splash-video') as HTMLVideoElement | null;
    const comSom = isChimeEnabled();
    const noCelular = window.matchMedia(MOBILE_QUERY).matches;

    let encerrada = false;
    let timer = 0;
    let fade = 0;

    /** Tira a cortina da frente. `ms` é o fade — curto no toque (quem pulou
     *  quer o painel agora), mais longo no fim natural do filme. */
    const encerrar = (ms: number) => {
      if (encerrada) return;
      encerrada = true;
      window.clearTimeout(timer);
      html.dataset.splash = ms > 250 ? 'saindo' : 'skip';

      // A trilha desce junto com a imagem. Cortar o som seco no meio de uma
      // nota é mais perceptível do que o corte da imagem.
      if (video && !video.paused && !video.muted) {
        const passo = 50;
        const queda = video.volume / Math.max(1, ms / passo);
        fade = window.setInterval(() => {
          video.volume = Math.max(0, video.volume - queda);
        }, passo);
      }

      timer = window.setTimeout(() => {
        html.dataset.splash = 'off';
        window.clearInterval(fade);
        if (video) { video.pause(); video.removeAttribute('src'); }
      }, ms);
    };

    // Relógio da animação de CSS. Se o filme entrar em cena, este some.
    timer = window.setTimeout(() => encerrar(0), SPLASH_MS);

    // Toque/clique pula a abertura — a de CSS e a do filme.
    const pular = () => encerrar(200);
    overlay?.addEventListener('pointerdown', pular);

    /* ── O filme (só no celular) ─────────────────────────────────────────── */
    const fonte = video?.dataset.src;
    if (noCelular && video && fonte) {
      const assumiu = () => {
        // Chegou tarde: a cortina de CSS já se foi e o painel está na mão
        // dela. Entrar agora seria abrir uma cortina depois do espetáculo.
        if (encerrada) { video.pause(); return; }
        window.clearTimeout(timer);
        overlay?.setAttribute('data-video', '1');
        html.dataset.splash = 'video';
        video.playbackRate = VIDEO_RATE; // alguns navegadores zeram no load
        const resta = Math.max(0.4, VIDEO_CUT_S - video.currentTime) / VIDEO_RATE;
        timer = window.setTimeout(() => encerrar(VIDEO_FADE_MS), resta * 1000);
      };
      video.addEventListener('playing', assumiu, { once: true });
      video.addEventListener('ended', () => encerrar(VIDEO_FADE_MS));

      video.src = fonte;
      video.playbackRate = VIDEO_RATE;
      video.muted = !comSom;
      void video.play().catch(() => {
        // Autoplay com som barrado (é a política padrão fora do app
        // instalado). Tenta de novo no mudo: ver a animação sem trilha é
        // melhor do que não ver nada.
        if (video.muted) return;
        video.muted = true;
        void video.play().catch(() => { /* sem filme desta vez; o CSS cobre */ });
      });
    } else if (comSom) {
      // Computador: o sino sintetizado acompanha a animação de CSS. No
      // celular quem toca é a trilha do filme — dois sons juntos brigariam.
      playAppChime();
    }

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(fade);
      overlay?.removeEventListener('pointerdown', pular);
      video?.pause();
    };
  }, []);

  return null;
}

export default SplashRunner;

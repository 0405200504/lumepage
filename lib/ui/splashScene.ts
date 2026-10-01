import {
  LUME_SATIN_DESKTOP,
  LUME_SATIN_MOBILE,
  LUME_STAR_A,
  LUME_STAR_B,
  LUME_WORD,
} from './lumeSplashData';

/**
 * A CENA DA ABERTURA — marcação, estilos e relógio num lugar só.
 *
 * Dois lugares pintam esta mesma cena e precisam ser idênticos quadro a quadro:
 *   · o painel (components/ui/AppSplash), na entrada pelo login e quando o
 *     service worker ainda não guardou a tela de abertura;
 *   · a tela de abertura instantânea (app/abertura/route.ts), que o service
 *     worker (public/sw.js) entrega do cache no toque do ícone, sem esperar o
 *     servidor, e que passa a cena para o painel no meio do caminho.
 *
 * Por isso nada aqui depende do globals.css nem de arquivo externo: o CSS vai
 * num <style> inline e a marcação é HTML puro (o cetim e a marca são dados
 * embutidos, lib/ui/lumeSplashData).
 *
 * A cena, em 2,8 s:
 *   0,0–1,1   ignição: um ponto de luz acende e as duas metades da estrela
 *             chegam de cantos opostos, girando até se encaixar
 *   0,6–1,4   reflexo: um clarão horizontal e um brilho cromado atravessam a
 *             estrela (o som toca aqui)
 *   1,0–1,9   assinatura: a estrela encolhe e desliza para a esquerda; o
 *             "lume" se revela da esquerda para a direita, com um fio de luz
 *             na borda
 *   1,9–2,3   pausa: o cetim respira, um brilho cruza o tecido
 *   2,35–2,8  entrada: a marca avança meio passo e a cortina se dissolve
 *             sobre o painel
 *
 * O RELÓGIO É COMPARTILHADO. Todo atraso de animação desconta --lume-t (o
 * tempo de cena que já passou em outra página), e a saída começa em
 * --lume-exit. Sem as variáveis, a cena começa do zero. Com elas, o painel
 * pega a cena exatamente onde a tela de abertura estava — é assim que a troca
 * de página fica invisível.
 *
 * Modos (data-splash no <html>):
 *   (nenhum)   cena inteira, com saída
 *   handoff    continua a cena da tela de abertura (--lume-t / --lume-exit)
 *   launch     tela de abertura: toca a cena e segura a marca, sem saída,
 *              até o painel assumir
 *   still      só o cetim parado (= tela de abertura do iPhone), sem marca
 *   skip       abrevia a saída (tocou na tela)
 *   off        não existe
 */

/** Marca "esta sessão já viu a abertura". Some quando o app é fechado de
 *  verdade — que é justamente quando a abertura deve voltar a acontecer. */
export const SPLASH_SESSION_KEY = 'lume:abertura-vista';

/** Passagem de bastão: a tela de abertura grava aqui (sessionStorage) o
 *  instante em que a cena começou; o painel lê e continua do mesmo ponto. */
export const SPLASH_HANDOFF_KEY = 'lume:abertura-inicio';

/** Quanto tempo o bastão vale. Passou disso, o painel não continua cena
 *  nenhuma (foi outra entrada, não a desta abertura). */
export const SPLASH_HANDOFF_TTL_MS = 20000;

/** "Esta pessoa entra no painel" (localStorage). Liga no painel, desliga no
 *  login. Sem ele, a tela de abertura nem toca a cena: quem não está logada
 *  vai para o login, e uma estrela antes do formulário seria uma emenda. */
export const PANEL_FLAG_KEY = 'lume:painel';

/** Cena até a saída. Tem de casar com os 2350ms do CSS abaixo. */
export const SPLASH_SCENE_MS = 2350;
/** Duração da saída (a cortina se dissolve). */
export const SPLASH_EXIT_MS = 450;
/** Quando a tela de abertura chama o painel: logo depois de o "lume"
 *  terminar de aparecer (1,88 s). Daqui em diante só o cetim se mexe, e
 *  devagar — um quadro parado durante a troca de página não se nota. */
export const SPLASH_HANDOFF_AT_MS = 1900;

/** Atraso de animação descontando o tempo de cena já corrido. */
const at = (ms: number) => `calc(${ms}ms - var(--lume-t, 0ms))`;
/** Início da saída: 2350ms na cena normal; na continuação, o que faltar. */
const EXIT_AT = `var(--lume-exit, ${SPLASH_SCENE_MS}ms)`;

export const SPLASH_CSS = `
#lume-splash {
  position: fixed;
  inset: 0;
  z-index: 300;
  overflow: hidden;
  /* Tom médio do cetim: é o background_color do manifesto (splash nativa
     do Android) e o que cobre o quadro se o JPEG ainda não pintou. */
  background: #4a0e22;
  touch-action: none;
  overscroll-behavior: contain;

  /* Geometria da marca: a caixa da arte oficial (673 × 227) alargada em
     --lume-gap unidades, para abrir o respiro entre a estrela e o nome.
     --lume-ignite é o quanto a estrela nasce maior antes de encolher. */
  --lume-lockup-w: min(52vw, 250px);
  --lume-gap: 100;
  --lume-w: 773;
  --lume-ignite: 1.7;

  --lume-ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --lume-ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
  --lume-ease-out: cubic-bezier(0.33, 1, 0.68, 1);
  --lume-ease-in: cubic-bezier(0.55, 0, 1, 0.45);
  --lume-ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);

  animation: lume-splash-out ${SPLASH_EXIT_MS}ms var(--lume-ease-in) ${EXIT_AT} both;
}
/* Desktop (e qualquer tela deitada): marca maior, respiro menor. */
@media (min-aspect-ratio: 1/1) {
  #lume-splash {
    --lume-lockup-w: clamp(270px, 21vw, 340px);
    --lume-gap: 70;
    --lume-w: 743;
    --lume-ignite: 1.55;
  }
}
html[data-splash='off'] #lume-splash { display: none; }
html[data-splash='skip'] #lume-splash { animation: lume-splash-out 160ms linear both; }
/* Tela de abertura: a cena toca, mas a cortina não sai — quem sai é a do
   painel, que assume daqui. */
html[data-splash='launch'] #lume-splash,
html[data-splash='launch'] .lume-splash__lockup { animation: none; }
/* Só o cetim parado: o primeiro quadro, igual à tela de abertura do iPhone. */
html[data-splash='still'] .lume-splash__lockup { display: none; }
html[data-splash='still'] #lume-splash,
html[data-splash='still'] #lume-splash * { animation: none; }

/* A visibilidade no último quadro é o que impede a cortina invisível de
   continuar comendo os toques do painel enquanto o JS não a remove. */
@keyframes lume-splash-out {
  0%   { opacity: 1; visibility: visible; }
  99%  { opacity: 0; visibility: visible; }
  100% { opacity: 0; visibility: hidden; }
}

/* ---- o cetim ------------------------------------------------------ */
/* 6% de folga em volta porque o tecido "respira" (zoom lento). A cortina do
   login (.login-curtain) e as telas do iPhone reproduzem esta mesma folga. */
.lume-splash__satin {
  position: absolute;
  inset: -6%;
  display: block;
  animation: lume-splash-breathe 3000ms var(--lume-ease-in-out) ${at(0)} both;
}
.lume-splash__satin img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
@media (min-aspect-ratio: 1/1) {
  .lume-splash__satin img { filter: contrast(1.07) saturate(1.05); }
}
@keyframes lume-splash-breathe {
  from { transform: scale(1); }
  to   { transform: scale(1.07); }
}
/* Brilho que cruza o tecido. A faixa anda por background-position num
   elemento do tamanho da tela — nada de camada gigante na GPU do celular.
   Nasce apagada e acende devagar: parada no ponto de partida ela já risca o
   tecido, e o primeiro quadro tem de ser idêntico à tela de abertura do
   iPhone (public/splash), que é só o cetim. */
.lume-splash__sheen {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  background-image: linear-gradient(335deg, transparent 40%, rgba(255, 215, 225, 0.035) 46%, rgba(255, 255, 255, 0.11) 50%, rgba(255, 215, 225, 0.035) 54%, transparent 60%);
  background-size: 260% 100%;
  background-position: 100% 0;
  animation: lume-splash-sheen 2500ms var(--lume-ease-in-out) ${at(200)} both;
}
@keyframes lume-splash-sheen {
  0%   { background-position: 100% 0; opacity: 0; }
  20%  { opacity: 1; }
  100% { background-position: 0% 0; opacity: 1; }
}
.lume-splash__vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(90% 72% at 50% 46%, transparent 38%, rgba(14, 2, 8, 0.58) 100%);
}

/* ---- a marca ------------------------------------------------------ */
.lume-splash__lockup {
  position: absolute;
  left: 50%;
  top: 47%;
  width: var(--lume-lockup-w);
  aspect-ratio: var(--lume-w) / 227;
  transform: translate(-50%, -50%);
  /* Na saída a marca avança meio passo: a sensação é de entrar no app, não
     de uma tela que apagou. */
  animation: lume-splash-exit ${SPLASH_EXIT_MS}ms var(--lume-ease-in) ${EXIT_AT} both;
}
@keyframes lume-splash-exit {
  from { transform: translate(-50%, -50%) scale(1); }
  to   { transform: translate(-50%, -50%) scale(1.04); }
}

/* Estrela: nasce no centro da tela, maior (--lume-ignite), e desliza para o
   lugar dela na assinatura. --lume-cx é o deslocamento que leva o centro da
   estrela (x = 3 + 237/2 na arte) ao centro da caixa. */
.lume-splash__star-wrap {
  position: absolute;
  left: calc(3 / var(--lume-w) * 100%);
  top: 1.3%;
  width: calc(237 / var(--lume-w) * 100%);
  height: 96.9%;
  --lume-cx: calc((var(--lume-w) / 2 - 121.5) / 237 * 100%);
  transform: translateX(var(--lume-cx)) scale(var(--lume-ignite));
  transform-origin: 50% 50%;
  animation: lume-splash-slide 760ms var(--lume-ease-out-expo) ${at(980)} both;
}
@keyframes lume-splash-slide {
  from { transform: translateX(var(--lume-cx)) scale(var(--lume-ignite)); }
  to   { transform: translateX(0) scale(1); }
}
.lume-splash__star {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  /* assenta o metal no tecido */
  filter: drop-shadow(0 0.5vmin 1.4vmin rgba(16, 0, 6, 0.55));
}
/* As duas metades (dois "L") chegam de cantos opostos, girando, uma logo
   depois da outra. */
.lume-splash__half {
  transform-box: view-box;
  transform-origin: 118.5px 111px;
}
.lume-splash__half--a { animation: lume-splash-ignite-a 1050ms var(--lume-ease-out-expo) ${at(120)} both; }
.lume-splash__half--b { animation: lume-splash-ignite-b 1050ms var(--lume-ease-out-expo) ${at(250)} both; }
@keyframes lume-splash-ignite-a {
  0%   { opacity: 0; transform: translate(-44px, -44px) rotate(-16deg) scale(0.5); }
  45%  { opacity: 1; }
  100% { opacity: 1; transform: none; }
}
@keyframes lume-splash-ignite-b {
  0%   { opacity: 0; transform: translate(44px, 44px) rotate(-16deg) scale(0.5); }
  45%  { opacity: 1; }
  100% { opacity: 1; transform: none; }
}
/* Reflexo cromado: a faixa de luz recortada pela própria estrela (clipPath). */
.lume-splash__sweep {
  transform-box: view-box;
  transform: translateX(-160px) skewX(-22deg);
  opacity: 0;
  animation: lume-splash-sweep 720ms var(--lume-ease-in-out) ${at(720)} both;
}
@keyframes lume-splash-sweep {
  from { opacity: 1; transform: translateX(-160px) skewX(-22deg); }
  to   { opacity: 1; transform: translateX(330px) skewX(-22deg); }
}
/* Ponto de luz que acende antes da estrela e fica como halo atrás dela. */
.lume-splash__bloom {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 230%;
  aspect-ratio: 1;
  border-radius: 50%;
  mix-blend-mode: screen;
  pointer-events: none;
  opacity: 0;
  transform: translate(-50%, -50%);
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.72), rgba(255, 205, 215, 0.24) 34%, rgba(255, 160, 180, 0.06) 58%, transparent 72%);
  animation: lume-splash-bloom 1500ms var(--lume-ease-out) ${at(0)} both;
}
@keyframes lume-splash-bloom {
  0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.18); }
  30%  { opacity: 1; }
  100% { opacity: 0.26; transform: translate(-50%, -50%) scale(1); }
}
/* Clarão horizontal no encaixe das metades (o eixo da estrela está a 50,6%). */
.lume-splash__flare {
  position: absolute;
  left: 50%;
  top: 50.6%;
  width: 300%;
  height: 2px;
  mix-blend-mode: screen;
  opacity: 0;
  transform: translate(-50%, -50%) scaleX(0.1);
  box-shadow: 0 0 8px 1px rgba(255, 255, 255, 0.35);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.95) 50%, transparent);
  animation: lume-splash-flare 650ms var(--lume-ease-out) ${at(640)} both;
}
@keyframes lume-splash-flare {
  0%   { opacity: 0; transform: translate(-50%, -50%) scaleX(0.08); }
  25%  { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -50%) scaleX(1); }
}

/* O "lume" se revela da esquerda para a direita por máscara, com um fio de
   luz acompanhando a borda. --lume-wipe é registrada (e herdada, para o fio
   seguir junto) para a máscara animar suave; onde @property não existe, o
   nome aparece de uma vez no meio da animação — degrada sem quebrar. */
@property --lume-wipe {
  syntax: '<percentage>';
  inherits: true;
  initial-value: 0%;
}
.lume-splash__word-wrap {
  position: absolute;
  left: calc((276 + var(--lume-gap)) / var(--lume-w) * 100%);
  top: 16.7%;
  width: calc(393 / var(--lume-w) * 100%);
  height: 62.1%;
  --lume-wipe: 0%;
  -webkit-mask-image: linear-gradient(90deg, #000 calc(var(--lume-wipe) - 14%), transparent var(--lume-wipe));
          mask-image: linear-gradient(90deg, #000 calc(var(--lume-wipe) - 14%), transparent var(--lume-wipe));
  animation:
    lume-splash-wipe 820ms var(--lume-ease-out-quint) ${at(1060)} both,
    lume-splash-word-slide 820ms var(--lume-ease-out-quint) ${at(1060)} both;
}
.lume-splash__word {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.lume-splash__word-edge {
  position: absolute;
  top: -14%;
  height: 128%;
  width: 12%;
  left: calc(var(--lume-wipe) - 9%);
  mix-blend-mode: screen;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
  animation: lume-splash-edge 820ms linear ${at(1060)} both;
}
@keyframes lume-splash-wipe {
  from { --lume-wipe: 0%; }
  to   { --lume-wipe: 122%; }
}
@keyframes lume-splash-word-slide {
  from { transform: translateX(-5%); }
  to   { transform: translateX(0); }
}
@keyframes lume-splash-edge {
  0%, 65% { opacity: 1; }
  100%    { opacity: 0; }
}
`;

/** Uma metade da estrela, com o metal cromado e o filete claro na borda. */
const half = (cls: string, d: string) =>
  `<g class="lume-splash__half ${cls}"><path d="${d}" fill="url(#lume-splash-chrome)" stroke="rgba(255,255,255,0.55)" stroke-width="1.2" stroke-linejoin="round" paint-order="stroke fill"/></g>`;

/**
 * O miolo de #lume-splash. HTML e não JSX porque a tela de abertura é um
 * documento avulso, montado como texto (app/abertura/route.ts).
 *
 * · O cetim é o pôster do login, retrato ou paisagem pelo mesmo critério de
 *   lá. decoding="sync" = decodifica dentro do paint, sem quadro de cor
 *   chapada antes do tecido.
 * · A marca fica numa caixa com a proporção da arte oficial (alargada no CSS
 *   para abrir o respiro entre a estrela e o nome).
 * · Cromo: branco → cinza → branco na diagonal, no espaço da estrela inteira
 *   (as duas metades compartilham o mesmo reflexo). O reflexo é uma faixa de
 *   luz recortada pela própria estrela.
 */
export const SPLASH_MARKUP =
  `<picture class="lume-splash__satin">` +
  `<source media="(min-aspect-ratio: 1/1)" srcset="${LUME_SATIN_DESKTOP}">` +
  `<img src="${LUME_SATIN_MOBILE}" alt="" decoding="sync" draggable="false">` +
  `</picture>` +
  `<div class="lume-splash__sheen"></div>` +
  `<div class="lume-splash__vignette"></div>` +
  `<div class="lume-splash__lockup">` +
  `<div class="lume-splash__star-wrap">` +
  `<div class="lume-splash__bloom"></div>` +
  `<div class="lume-splash__flare"></div>` +
  `<svg class="lume-splash__star" viewBox="0 0 237 220" focusable="false">` +
  `<defs>` +
  `<linearGradient id="lume-splash-chrome" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="237" y2="220">` +
  `<stop offset="0" stop-color="#ffffff"/>` +
  `<stop offset="0.36" stop-color="#e7e8ed"/>` +
  `<stop offset="0.52" stop-color="#a9acb7"/>` +
  `<stop offset="0.68" stop-color="#dcdee4"/>` +
  `<stop offset="1" stop-color="#ffffff"/>` +
  `</linearGradient>` +
  `<linearGradient id="lume-splash-sweep" x1="0" y1="0" x2="1" y2="0">` +
  `<stop offset="0" stop-color="#ffffff" stop-opacity="0"/>` +
  `<stop offset="0.5" stop-color="#ffffff" stop-opacity="0.95"/>` +
  `<stop offset="1" stop-color="#ffffff" stop-opacity="0"/>` +
  `</linearGradient>` +
  `<clipPath id="lume-splash-clip"><path d="${LUME_STAR_A} ${LUME_STAR_B}"/></clipPath>` +
  `</defs>` +
  half('lume-splash__half--a', LUME_STAR_A) +
  half('lume-splash__half--b', LUME_STAR_B) +
  `<g clip-path="url(#lume-splash-clip)">` +
  `<rect class="lume-splash__sweep" x="0" y="-60" width="80" height="340" fill="url(#lume-splash-sweep)"/>` +
  `</g>` +
  `</svg>` +
  `</div>` +
  `<div class="lume-splash__word-wrap">` +
  `<svg class="lume-splash__word" viewBox="0 0 393 141" focusable="false">` +
  `<path d="${LUME_WORD}" fill="#ffffff" fill-rule="evenodd"/>` +
  `</svg>` +
  `<span class="lume-splash__word-edge"></span>` +
  `</div>` +
  `</div>`;

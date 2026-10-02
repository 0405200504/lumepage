import { LUME_STAR_A, LUME_STAR_B } from './lumeSplashData';
import { SPLASH_BG } from './splashBg';

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
 * num <style> inline e a marcação é HTML puro (a estrela são caminhos SVG
 * embutidos, lib/ui/lumeSplashData).
 *
 * A cena, em 2,25 s, sobre bordô chapado (SPLASH_BG) — só a estrela, sem o
 * nome e sem textura:
 *   0,0–1,3   ignição: um ponto de luz acende e as duas metades da estrela
 *             chegam de cantos opostos, girando até se encaixar
 *   0,7–1,45  reflexo: um brilho cromado atravessa a estrela (o som toca
 *             no encaixe das metades)
 *   1,45–1,8  pausa: a estrela parada, o halo assentado
 *   1,8–2,25  entrada: a estrela avança meio passo e a cortina se dissolve
 *             sobre o painel
 *
 * Por que chapado: além de mais limpo, o fundo liso é o que fecha o bug do
 * iOS descrito em SPLASH_SCREEN_FIT_JS — a faixa que o iOS deixa embaixo
 * ganha a cor de fundo da página, e com tudo da mesma cor ela some. Também é a cor
 * da tela de abertura nativa do Android (background_color do manifesto) e das
 * telas de abertura do iPhone (public/splash): emenda invisível dos dois lados.
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
 *   launch     tela de abertura: toca a cena e segura a estrela, sem saída,
 *              até o painel assumir
 *   still      só o bordô (= tela de abertura do iPhone), sem estrela
 *   skip       abrevia a saída (tocou na tela)
 *   off        não existe
 */

/** O bordô da cortina (lib/ui/splashBg): reexportado daqui para quem monta a
 *  cena não precisar saber que ele mora num módulo à parte. */
export { SPLASH_BG };

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

/**
 * O BUG DO iOS NO APP INSTALADO (medido no iPhone do usuário, 01–02/10/2026):
 * a página criada no instante em que o app está abrindo nasce com a janela
 * mais curta que a tela — falta a altura da barra de status — e pode ficar
 * assim a abertura inteira: num iPhone 428×926 a janela ficou em 879 por
 * mais de 1,5 s, e até o painel chegou curto (só cresceu para 926 depois de
 * montado). Nada que a página desenhe aparece na faixa de baixo (zona
 * morta); a faixa fica com a cor de fundo da página — por isso o fundo
 * chapado (SPLASH_BG) a esconde.
 *
 * O que sobra é posicionar a estrela pela TELA, não pela janela, nas duas
 * páginas, para ela não pular na troca. Este trecho roda nas duas (a tela de
 * abertura e a porteira do painel): no app do iPhone em pé, grava em
 * --lume-ratio a proporção da tela (altura ÷ largura, que não muda com zoom
 * nenhum) e marca data-tela; o CSS da cena então mede a cortina como
 * `100vw × --lume-ratio` no lugar de inset: 0.
 *
 * Por que em vw e não em px medidos por JS: no iPhone 16 do usuário o app
 * roda com zoom de página de 85% (a janela vem em px CSS maiores que a
 * tela em pontos: 462 numa tela de 393). Esse zoom é aplicado DEPOIS do
 * primeiro script da tela de abertura — ela media innerWidth = 393, fixava
 * a altura em px e, zoomada em seguida, desenhava a estrela em 340 pt; o
 * painel, já nascendo zoomado, desenhava em 400 pt: a estrela pulava 60 pt
 * na troca (vídeo de 02/10, 14:11). Com `100vw` o navegador refaz a conta
 * sozinho quando o zoom entra, nas duas páginas, sem JS.
 */
export const SPLASH_SCREEN_FIT_JS =
  "try{var o=screen.orientation&&screen.orientation.type||'';" +
  "if(navigator.standalone===true&&!/landscape/.test(o)&&Math.abs(window.orientation||0)!==90&&screen.height>screen.width){" +
  "var fd=document.documentElement;fd.style.setProperty('--lume-ratio',String(Math.round(screen.height/screen.width*10000)/10000));fd.dataset.tela='cheia'}}catch(x){}";

/** Diagnóstico temporário da abertura no iPhone (sessionStorage → painel →
 *  /api/diag/abertura). Só medidas de tela, nada pessoal. */
export const SPLASH_DIAG_KEY = 'lume:abertura-diag';
/** Versão da tela de abertura — o diagnóstico diz qual o aparelho rodou
 *  (a guardada no cache pode estar atrasada). */
export const SPLASH_LAUNCH_VERSION = 'v11';

/** Cena até a saída. Tem de casar com o relógio do CSS abaixo. */
export const SPLASH_SCENE_MS = 1800;
/** Duração da saída (a cortina se dissolve). */
export const SPLASH_EXIT_MS = 450;
/** Quando a tela de abertura chama o painel: logo depois de o reflexo
 *  cromado terminar (1,44 s). Daqui em diante nada se mexe até a saída, então
 *  um quadro parado durante a troca de página não se nota. */
export const SPLASH_HANDOFF_AT_MS = 1500;

/** Atraso de animação descontando o tempo de cena já corrido. */
const at = (ms: number) => `calc(${ms}ms - var(--lume-t, 0ms))`;
/** Início da saída: 1800ms na cena normal; na continuação, o que faltar. */
const EXIT_AT = `var(--lume-exit, ${SPLASH_SCENE_MS}ms)`;

export const SPLASH_CSS = `
#lume-splash {
  position: fixed;
  inset: 0;
  z-index: 300;
  overflow: hidden;
  background: ${SPLASH_BG};
  touch-action: none;
  overscroll-behavior: contain;

  /* Tamanho da estrela: a caixa da arte oficial (237 × 220). */
  --lume-star-w: min(28vw, 110px);

  --lume-ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --lume-ease-out: cubic-bezier(0.33, 1, 0.68, 1);
  --lume-ease-in: cubic-bezier(0.55, 0, 1, 0.45);
  --lume-ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);

  animation: lume-splash-out ${SPLASH_EXIT_MS}ms var(--lume-ease-in) ${EXIT_AT} both;
}
/* Desktop (e qualquer tela deitada): estrela maior. */
@media (min-aspect-ratio: 1/1) {
  #lume-splash { --lume-star-w: clamp(120px, 9vw, 150px); }
}
html[data-splash='off'] #lume-splash { display: none; }
html[data-splash='skip'] #lume-splash { animation: lume-splash-out 160ms linear both; }
/* Tela de abertura: a cena toca, mas a cortina não sai — quem sai é a do
   painel, que assume daqui. */
html[data-splash='launch'] #lume-splash,
html[data-splash='launch'] .lume-splash__star-wrap { animation: none; }
/* App do iPhone: a cortina mede a TELA, não a janela (o iOS dá uma janela
   mais curta na abertura — ver SPLASH_SCREEN_FIT_JS). Em vw: acompanha o
   zoom de página sozinha. A tela de abertura ainda troca para
   position: absolute (app/abertura/route.ts). */
html[data-tela] #lume-splash { --lume-tela: calc(100vw * var(--lume-ratio, 2.1667)); bottom: auto; height: var(--lume-tela); }
/* Só o bordô: o primeiro quadro, igual à tela de abertura do iPhone. */
html[data-splash='still'] .lume-splash__star-wrap { display: none; }
html[data-splash='still'] #lume-splash,
html[data-splash='still'] #lume-splash * { animation: none; }

/* A visibilidade no último quadro é o que impede a cortina invisível de
   continuar comendo os toques do painel enquanto o JS não a remove. */
@keyframes lume-splash-out {
  0%   { opacity: 1; visibility: visible; }
  99%  { opacity: 0; visibility: visible; }
  100% { opacity: 0; visibility: hidden; }
}

/* ---- a estrela ---------------------------------------------------- */
.lume-splash__star-wrap {
  position: absolute;
  left: 50%;
  top: 47%;
  width: var(--lume-star-w);
  aspect-ratio: 237 / 220;
  transform: translate(-50%, -50%);
  /* Na saída a estrela avança meio passo: a sensação é de entrar no app,
     não de uma tela que apagou. */
  animation: lume-splash-exit ${SPLASH_EXIT_MS}ms var(--lume-ease-in) ${EXIT_AT} both;
}
@keyframes lume-splash-exit {
  from { transform: translate(-50%, -50%) scale(1); }
  to   { transform: translate(-50%, -50%) scale(1.04); }
}
.lume-splash__star {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  /* assenta o metal no fundo */
  filter: drop-shadow(0 0.4vmin 1.2vmin rgba(16, 0, 6, 0.45));
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
`;

/** Uma metade da estrela, com o metal cromado e o filete claro na borda. */
const half = (cls: string, d: string) =>
  `<g class="lume-splash__half ${cls}"><path d="${d}" fill="url(#lume-splash-chrome)" stroke="rgba(255,255,255,0.55)" stroke-width="1.2" stroke-linejoin="round" paint-order="stroke fill"/></g>`;

/**
 * O miolo de #lume-splash. HTML e não JSX porque a tela de abertura é um
 * documento avulso, montado como texto (app/abertura/route.ts).
 *
 * Cromo: branco → cinza → branco na diagonal, no espaço da estrela inteira
 * (as duas metades compartilham o mesmo reflexo). O reflexo é uma faixa de
 * luz recortada pela própria estrela.
 */
export const SPLASH_MARKUP =
  `<div class="lume-splash__star-wrap">` +
  `<div class="lume-splash__bloom"></div>` +
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
  `</div>`;

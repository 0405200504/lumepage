import {
  PANEL_FLAG_KEY,
  SPLASH_BG,
  SPLASH_CSS,
  SPLASH_DIAG_KEY,
  SPLASH_HANDOFF_AT_MS,
  SPLASH_HANDOFF_KEY,
  SPLASH_LAUNCH_VERSION,
  SPLASH_MARKUP,
  SPLASH_SCREEN_FIT_JS,
} from '@/lib/ui/splashScene';

/**
 * TELA DE ABERTURA INSTANTÂNEA do app instalado.
 *
 * O problema: no toque do ícone, o painel só pinta depois que o servidor
 * monta a página (sessão, banco) — no celular, uns 2 s olhando a tela de
 * abertura parada do sistema, e só então a cena começava, de repente.
 *
 * A saída: este documento avulso, que o service worker (public/sw.js) guarda
 * no cache e entrega NA HORA quando o app abre do zero, no lugar do /dashboard
 * pedido. Ele já é a cena (lib/ui/splashScene): pinta no primeiro quadro,
 * sem esperar ninguém. Enquanto ela toca, o service worker já foi buscar o
 * painel de verdade. Aos 1,5 s — o reflexo acabou e daqui em diante nada se
 * mexe — este documento chama o painel, que continua a cena do mesmo ponto
 * (components/ui/AppSplash, modo 'handoff') e se dissolve. Se o painel
 * atrasar, a estrela fica parada esperando por ele.
 *
 * Tudo inline, nada de CSS/JS do Next: depois de um deploy, um HTML guardado
 * que apontasse para arquivos de build antigos pintaria sem estilo.
 *
 * Quem não está logada (ou pediu menos movimento) não vê a cena aqui: o
 * documento mostra só o bordô — igual à tela de abertura do iPhone — e segue
 * direto, porque o destino vai ser o login.
 *
 * No app do iPhone a janela nasce mais curta que a tela e pode ficar assim a
 * abertura inteira, e o zoom de página pode entrar depois do primeiro script
 * (SPLASH_SCREEN_FIT_JS em lib/ui/splashScene). O fundo chapado esconde a
 * faixa; a cena é medida pela tela em vw, igual no painel, para a estrela
 * não pular na troca. Diagnóstico (temporário, só no app do iPhone): a
 * janela, o zoom e a posição da estrela são amostrados ao longo da cena em
 * sessionStorage; o painel manda para /api/diag/abertura.
 */
export const dynamic = 'force-static';

const LAUNCH_SCRIPT = `(function(){
var d=document.documentElement,s=null;
try{s=sessionStorage}catch(e){}
var noPainel=/^\\/dashboard(\\/|$)/.test(location.pathname);
var caminho=noPainel?location.pathname+location.search:'/dashboard';
var ir=function(){location.replace(caminho)};
${SPLASH_SCREEN_FIT_JS}
var logada=false,calma=false;
try{logada=localStorage.getItem(${JSON.stringify(PANEL_FLAG_KEY)})==='1'}catch(e){}
try{calma=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
if(!logada||calma){d.dataset.splash='still';ir();return}
var amostra=function(t){try{var vv=window.visualViewport,st=document.querySelector('.lume-splash__star-wrap'),r=st&&st.getBoundingClientRect(),g=JSON.parse(s.getItem(${JSON.stringify(
  SPLASH_DIAG_KEY,
)})||'null');if(!g)return;g.pg.push({t:t,j:[innerWidth,innerHeight],c:d.clientHeight,dpr:devicePixelRatio,vv:vv?[Math.round(vv.width),Math.round(vv.height),vv.scale]:null,estrela:r?[Math.round(r.top),Math.round(r.height)]:null});s.setItem(${JSON.stringify(
  SPLASH_DIAG_KEY,
)},JSON.stringify(g))}catch(e){}};
if(d.dataset.tela){try{s.setItem(${JSON.stringify(SPLASH_DIAG_KEY)},JSON.stringify({v:${JSON.stringify(
  SPLASH_LAUNCH_VERSION,
)},ua:navigator.userAgent,tela:[screen.width,screen.height],ratio:d.style.getPropertyValue('--lume-ratio'),dm:matchMedia('(display-mode: standalone)').matches,pg:[]}))}catch(e){}amostra(0);requestAnimationFrame(function(){amostra(1)});setTimeout(function(){amostra(150)},150);setTimeout(function(){amostra(400)},400);setTimeout(function(){amostra(900)},900);setTimeout(function(){amostra(1400)},1400)}
d.dataset.splash='launch';
var t0=Date.now(),marca=function(){try{s.setItem(${JSON.stringify(SPLASH_HANDOFF_KEY)},String(t0))}catch(e){}};
marca();
requestAnimationFrame(function(){t0=Date.now();marca()});
setTimeout(ir,${SPLASH_HANDOFF_AT_MS});
})();`;

const LAUNCH_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="${SPLASH_BG}">
<meta name="robots" content="noindex">
<title>Lume</title>
<script>${LAUNCH_SCRIPT}</script>
<style>html,body{margin:0;height:100%;background:${SPLASH_BG};overflow:hidden}html[data-tela],html[data-tela] body{height:calc(100vw * var(--lume-ratio, 2.1667))}${SPLASH_CSS}html[data-tela] #lume-splash{position:absolute;top:0;right:0;left:0}</style>
</head>
<body>
<div id="lume-splash" aria-hidden="true">${SPLASH_MARKUP}</div>
</body>
</html>`;

export function GET() {
  return new Response(LAUNCH_HTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

import {
  PANEL_FLAG_KEY,
  SPLASH_CSS,
  SPLASH_DIAG_KEY,
  SPLASH_HANDOFF_AT_MS,
  SPLASH_HANDOFF_KEY,
  SPLASH_LAUNCH_VERSION,
  SPLASH_MARKUP,
  SPLASH_RETRY_MS,
  SPLASH_WAIT_KEY,
  SPLASH_WAIT_MAX_MS,
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
 * painel de verdade. Aos 1,9 s — o "lume" acabou de aparecer e daqui em
 * diante só o cetim se mexe — este documento chama o painel, que continua a
 * cena do mesmo ponto (components/ui/AppSplash, modo 'handoff') e se dissolve.
 * Se o painel atrasar, a marca fica parada no cetim esperando por ele.
 *
 * Tudo inline, nada de CSS/JS do Next: depois de um deploy, um HTML guardado
 * que apontasse para arquivos de build antigos pintaria sem estilo.
 *
 * Quem não está logada (ou pediu menos movimento) não vê a cena aqui: o
 * documento mostra só o cetim parado — igual à tela de abertura do iPhone —
 * e segue direto, porque o destino vai ser o login.
 *
 * O BUG DO iOS 26 (ver SPLASH_WAIT_KEY em lib/ui/splashScene): a página
 * criada enquanto o app ainda abre nasce com a janela curta — falta a altura
 * da barra de status, a faixa de baixo vira zona morta e nada desenhado ali
 * aparece. Não há CSS que resolva dentro dessa página. Então:
 *   · se a janela nasceu mais curta que a tela (só no app do iPhone, em pé),
 *     a página mostra o cetim parado e se recria em /abertura, a cada
 *     SPLASH_RETRY_MS, até nascer certa — e só então toca a cena;
 *   · passando de SPLASH_WAIT_MAX_MS, toca do jeito que estiver. Para esse
 *     caso a cena é medida pela tela (screen.height) — a marca fica no mesmo
 *     ponto da do painel — e o fundo é a cor da borda de baixo do cetim com
 *     a vinheta (#2d0614), para a zona morta sumir no tecido.
 *
 * Diagnóstico (temporário, só no app do iPhone): cada página anota as medidas
 * da janela em sessionStorage; o painel manda tudo para /api/diag/abertura.
 */
export const dynamic = 'force-static';

const LAUNCH_SCRIPT = `(function(){
var d=document.documentElement,agora=Date.now(),s=null;
try{s=sessionStorage}catch(e){}
var noPainel=/^\\/dashboard(\\/|$)/.test(location.pathname),para=null,n=0;
try{var q=new URLSearchParams(location.search);para=q.get('para');n=Number(q.get('n'))||0}catch(e){}
var caminho=noPainel?location.pathname+location.search:(para&&/^\\/dashboard(\\/|\\?|$)/.test(para)?para:'/dashboard');
var ir=function(){location.replace(caminho)};
var o='',deitado=false;
try{o=screen.orientation&&screen.orientation.type||'';deitado=/landscape/.test(o)||Math.abs(window.orientation||0)===90}catch(e){}
var ios=navigator.standalone===true&&!deitado&&screen.height>screen.width;
if(ios){d.style.setProperty('--lume-tela',screen.height+'px');d.dataset.tela='cheia'}
var logada=false,calma=false;
try{logada=localStorage.getItem(${JSON.stringify(PANEL_FLAG_KEY)})==='1'}catch(e){}
try{calma=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
if(!logada||calma){d.dataset.splash='still';ir();return}
var curta=ios&&innerHeight>0&&innerHeight<screen.height-2;
var inicio=agora;
try{if(noPainel){s.setItem(${JSON.stringify(SPLASH_WAIT_KEY)},String(agora))}else{inicio=Number(s.getItem(${JSON.stringify(SPLASH_WAIT_KEY)}))||agora}}catch(e){}
var esperando=curta&&agora-inicio<${SPLASH_WAIT_MAX_MS}&&n<40;
if(ios){try{
var dg=noPainel?{v:${JSON.stringify(SPLASH_LAUNCH_VERSION)},ua:navigator.userAgent,tela:[screen.width,screen.height],dpr:devicePixelRatio,dm:matchMedia('(display-mode: standalone)').matches,pg:[]}:JSON.parse(s.getItem(${JSON.stringify(SPLASH_DIAG_KEY)})||'null');
if(dg&&dg.pg.length<60){var vv=window.visualViewport;dg.pg.push({t:agora-inicio,j:[innerWidth,innerHeight],c:d.clientHeight,vv:vv?Math.round(vv.height):null,curta:curta,acao:esperando?'recria':'cena'});s.setItem(${JSON.stringify(SPLASH_DIAG_KEY)},JSON.stringify(dg))}
}catch(e){}}
if(esperando){
d.dataset.splash='still';
setTimeout(function(){location.replace('/abertura?para='+encodeURIComponent(caminho)+'&n='+(n+1))},${SPLASH_RETRY_MS});
return}
try{s.removeItem(${JSON.stringify(SPLASH_WAIT_KEY)})}catch(e){}
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
<meta name="theme-color" content="#4a0e22">
<meta name="robots" content="noindex">
<title>Lume</title>
<script>${LAUNCH_SCRIPT}</script>
<style>html,body{margin:0;height:100%;background:#2d0614;overflow:hidden}html[data-tela],html[data-tela] body{height:var(--lume-tela)}${SPLASH_CSS}html[data-tela] #lume-splash{position:absolute;top:0;right:0;bottom:auto;left:0;height:var(--lume-tela)}</style>
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

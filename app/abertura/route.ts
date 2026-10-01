import {
  PANEL_FLAG_KEY,
  SPLASH_CSS,
  SPLASH_HANDOFF_AT_MS,
  SPLASH_HANDOFF_KEY,
  SPLASH_MARKUP,
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
 * ALTURA NO IPHONE: este documento pinta enquanto o app ainda está abrindo, e
 * nesse instante o iOS dá à página uma altura menor que a tela — tira a
 * barra de status (59 pt num iPhone 15), mas a página começa no topo mesmo
 * assim. Resultado medido em vídeo: o cetim acabava 59 pt antes do fim, com
 * uma faixa lisa embaixo, e a marca (a 47% da altura) ficava 28 pt acima de
 * onde o painel a desenha, pulando na troca. O painel, que chega depois, já
 * recebe a tela inteira. Por isso, no app instalado do iPhone a cena aqui é
 * medida pela tela (screen.height), não pela janela — e fica do tamanho
 * exato da do painel.
 *
 * A detecção não pode olhar a janela (innerWidth/innerHeight): é justamente
 * ela que o iOS ainda não acertou nesse instante. Olha só se é o app
 * instalado do iPhone (navigator.standalone) e se a tela está em pé (pela
 * orientação da tela, não pelas medidas da janela). E o fundo da página é a
 * cor da borda de baixo do cetim já com a vinheta (#2d0614): se o iOS
 * mesmo assim deixar alguma sobra embaixo, ela some no tecido em vez de
 * virar uma faixa clara.
 */
export const dynamic = 'force-static';

const LAUNCH_SCRIPT = `(function(){var d=document.documentElement;try{var o=screen.orientation&&screen.orientation.type||'',deitado=/landscape/.test(o)||Math.abs(window.orientation||0)===90;if(navigator.standalone===true&&!deitado&&screen.height>screen.width){d.style.setProperty('--lume-tela',screen.height+'px');d.dataset.tela='cheia'}}catch(e){}var alvo=/^\\/dashboard(\\/|$)/.test(location.pathname)?location.href:'/dashboard',ir=function(){location.replace(alvo)},logada=false,calma=false;try{logada=localStorage.getItem(${JSON.stringify(
  PANEL_FLAG_KEY,
)})==='1'}catch(e){}try{calma=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}if(!logada||calma){d.dataset.splash='still';ir();return}d.dataset.splash='launch';var t0=Date.now(),marca=function(){try{sessionStorage.setItem(${JSON.stringify(
  SPLASH_HANDOFF_KEY,
)},String(t0))}catch(e){}};marca();requestAnimationFrame(function(){t0=Date.now();marca()});setTimeout(ir,${SPLASH_HANDOFF_AT_MS})})();`;

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

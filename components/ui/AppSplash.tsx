import React from 'react';
import {
  SPLASH_CSS,
  SPLASH_DIAG_KEY,
  SPLASH_SCREEN_FIT_JS,
  SPLASH_HANDOFF_KEY,
  SPLASH_HANDOFF_TTL_MS,
  SPLASH_MARKUP,
  SPLASH_SCENE_MS,
  SPLASH_SESSION_KEY,
} from '@/lib/ui/splashScene';
import { SplashRunner } from './SplashRunner';

/**
 * ABERTURA DO APP — a cortina de marca entre o login e o painel.
 *
 * A cena, em 2,25 s (coreografia, estilos e relógio em lib/ui/splashScene):
 * sobre bordô chapado, um ponto de luz acende; as duas metades da estrela
 * chegam de cantos opostos, girando, e se encaixam com um clarão e um reflexo
 * cromado; a estrela assenta e a cortina se dissolve sobre o painel. Junto,
 * duas notas de vidro (lib/ui/appChime) no instante do encaixe.
 *
 * SEM PISCAR — o que garante que nenhum quadro estranho apareça antes dela:
 *   · no toque do ícone, quem pinta a cena é a tela de abertura que o
 *     service worker serve do cache (app/abertura/route.ts), sem esperar o
 *     servidor montar o painel. Ela grava quando a cena começou; a porteira
 *     abaixo lê e este componente continua do mesmo quadro (modo 'handoff');
 *   · o fundo é uma cor chapada (SPLASH_BG): nada a decodificar, e no iPhone
 *     a faixa que o iOS 26 deixa embaixo ganha essa mesma cor e some;
 *   · a estrela é SVG inline, não máscara nem imagem; o CSS vai inline também;
 *   · vindo do login, a cortina de lá (components/auth/LoginCurtain) já
 *     mostra este mesmo primeiro quadro enquanto o painel carrega;
 *   · no iPhone instalado, as telas de abertura (public/splash) são este
 *     mesmo quadro, geradas por scripts/gerar-splash-ios.mts;
 *   · no Android, o background_color do manifesto é esta mesma cor.
 *
 * POR QUE ISTO É SERVER COMPONENT (e não um `useEffect` que monta um portal):
 * a cortina precisa estar no HTML do primeiro paint. Componente cliente só
 * aparece depois da hidratação — daria um flash do painel ANTES da abertura,
 * que é exatamente o defeito que a abertura existe para tapar.
 *
 * QUANDO APARECE
 *   · abertura fria (tocou no ícone do app / abriu a aba)  → aparece (pela
 *     tela de abertura do service worker, quando ela já está no cache)
 *   · entrou pelo login e caiu no painel                   → aparece
 *   · trocou de aba dentro do painel                       → não (a casca
 *     é persistente; este nó nem remonta)
 *   · recarregou a página (puxar para atualizar)           → não, graças ao
 *     script de porteira abaixo
 *
 * A porteira roda ANTES da cortina ser parseada, então quando ela decide
 * "já abriu nesta sessão" ninguém chega a ver um quadro sequer.
 *
 * Some sozinha por CSS (`animation` com `fill-mode: both`), sem depender de
 * JS. Se a hidratação demorar ou falhar, a abertura termina do mesmo jeito.
 */
export const AppSplash: React.FC = () => {
  // Continuação: e = quanto da cena a tela de abertura já tocou. Os atrasos
  // do CSS descontam --lume-t, e a saída começa no que faltar até 2350ms
  // (ou já, se a cena acabou e a marca estava parada esperando o painel).
  // No fim, se a tela de abertura deixou diagnóstico (app do iPhone), anota
  // a janela que o painel recebeu — o SplashRunner manda.
  // Antes de tudo, no app do iPhone em pé a cortina é medida pela tela
  // (SPLASH_SCREEN_FIT_JS), como na tela de abertura: o iOS dá ao painel a
  // mesma janela curta, e a estrela tem de ficar no mesmo ponto.
  const gate = `${SPLASH_SCREEN_FIT_JS}try{var d=document.documentElement,s=sessionStorage,h=Number(s.getItem(${JSON.stringify(
    SPLASH_HANDOFF_KEY,
  )})),e=Date.now()-h;s.removeItem(${JSON.stringify(SPLASH_HANDOFF_KEY)});if(h&&e>=0&&e<${SPLASH_HANDOFF_TTL_MS}){s.setItem(${JSON.stringify(
    SPLASH_SESSION_KEY,
  )},'1');d.dataset.splash='handoff';d.style.setProperty('--lume-t',e+'ms');d.style.setProperty('--lume-exit',Math.max(0,${SPLASH_SCENE_MS}-e)+'ms')}else if(s.getItem(${JSON.stringify(
    SPLASH_SESSION_KEY,
  )})==='1'){d.dataset.splash='off'}else{s.setItem(${JSON.stringify(SPLASH_SESSION_KEY)},'1')}var g=JSON.parse(s.getItem(${JSON.stringify(
    SPLASH_DIAG_KEY,
  )})||'null');if(g){var vv=window.visualViewport;g.painel={j:[innerWidth,innerHeight],c:d.clientHeight,vv:vv?Math.round(vv.height):null,fit:d.style.getPropertyValue('--lume-tela'),e:h?e:null};s.setItem(${JSON.stringify(
    SPLASH_DIAG_KEY,
  )},JSON.stringify(g))}}catch(x){}`;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: gate }} />
      <style dangerouslySetInnerHTML={{ __html: SPLASH_CSS }} />
      <div id="lume-splash" aria-hidden="true" dangerouslySetInnerHTML={{ __html: SPLASH_MARKUP }} />
      <SplashRunner />
    </>
  );
};

export default AppSplash;

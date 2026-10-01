import React from 'react';
import { LUME_MARK_MASK } from '@/lib/ui/lumeMaskData';
import { SplashRunner, SPLASH_SESSION_KEY } from './SplashRunner';

/**
 * ABERTURA DO APP — a cortina de marca entre o login e o painel.
 *
 * Um gesto só: fundo vinho chapado, a marca surge, um fio de luz se abre
 * sob ela e a cortina se desfaz sobre o painel. Junto, duas notas de vidro
 * (lib/ui/appChime). Cabe em 1,4 s.
 *
 * POR QUE ISTO É SERVER COMPONENT (e não um `useEffect` que monta um portal):
 * a cortina precisa estar no HTML do primeiro paint. Componente cliente só
 * aparece depois da hidratação — daria um flash do painel ANTES da abertura,
 * que é exatamente o defeito que a abertura existe para tapar.
 *
 * QUANDO APARECE
 *   · abertura fria (tocou no ícone do app / abriu a aba)  → aparece
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
  const gate = `try{var d=document.documentElement;if(sessionStorage.getItem(${JSON.stringify(
    SPLASH_SESSION_KEY,
  )})==='1'){d.dataset.splash='off'}else{sessionStorage.setItem(${JSON.stringify(
    SPLASH_SESSION_KEY,
  )},'1')}}catch(e){}`;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: gate }} />

      <div id="lume-splash" aria-hidden="true">
        <div className="lume-splash__stage">
          {/* O wordmark é uma máscara, não um <img>: a arte só-alfa
              (lib/ui/lumeMaskData, 26 kB) entra uma vez como data URI em
              --lume-mark e o preenchimento é a cor creme. */}
          <div
            className="lume-splash__mark"
            style={{ '--lume-mark': `url(${LUME_MARK_MASK})` } as React.CSSProperties}
          />
          <div className="lume-splash__line" />
        </div>
      </div>

      <SplashRunner />
    </>
  );
};

export default AppSplash;

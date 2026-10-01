import React from 'react';
import {
  LUME_SATIN_DESKTOP,
  LUME_SATIN_MOBILE,
  LUME_STAR_A,
  LUME_STAR_B,
  LUME_WORD,
} from '@/lib/ui/lumeSplashData';
import { SplashRunner, SPLASH_SESSION_KEY } from './SplashRunner';

/**
 * ABERTURA DO APP — a cortina de marca entre o login e o painel.
 *
 * A cena, em 2,8 s (coreografia e relógio em app/globals.css, #lume-splash):
 * sobre o cetim do login, um ponto de luz acende; as duas metades da estrela
 * chegam de cantos opostos, girando, e se encaixam com um clarão e um reflexo
 * cromado; a estrela encolhe e desliza para a esquerda enquanto o "lume" se
 * revela; a cortina se dissolve sobre o painel. Junto, duas notas de vidro
 * (lib/ui/appChime) no instante do encaixe.
 *
 * SEM PISCAR — o que garante que nenhum quadro estranho apareça antes dela:
 *   · o cetim é um <img> embutido (data URI) com decoding="sync": pinta no
 *     mesmo quadro que a cortina, sem rede, sem cache, sem decodificação
 *     tardia — um fundo de CSS podia aparecer um quadro depois da cor chapada;
 *   · a marca é SVG inline (lib/ui/lumeSplashData), não máscara nem imagem;
 *   · vindo do login, a cortina de lá (components/auth/LoginCurtain) já
 *     mostra este mesmo primeiro quadro enquanto o painel carrega;
 *   · no iPhone instalado, as telas de abertura (public/splash) são este
 *     mesmo quadro, geradas por scripts/gerar-splash-ios.mts;
 *   · no Android, o background_color do manifesto é o tom médio do cetim.
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
        {/* O cetim: o pôster do login, retrato ou paisagem pelo mesmo critério
            de lá. decoding="sync" = decodifica dentro do paint, sem quadro de
            cor chapada antes do tecido. */}
        <picture className="lume-splash__satin">
          <source media="(min-aspect-ratio: 1/1)" srcSet={LUME_SATIN_DESKTOP} />
          <img src={LUME_SATIN_MOBILE} alt="" decoding="sync" draggable={false} />
        </picture>
        <div className="lume-splash__sheen" />
        <div className="lume-splash__vignette" />

        {/* A marca: caixa com a proporção da arte oficial (alargada no CSS para
            abrir o respiro entre a estrela e o nome). */}
        <div className="lume-splash__lockup">
          <div className="lume-splash__star-wrap">
            <div className="lume-splash__bloom" />
            <div className="lume-splash__flare" />
            <svg className="lume-splash__star" viewBox="0 0 237 220" focusable="false">
              <defs>
                {/* Cromo: branco → cinza → branco na diagonal, no espaço da estrela
                    inteira (as duas metades compartilham o mesmo reflexo). */}
                <linearGradient
                  id="lume-splash-chrome"
                  gradientUnits="userSpaceOnUse"
                  x1="0"
                  y1="0"
                  x2="237"
                  y2="220"
                >
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset="0.36" stopColor="#e7e8ed" />
                  <stop offset="0.52" stopColor="#a9acb7" />
                  <stop offset="0.68" stopColor="#dcdee4" />
                  <stop offset="1" stopColor="#ffffff" />
                </linearGradient>
                <linearGradient id="lume-splash-sweep" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                  <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
                <clipPath id="lume-splash-clip">
                  <path d={`${LUME_STAR_A} ${LUME_STAR_B}`} />
                </clipPath>
              </defs>
              <g className="lume-splash__half lume-splash__half--a">
                <path
                  d={LUME_STAR_A}
                  fill="url(#lume-splash-chrome)"
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                  paintOrder="stroke fill"
                />
              </g>
              <g className="lume-splash__half lume-splash__half--b">
                <path
                  d={LUME_STAR_B}
                  fill="url(#lume-splash-chrome)"
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                  paintOrder="stroke fill"
                />
              </g>
              {/* Reflexo cromado: uma faixa de luz recortada pela própria estrela. */}
              <g clipPath="url(#lume-splash-clip)">
                <rect
                  className="lume-splash__sweep"
                  x="0"
                  y="-60"
                  width="80"
                  height="340"
                  fill="url(#lume-splash-sweep)"
                />
              </g>
            </svg>
          </div>
          <div className="lume-splash__word-wrap">
            <svg className="lume-splash__word" viewBox="0 0 393 141" focusable="false">
              <path d={LUME_WORD} fill="#ffffff" fillRule="evenodd" />
            </svg>
            <span className="lume-splash__word-edge" />
          </div>
        </div>
      </div>

      <SplashRunner />
    </>
  );
};

export default AppSplash;

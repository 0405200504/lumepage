import React from 'react';
import { LUME_MARK_MASK } from '@/lib/ui/lumeMaskData';
import { SplashRunner, SPLASH_SESSION_KEY } from './SplashRunner';

/**
 * ABERTURA DO APP — a marca acendendo.
 *
 * Muita profissional usa a Lume instalada na tela inicial do celular, e app
 * instalado que abre direto no conteúdo parece site. Esta é a cortina de
 * marca entre o toque no ícone e o painel.
 *
 * SÃO DUAS ABERTURAS, e uma é o piso da outra:
 *   · CELULAR — o filme da marca (public/splash-mobile-v1.mp4), com o traço
 *     desenhando "lume" e a trilha dele. É o que aparece quando o arquivo já
 *     está no cache do navegador e o autoplay é permitido.
 *   · COMPUTADOR, e o celular em toda abertura em que o filme não entrar em
 *     cena a tempo — a animação de CSS: fundo vinho, o wordmark surgindo com
 *     uma varredura de luz atravessando o traço, a estrelinha do logo
 *     piscando e um sino curto (lib/ui/appChime).
 *
 * A de CSS pinta no primeiro quadro, sem rede. Por isso ela é a base e o
 * filme entra POR CIMA: nenhuma abertura fica em branco esperando download.
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
        {/* CELULAR · o filme da marca.
            `data-src` em vez de `src` de propósito: quem decide baixar 1,2 MB
            é o SplashRunner, e só no celular. No computador o vídeo é 9:16 e
            ficaria cortado — lá vale a animação de CSS abaixo. */}
        <video
          id="lume-splash-video"
          className="lume-splash__video"
          data-src="/splash-mobile-v1.mp4"
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          aria-hidden="true"
        />

        <div className="lume-splash__stage">
          <div className="lume-splash__wordmark">
            {/* O halo mora aqui dentro para acender ATRÁS das letras, e não
                atrás do conjunto (marca + fio), que ficaria descentrado. */}
            <div className="lume-splash__glow" />

            {/* O wordmark NÃO é um <img>: é uma máscara.
                Assim o preenchimento é um gradiente animado — a luz varre as
                letras por dentro do traço, em vez de passar um brilho por
                cima da caixa retangular. A arte entra uma única vez, como
                data URI, na variável --lume-mark — e é a versão só-alfa
                (lib/ui/lumeMaskData), que pesa 26 kB no HTML em vez dos 45 kB
                da arte colorida, que aqui seria desperdício. */}
            <div
              className="lume-splash__mark"
              style={{ '--lume-mark': `url(${LUME_MARK_MASK})` } as React.CSSProperties}
            />
            {/* A estrela que existe no próprio logo, entre o "m" e o "e". */}
            <span className="lume-splash__spark" />
          </div>

          <div className="lume-splash__line" />
        </div>
      </div>

      <SplashRunner />
    </>
  );
};

export default AppSplash;

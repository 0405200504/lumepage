import React from 'react';
import { LUME_SATIN_DESKTOP, LUME_SATIN_MOBILE } from '@/lib/ui/lumeSplashData';

/**
 * CORTINA DO LOGIN — sobe no instante em que o login dá certo e fica de pé
 * até o painel chegar.
 *
 * É o primeiro quadro exato da abertura (components/ui/AppSplash): o mesmo
 * cetim, a mesma vinheta, embutidos. Sem ela, entre "Acessar Painel" e a
 * cortina do painel havia um vão em que o navegador podia mostrar o
 * formulário sumindo ou o esqueleto do painel por um quadro — a "piscada".
 * Com ela a sequência é: formulário → cetim (380ms de fade) → a estrela
 * acende já sobre o mesmo cetim, sem emenda visível.
 *
 * Só para o /dashboard: o admin e o salão não têm a abertura, então lá a
 * cortina não teria em que emendar. Estilos em app/globals.css (.login-curtain).
 */
export function LoginCurtain() {
  return (
    <div className="login-curtain" aria-hidden="true">
      <picture className="login-curtain__satin">
        <source media="(min-aspect-ratio: 1/1)" srcSet={LUME_SATIN_DESKTOP} />
        <img src={LUME_SATIN_MOBILE} alt="" decoding="sync" draggable={false} />
      </picture>
      <div className="login-curtain__vignette" />
    </div>
  );
}

export default LoginCurtain;

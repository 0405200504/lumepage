import React from 'react';
import { SPLASH_BG } from '@/lib/ui/splashScene';

/**
 * CORTINA DO LOGIN — sobe no instante em que o login dá certo e fica de pé
 * até o painel chegar.
 *
 * É o primeiro quadro exato da abertura (components/ui/AppSplash): o mesmo
 * bordô chapado. Sem ela, entre "Acessar Painel" e a cortina do painel havia
 * um vão em que o navegador podia mostrar o formulário sumindo ou o
 * esqueleto do painel por um quadro — a "piscada". Com ela a sequência é:
 * formulário → bordô (380ms de fade) → a estrela acende sobre o mesmo bordô,
 * sem emenda visível.
 *
 * Só para o /dashboard: o admin e o salão não têm a abertura, então lá a
 * cortina não teria em que emendar. Estilos em app/globals.css (.login-curtain).
 */
export function LoginCurtain() {
  return <div className="login-curtain" aria-hidden="true" style={{ background: SPLASH_BG }} />;
}

export default LoginCurtain;

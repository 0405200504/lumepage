'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

/**
 * Fade + 6px de subida a cada troca de rota, e SÓ no conteúdo.
 * A casca (rail, topbar, tab bar) vive fora daqui de propósito: navegação
 * que anima junto com a página passa a sensação de recarregar o app inteiro.
 *
 * A `key` no pathname é o que faz a animação rodar de novo — o <main> é
 * persistente e sem ela o elemento nunca remonta.
 */
export const RouteTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  return (
    <div key={pathname} className="route-fade">
      {children}
    </div>
  );
};

export default RouteTransition;

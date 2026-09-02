import React from 'react';
import { MonoTrail } from './Mono';

/**
 * Cabeçalho de página.
 *
 * Acima do título vai a TRILHA de contexto — `Agenda · qui, 27 ago ·
 * 5 agendamentos`. Ela responde "onde estou, de quando, quantos" antes de
 * o olho chegar ao conteúdo. Deixou de ser caixa alta com tracking largo
 * (lia como cabeçalho de log) e virou uma linha de legenda comum.
 *
 * O título é `h2` (24px/700, tracking -0.022em) e a descrição respira
 * 6px abaixo dele: nas referências o cabeçalho de tela é o segundo maior
 * elemento da página, atrás só do número que ela apresenta.
 */
export const PageHeader: React.FC<{
  /** Itens da trilha, já em caixa alta ou não — o CSS aplica uppercase. */
  trail?: (string | number | null | undefined)[];
  title: string;
  description?: string;
  /** Botões da direita. Um só é primário. */
  actions?: React.ReactNode;
  className?: string;
}> = ({ trail, title, description, actions, className = '' }) => (
  <header data-tour="module-header" className={`flex flex-wrap items-end justify-between gap-x-4 gap-y-3 ${className}`}>
    <div className="min-w-0">
      {trail && trail.length > 0 && <MonoTrail items={trail} className="mb-2" />}
      <h1 className="text-h2 text-heading truncate">{title}</h1>
      {description && <p className="text-body-sm text-n-600 mt-1.5 max-w-2xl">{description}</p>}
    </div>
    {/* As ações quebram em vez de esticar a página: num header com seletor de
        período + exportar + botão primário, 375px não comporta a linha. */}
    {actions && <div data-tour="module-action" className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

export default PageHeader;

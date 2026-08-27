import React from 'react';
import { MonoTrail } from './Mono';

/**
 * Cabeçalho de página.
 *
 * O que muda em relação ao anterior é uma linha só: a TRILHA de contexto
 * em mono acima do título — `AGENDA · QUI 27 AGO · 5 AGENDAMENTOS`. Ela
 * responde "onde estou, de quando, quantos" antes de o olho chegar ao
 * conteúdo, e sozinha já muda a temperatura da tela de "app" para
 * "instrumento". O título continua em sans, porque nome é nome.
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
  <header className={`flex flex-wrap items-end justify-between gap-4 ${className}`}>
    <div className="min-w-0">
      {trail && trail.length > 0 && <MonoTrail items={trail} className="mb-1.5" />}
      <h1 className="text-h2 text-heading truncate">{title}</h1>
      {description && <p className="text-body-sm text-n-600 mt-1">{description}</p>}
    </div>
    {/* As ações quebram em vez de esticar a página: num header com seletor de
        período + exportar + botão primário, 375px não comporta a linha. */}
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

export default PageHeader;

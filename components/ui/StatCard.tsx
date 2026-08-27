import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  label: string;
  /** Já formatado. Quem anima é o CountUp, quando fizer sentido. */
  value: React.ReactNode;
  hint?: string;
  /** ⚠️ Ignorado de propósito — veja a nota abaixo. */
  icon?: React.ReactNode;
  /** Número em vinho — reservado à métrica que exige ação. UMA por tela. */
  accent?: boolean;
  href?: string;
  className?: string;
}

/**
 * Card de métrica: rótulo pequeno em cima, número GRANDE embaixo.
 *
 * A proporção é o assunto. Nas referências o número ocupa três vezes a
 * altura do rótulo e não divide a atenção com mais nada — é isso que faz
 * uma grade de KPIs parecer um painel caro em vez de uma tabela com
 * molduras. Aqui: rótulo 12px/n-500, número em `text-h1` peso 700 com
 * tracking fechado, e o resto se cala.
 *
 * ⚠️ `icon` continua na assinatura e NÃO é renderizado. É proposital:
 * dezenas de call sites passam um ícone, e removê-los todos de uma vez
 * seria um diff impossível de revisar. O motivo de o ícone sair veio do
 * diagnóstico da tela de financeiro — oito cards, cada um com seu
 * iconezinho num quadradinho cinza no canto: o rótulo "Ticket médio" já
 * diz o que o cifrãozinho diria.
 *
 * Quando há `href`, o card ganha o botão redondo com a seta ↗ no canto
 * superior direito — o affordance de "isto abre" das referências, que
 * também dá ao card um segundo ponto de ancoragem visual.
 */
export const StatCard: React.FC<StatCardProps> = ({
  label, value, hint, accent, href, className = '',
}) => {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-caption font-medium text-n-500 leading-snug">{label}</span>
        {href && (
          <span
            className="icon-chip h-8 w-8 shrink-0 transition-ui group-hover/stat:bg-ink-surface group-hover/stat:text-white"
            aria-hidden
          >
            <ArrowUpRight className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className={`num text-h1 font-bold mt-4 leading-none ${accent ? 'text-wine-700' : 'text-heading'}`}>
        {value}
      </p>
      {hint && <span className="text-caption text-n-500 mt-2">{hint}</span>}
    </>
  );

  const shell =
    'card card-interactive group/stat p-5 sm:p-6 flex flex-col focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700';

  return href ? (
    <Link href={href} className={`${shell} ${className}`}>{body}</Link>
  ) : (
    <div className={`card p-5 sm:p-6 flex flex-col ${className}`}>{body}</div>
  );
};

export default StatCard;

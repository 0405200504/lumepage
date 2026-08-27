import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { IconChip } from './IconChip';

interface StatCardProps {
  label: string;
  /** Já formatado. Quem anima é o CountUp, quando fizer sentido. */
  value: React.ReactNode;
  hint?: string;
  /** Ícone lucide 20px. Se o rótulo já diz tudo, NÃO passe ícone. */
  icon?: React.ReactNode;
  /** Chip em vinho — reservado à métrica que exige ação. */
  accent?: boolean;
  href?: string;
  className?: string;
}

/**
 * Card de métrica. Hierarquia por peso e cor, não por tamanho: são só
 * dois tamanhos de fonte aqui (o número e o resto).
 */
export const StatCard: React.FC<StatCardProps> = ({
  label, value, hint, icon, accent, href, className = '',
}) => {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-caption text-n-600">{label}</span>
        {icon && <IconChip accent={accent}>{icon}</IconChip>}
      </div>
      <p className="num text-h1 font-semibold text-heading mt-3 leading-none">{value}</p>
      {hint && (
        <span className="text-caption text-n-500 mt-2 flex items-center gap-1">
          {hint}
          {href && <ArrowUpRight className="h-4 w-4" aria-hidden />}
        </span>
      )}
    </>
  );

  const shell = 'card card-interactive p-5 sm:p-6 flex flex-col focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600';

  return href ? (
    <Link href={href} className={`${shell} ${className}`}>{body}</Link>
  ) : (
    <div className={`card p-5 sm:p-6 flex flex-col ${className}`}>{body}</div>
  );
};

export default StatCard;

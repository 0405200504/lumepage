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
 * Card de métrica.
 *
 * ⚠️ `icon` continua na assinatura e NÃO é mais renderizado. É proposital:
 * dezenas de call sites passam um ícone, e removê-los todos de uma vez
 * seria um diff impossível de revisar. O motivo de o ícone sair é o
 * diagnóstico da tela de financeiro — oito cards, cada um com seu
 * iconezinho num quadradinho cinza no canto: o rótulo "Ticket médio" já
 * diz o que o cifrãozinho diria, então o ícone não informa, só repete
 * ruído oito vezes e rouba a atenção do número. No lugar dele entrou o
 * rótulo em mono, que carrega a mesma função de "etiqueta" e ainda
 * comunica a temperatura técnica.
 *
 * Hierarquia por peso e cor, dois tamanhos de fonte: o número e o resto.
 */
export const StatCard: React.FC<StatCardProps> = ({
  label, value, hint, accent, href, className = '',
}) => {
  const body = (
    <>
      <span className="mono-micro text-n-500">{label}</span>
      <p className={`num text-h1 font-semibold mt-2.5 leading-none ${accent ? 'text-wine-700' : 'text-heading'}`}>
        {value}
      </p>
      {hint && (
        <span className="text-caption text-n-500 mt-2 flex items-center gap-1">
          {hint}
          {href && <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />}
        </span>
      )}
    </>
  );

  const shell =
    'card card-interactive p-4 sm:p-5 flex flex-col focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700';

  return href ? (
    <Link href={href} className={`${shell} ${className}`}>{body}</Link>
  ) : (
    <div className={`card p-4 sm:p-5 flex flex-col ${className}`}>{body}</div>
  );
};

export default StatCard;

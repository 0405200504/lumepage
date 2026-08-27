import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** ⚠️ Ignorado de propósito — veja a nota abaixo. */
  icon?: React.ReactNode;
  /** ações à direita (botões, export, etc.) */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Cabeçalho de seção: micro-label em mono, divisória de ponta a ponta.
 *
 * ⚠️ `icon` continua na assinatura e NÃO é renderizado. Cinco telas passam
 * um ícone lucide de 16px à esquerda do título — "DRE simplificado" com uma
 * calculadorinha, "Extrato do mês" com um recibinho. O ícone repetia a
 * palavra que estava logo ao lado, e empilhado seis vezes numa tela de
 * financeiro virava exatamente o ruído que o diagnóstico apontou. O rótulo
 * em mono cumpre a função de etiqueta e ainda carrega a temperatura técnica.
 *
 * O título desceu de `body` bold para o micro-label: dentro de um card, a
 * seção não precisa competir com o número que ela apresenta.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title, subtitle, actions, className = '',
}) => (
  <div className={`flex items-start justify-between gap-3 ${className}`}>
    <div className="min-w-0">
      <h3 className="mono-micro text-n-900 truncate">{title}</h3>
      {subtitle && <p className="text-caption text-n-500 mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
  </div>
);

export default SectionHeader;

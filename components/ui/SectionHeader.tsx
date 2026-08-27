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
 * Cabeçalho de seção: título em 18px, subtítulo em 12px cinza.
 *
 * O título ERA um micro-label em caixa alta ("DRE SIMPLIFICADO"). Numa
 * tela de financeiro com seis seções, seis linhas gritadas em caixa alta
 * é o que faz a interface parecer terminal — e nas referências o título
 * de bloco é sempre uma frase normal, no tamanho de um subtítulo. É a
 * troca mais barata entre "amador" e "produto".
 *
 * ⚠️ `icon` continua na assinatura e NÃO é renderizado. Cinco telas passam
 * um ícone lucide de 16px à esquerda do título — "DRE simplificado" com uma
 * calculadorinha, "Extrato do mês" com um recibinho. O ícone repetia a
 * palavra que estava logo ao lado, e empilhado seis vezes numa tela de
 * financeiro virava exatamente o ruído que o diagnóstico apontou. O rótulo
 * em mono cumpre a função de etiqueta e ainda carrega a temperatura técnica.
 *
 * Dentro de um card, a seção não deve competir com o número que ela
 * apresenta: por isso 18px/600, e não o `h2` da página.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title, subtitle, actions, className = '',
}) => (
  <div className={`flex items-start justify-between gap-3 ${className}`}>
    <div className="min-w-0">
      <h3 className="text-h3 text-heading truncate">{title}</h3>
      {subtitle && <p className="text-caption text-n-500 mt-1.5">{subtitle}</p>}
    </div>
    {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
  </div>
);

export default SectionHeader;

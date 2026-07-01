import React from 'react';

interface IconBadgeProps {
  icon: React.ReactNode;
  /** 'solid' = círculo bordô sólido + ícone branco (ações primárias/FAB/IA).
   *  'soft'  = círculo bordô bem claro + ícone bordô (destaque sutil).
   *  'muted' = círculo neutro + ícone cinza (apoio). */
  variant?: 'solid' | 'soft' | 'muted';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

/** Selo de ícone circular — padroniza o "círculo sólido bordô" da referência.
 *  Use `solid` só onde a cor é destaque (primário/FAB/IA); o resto fica `muted`. */
export const IconBadge: React.FC<IconBadgeProps> = ({ icon, variant = 'solid', size = 'md', className = '' }) => {
  const base = 'inline-flex items-center justify-center rounded-full shrink-0';
  const tone =
    variant === 'solid' ? 'surface-wine text-white shadow-soft ring-hairline'
    : variant === 'soft' ? 'bg-[color:var(--color-accent-soft)] text-forest ring-1 ring-[color:var(--color-accent-soft-border)]'
    : 'bg-surface-2 text-gray-450';
  return <span className={`${base} ${SIZES[size]} ${tone} ${className}`}>{icon}</span>;
};

export default IconBadge;

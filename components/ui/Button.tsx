'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Só ícone: vira quadrado e exige `aria-label`. */
  iconOnly?: boolean;
  /** Ícone à esquerda do rótulo (componente lucide, 16/20/24). */
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Botão único do produto. Todos os estados vivem aqui — repouso, hover,
 * :active, :focus-visible, disabled e loading — para que nenhuma tela
 * remonte um botão com estilo inline e esqueça metade deles.
 *
 * `destructive` usa --color-danger (laranja-avermelhado), NUNCA a escala
 * wine-*: num produto de marca vinho, destrutivo em vermelho-escuro fica
 * indistinguível do primário e a profissional cancela achando que confirma.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-wine-700 text-white shadow-wine hover:bg-wine-800 active:bg-wine-800 disabled:bg-wine-700',
  secondary:
    'bg-surface text-heading border border-line shadow-xs hover:bg-n-50 hover:border-line-strong',
  ghost:
    'bg-transparent text-muted hover:bg-n-100 hover:text-heading',
  destructive:
    'bg-danger-bg text-danger border border-danger-border hover:bg-danger hover:text-white hover:border-danger',
};

/** Alvo de toque nunca abaixo de 44px de altura efetiva no mobile. */
const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-caption gap-1.5 rounded-chip',
  md: 'h-11 px-4 text-label gap-2 rounded-control',
  lg: 'h-12 px-5 text-body-sm gap-2 rounded-control',
};

const ICON_SIZES: Record<Size, string> = {
  sm: 'h-9 w-9 rounded-chip',
  md: 'h-11 w-11 rounded-control',
  lg: 'h-12 w-12 rounded-control',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    iconOnly = false,
    leadingIcon,
    trailingIcon,
    disabled,
    className = '',
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      disabled={isDisabled}
      data-loading={loading || undefined}
      className={[
        'inline-flex items-center justify-center font-semibold select-none',
        'transition-ui active:scale-[0.97]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600',
        'disabled:opacity-50 disabled:pointer-events-none',
        iconOnly ? ICON_SIZES[size] : SIZES[size],
        VARIANTS[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        leadingIcon
      )}
      {!iconOnly && children}
      {!loading && trailingIcon}
    </button>
  );
});

export default Button;

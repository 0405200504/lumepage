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
  /** Ícone lucide 14/18/22 — a escala nova. */
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Botão único do produto. Todos os estados vivem aqui — repouso, hover,
 * :active, :focus-visible, disabled e loading — para que nenhuma tela
 * remonte um botão com estilo inline e esqueça metade deles.
 *
 * O primário leva o CHANFRO: canto inferior direito cortado a 45°. Como
 * ele é de fundo chapado, o `clip-path` não tem borda para comer — o corte
 * sai limpo com uma classe só. É a assinatura aparecendo no elemento mais
 * repetido da interface.
 *
 * O primário também perdeu o halo vinho (`shadow-wine`, hoje neutralizado):
 * um botão de marca chapado sobre branco já é o elemento mais forte da tela.
 *
 * `destructive` usa --color-danger (laranja-avermelhado), NUNCA a escala
 * wine-*: num produto de marca vinho, destrutivo em vermelho-escuro fica
 * indistinguível do primário e a profissional cancela achando que confirma.
 * Ele também perdeu o fundo pastel — virou hairline + texto, como o resto.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-wine-700 text-white hover:bg-wine-800 active:bg-wine-800 disabled:bg-wine-700 chamfer-s',
  secondary:
    'bg-surface text-heading border border-line hover:bg-n-50 hover:border-line-strong',
  ghost:
    'bg-transparent text-n-600 hover:bg-n-100 hover:text-heading',
  destructive:
    'bg-surface text-danger border border-danger/40 hover:bg-danger hover:text-white hover:border-danger',
};

/**
 * Alvo de toque nunca abaixo de 44px no MOBILE.
 *
 * `sm` existe para densidade — ação dentro de uma linha de tabela, no
 * desktop, onde o cursor tem precisão de pixel. No celular esse mesmo botão
 * vira um alvo de 36px, e 36px é onde o dedo erra. A resposta não é abandonar
 * o `sm`: é fazer ele valer 44px abaixo de `sm:` e encolher para 36 a partir
 * daí. Assim uma tabela densa continua densa no desktop e continua tocável no
 * celular, sem que nenhuma tela precise saber disso.
 */
const SIZES: Record<Size, string> = {
  sm: 'h-11 sm:h-9 px-3 text-caption gap-1.5 rounded-chip',
  md: 'h-11 px-4 text-body-sm gap-2 rounded-chip',
  lg: 'h-12 px-5 text-body gap-2 rounded-chip',
};

const ICON_SIZES: Record<Size, string> = {
  sm: 'h-11 w-11 sm:h-9 sm:w-9 rounded-chip',
  md: 'h-11 w-11 rounded-chip',
  lg: 'h-12 w-12 rounded-chip',
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
        'transition-ui active:scale-[0.98]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700',
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
      {/* Com `iconOnly`, o padrão do produto é passar o ícone em `leadingIcon`
          e usar `children` para o rótulo textual que fica escondido. Mas
          `<Button iconOnly><Icon/></Button>` é a forma que qualquer um escreve
          primeiro — e ela renderizava um botão VAZIO, sem erro nenhum. Agora as
          duas funcionam: children só é descartado quando já existe um
          `leadingIcon` para desenhar. */}
      {(!iconOnly || !leadingIcon) && children}
      {!loading && trailingIcon}
    </button>
  );
});

export default Button;

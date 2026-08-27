'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'ink';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Só ícone: vira círculo e exige `aria-label`. */
  iconOnly?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Botão único do produto. Todos os estados vivem aqui — repouso, hover,
 * :active, :focus-visible, disabled e loading — para que nenhuma tela
 * remonte um botão com estilo inline e esqueça metade deles.
 *
 * FORMA: pílula. É a decisão mais visível da rodada 4 e a que mais aproxima
 * o produto das referências. O retângulo de raio 6 da rodada anterior era
 * correto e sem graça; a pílula lê como software contemporâneo e, num
 * produto usado majoritariamente por mulheres numa cadeira de atendimento,
 * também lê como convite em vez de formulário.
 *
 * `secondary` é branco com contorno claro — ele precisa existir SOBRE card
 * branco e sobre o fundo cinza, então não pode ser cinza-preenchido.
 * `ghost` é o contrário: sem fundo em repouso, cinza-claro no hover.
 * `ink` é o botão preto das referências: ação neutra de alto contraste
 * (Exportar, Ver relatório) que não gasta a cor da marca.
 *
 * `destructive` usa --color-danger (laranja-avermelhado), NUNCA a escala
 * wine-*: num produto de marca vinho, destrutivo em vermelho-escuro fica
 * indistinguível do primário e a profissional cancela achando que confirma.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-wine-700 text-white shadow-[var(--shadow-wine)] hover:bg-wine-800 active:bg-wine-800 disabled:bg-wine-700 disabled:shadow-none',
  secondary:
    'bg-surface text-heading ring-1 ring-inset ring-line-strong/70 shadow-[var(--shadow-xs)] hover:ring-line-strong hover:bg-n-25',
  ghost:
    'bg-transparent text-n-600 hover:bg-n-100 hover:text-heading',
  destructive:
    'bg-danger-bg text-danger ring-1 ring-inset ring-danger-border hover:bg-danger hover:text-white hover:ring-danger',
  ink:
    'bg-ink-surface text-white hover:bg-ink-surface-hover shadow-[var(--shadow-xs)]',
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
  sm: 'h-11 sm:h-9 px-3.5 text-caption gap-1.5',
  md: 'h-11 px-5 text-body-sm gap-2',
  lg: 'h-13 px-6 text-body gap-2.5',
};

const ICON_SIZES: Record<Size, string> = {
  sm: 'h-11 w-11 sm:h-9 sm:w-9',
  md: 'h-11 w-11',
  lg: 'h-13 w-13',
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
        'inline-flex items-center justify-center font-semibold select-none rounded-full',
        'tracking-[-0.01em] transition-ui active:scale-[0.97]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700',
        'disabled:opacity-45 disabled:pointer-events-none',
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

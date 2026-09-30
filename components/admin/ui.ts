/**
 * CLASSES COMPARTILHADAS DO ADMIN
 * -------------------------------
 * O admin tinha cada botão montado à mão, com o retângulo de raio 12 e borda
 * cinza da rodada anterior — enquanto o painel da profissional já falava em
 * pílula, campo preenchido e sombra difusa. Aqui está o vocabulário único:
 * server components (que não podem importar <Button>) e client components
 * usam as MESMAS strings, e nenhuma tela inventa um botão novo.
 */

export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] whitespace-nowrap select-none ' +
  'transition-ui active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 ' +
  'disabled:opacity-45 disabled:pointer-events-none';

const SIZE = {
  xs: 'h-8 px-3 text-caption',
  sm: 'h-9 px-3.5 text-caption',
  md: 'h-10 px-4 text-body-sm',
} as const;

const VARIANT = {
  primary: 'bg-wine-700 text-white shadow-[var(--shadow-wine)] hover:bg-wine-800',
  secondary: 'bg-surface text-heading ring-1 ring-inset ring-line-strong/70 shadow-[var(--shadow-xs)] hover:bg-n-25 hover:ring-line-strong',
  soft: 'bg-surface-2 text-heading hover:bg-n-150',
  ghost: 'bg-transparent text-n-600 hover:bg-n-100 hover:text-heading',
  ink: 'bg-ink-surface text-white hover:bg-ink-surface-hover shadow-[var(--shadow-xs)]',
  danger: 'bg-danger-bg text-danger ring-1 ring-inset ring-danger-border hover:bg-danger hover:text-white hover:ring-danger',
  dangerGhost: 'bg-transparent text-danger hover:bg-danger-bg',
  success: 'bg-success-bg text-success hover:bg-success hover:text-white',
} as const;

export type ButtonVariant = keyof typeof VARIANT;
export type ButtonSize = keyof typeof SIZE;

/** `className` de um botão ou link-botão. */
export const button = (variant: ButtonVariant = 'secondary', size: ButtonSize = 'sm', extra?: string) =>
  cx(BASE, SIZE[size], VARIANT[variant], extra);

/** Disco de ícone (36px) — o `icon-chip` do produto, com foco. */
export const iconButton = 'icon-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700';

/** Campo de formulário preenchido, 40px. */
export const field = 'field-input h-10 text-body-sm';
export const fieldSm = 'field-input h-9 text-caption';
export const fieldLabel = 'block text-caption font-semibold text-n-600 mb-1.5';

/** Link discreto de ação dentro de texto ("ver tudo", "editar catálogo"). */
export const textLink = 'text-caption font-semibold text-accent-link hover:underline underline-offset-2';

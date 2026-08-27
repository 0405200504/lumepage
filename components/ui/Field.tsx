'use client';

import React, { useId } from 'react';

/**
 * ARQUÉTIPO 4 · FORMULÁRIO.
 *
 * Label em mono 10px caixa alta ACIMA do campo (não flutuando dentro, não
 * à esquerda), campo de 40px com raio 6 e hairline, foco = borda vinho +
 * anel de 2px, erro em --danger com o texto abaixo. O label em mono é o
 * que faz um formulário longo — a anamnese, os ajustes — ler como ficha
 * técnica em vez de cadastro de newsletter.
 */
export const Field: React.FC<{
  label: string;
  /** Texto de apoio abaixo do rótulo. Some quando há erro. */
  hint?: string;
  error?: string;
  required?: boolean;
  children?: React.ReactNode;
  className?: string;
  /** Renderiza um <input> pronto quando não vem `children`. */
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}> = ({ label, hint, error, required, children, className = '', inputProps }) => {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mono-micro text-n-500 block mb-1.5">
        {label}
        {required && <span className="text-danger ml-1" aria-hidden>*</span>}
      </label>
      {children ?? (
        <input
          id={id}
          className="field-input"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          required={required}
          {...inputProps}
        />
      )}
      {error ? (
        <p id={`${id}-err`} className="mt-1.5 text-caption text-danger">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-caption text-n-500">{hint}</p>
      ) : null}
    </div>
  );
};

/**
 * Seção de formulário/configuração (arquétipo 6).
 * Separada da anterior por hairline de ponta a ponta — nunca por um card
 * dentro de outro card, que é o que faz a tela de ajustes parecer uma
 * pilha de caixas.
 */
export const SettingsSection: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, description, children, className = '' }) => (
  /* -mx-4/-mx-5 + px de volta: a divisória atravessa o padding do card e
     encosta nas duas bordas. Linha que para antes da borda não estrutura. */
  <section className={`settings-section -mx-4 sm:-mx-5 px-4 sm:px-5 py-6 first:pt-0 last:pb-0 ${className}`}>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_1fr] lg:gap-8">
      <div className="min-w-0">
        <h2 className="mono-micro text-n-900">{title}</h2>
        {description && <p className="mt-1.5 text-caption text-n-600">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  </section>
);

/**
 * Interruptor. Retangular, como todo o resto — o trilho de raio total era
 * o último `rounded-full` que não era avatar nem ponto de status.
 */
export const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}> = ({ checked, onChange, label, disabled, className = '' }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-badge border transition-ui
      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700
      disabled:opacity-40 disabled:pointer-events-none
      ${checked ? 'bg-wine-700 border-wine-700' : 'bg-n-100 border-line'} ${className}`}
  >
    <span
      aria-hidden
      className={`block h-4 w-4 rounded-[3px] bg-n-0 transition-transform duration-[var(--dur-fast)] ease-[var(--ease-out)]
        ${checked ? 'translate-x-6' : 'translate-x-1'}`}
    />
  </button>
);

export default Field;

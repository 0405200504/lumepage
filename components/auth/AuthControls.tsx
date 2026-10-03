'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Peças das três abas da entrada (components/auth/AuthCard). Estilos em
 * app/globals.css (.auth-field, .auth-btn-*).
 */

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'placeholder'> & {
  id: string;
  /** Vira o placeholder e o <label> do leitor de tela — sem rótulo visível. */
  label: string;
};

export function AuthInput({ id, label, className = '', ...rest }: InputProps) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">{label}</label>
      <input id={id} placeholder={label} className={`auth-field ${className}`} {...rest} />
    </div>
  );
}

export function PasswordInput({ id, label, ...rest }: Omit<InputProps, 'type'>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{label}</label>
      <input id={id} type={show ? 'text' : 'password'} placeholder={label} className="auth-field pr-12" {...rest} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Esconder senha' : 'Mostrar senha'}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[12px] text-white/40 hover:text-white/80 transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/** Título e linha de apoio de cada aba. */
export function PanelHead({ title, subtitle }: { title: string; subtitle: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-[22px] sm:text-2xl font-semibold tracking-tight text-white">{title}</h1>
      <p className="mt-1.5 text-body-sm text-white/55">{subtitle}</p>
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3" aria-hidden>
      <span className="h-px flex-1 bg-white/10" />
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">ou</span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

/** Link de texto que troca de aba ("Já tem conta? Entrar"). */
export function SwitchLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-medium text-white/85 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white/60 transition-colors"
    >
      {children}
    </button>
  );
}

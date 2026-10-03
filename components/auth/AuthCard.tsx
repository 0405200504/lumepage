'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LoginVideoBackground } from '@/components/auth/LoginVideoBackground';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm, type RegisterContext } from '@/components/auth/RegisterForm';
import { RecoverForm } from '@/components/auth/RecoverForm';

export type AuthTab = 'entrar' | 'criar' | 'recuperar';

/** O que cada aba recebe do cartão. */
export interface AuthPanelProps {
  /** E-mail compartilhado entre as abas. */
  email: string;
  onEmailChange: (email: string) => void;
  onSwitch: (tab: AuthTab) => void;
}

const TABS: { id: AuthTab; label: React.ReactNode; path: string }[] = [
  { id: 'entrar', label: 'Entrar', path: '/login' },
  { id: 'criar', label: 'Criar conta', path: '/register' },
  // Abaixo de 380px as três abas não cabem com "senha".
  { id: 'recuperar', label: <>Recuperar<span className="hidden min-[380px]:inline"> senha</span></>, path: '/redefinir-senha' },
];

/**
 * ENTRADA DA LUME — login, cadastro e recuperar senha num cartão só, em abas,
 * sobre o vídeo de cetim.
 *
 * Os três endereços continuam valendo (/login, /register, /redefinir-senha):
 * cada um abre o cartão na sua aba. Trocar de aba não navega — o vídeo segue
 * tocando e nada pisca —, só reescreve a URL (replaceState) para um
 * recarregar cair na mesma aba. A query de chegada (?plano=, ?email=&c= do
 * cadastro) só volta junto com a aba em que a pessoa chegou.
 */
export function AuthCard({ initialTab, register }: { initialTab: AuthTab; register?: RegisterContext }) {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  // Quem errou a senha e foi para "Recuperar senha" não digita o e-mail de novo.
  const [email, setEmail] = useState(register?.initialEmail ?? '');
  const arrivalQuery = useRef('');
  useEffect(() => {
    arrivalQuery.current = window.location.search;
  }, []);

  const go = useCallback(
    (next: AuthTab) => {
      setTab(next);
      const path = TABS.find((t) => t.id === next)!.path;
      window.history.replaceState(null, '', path + (next === initialTab ? arrivalQuery.current : ''));
    },
    [initialTab],
  );

  const panel: AuthPanelProps = { email, onEmailChange: setEmail, onSwitch: go };

  return (
    <div className="relative flex min-h-screen min-h-dvh flex-col items-center justify-center px-4 py-8 select-none">
      <LoginVideoBackground />

      <main className="auth-card auth-card-in relative z-10 w-full max-w-[440px] rounded-[28px] p-5 sm:p-8">
        <AuthTabs tab={tab} onChange={go} />

        {/* Marca fixa entre as abas e o conteúdo: não pisca na troca. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="Lume" width={40} height={40} className="mt-7 h-10 w-10 rounded-[12px]" />

        <div
          key={tab}
          role="tabpanel"
          id={`auth-painel-${tab}`}
          aria-labelledby={`auth-aba-${tab}`}
          className="auth-panel-in mt-5"
        >
          {tab === 'entrar' && <LoginForm {...panel} />}
          {tab === 'criar' && <RegisterForm {...panel} context={register} />}
          {tab === 'recuperar' && <RecoverForm {...panel} />}
        </div>
      </main>
    </div>
  );
}

/**
 * Abas em pílula. O fundo da aba ativa é um elemento só, que desliza até a
 * aba clicada; antes de medir (HTML do servidor), a própria aba ativa pinta o
 * fundo, no mesmo lugar — a troca não aparece.
 */
function AuthTabs({ tab, onChange }: { tab: AuthTab; onChange: (tab: AuthTab) => void }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const el = list.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
      if (el) setPill({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    // A fonte chega depois do primeiro desenho e muda a largura das abas.
    const ro = new ResizeObserver(measure);
    list.querySelectorAll('[role="tab"]').forEach((b) => ro.observe(b));
    return () => ro.disconnect();
  }, [tab]);

  // Setas do teclado andam entre as abas (padrão de tablist).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length].id;
    onChange(next);
    listRef.current?.querySelector<HTMLElement>(`[data-tab="${next}"]`)?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Acesso à Lume"
      onKeyDown={onKeyDown}
      className="relative flex w-full sm:w-fit rounded-full bg-[#0a0a0a] p-1"
    >
      {pill && (
        <span
          aria-hidden
          className="auth-tab-pill absolute inset-y-1 left-0 rounded-full bg-[#2a2a2a]"
          style={{ width: pill.w, transform: `translateX(${pill.x}px)` }}
        />
      )}
      {TABS.map((t) => {
        const active = t.id === tab;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`auth-aba-${t.id}`}
            aria-selected={active}
            aria-controls={`auth-painel-${t.id}`}
            tabIndex={active ? 0 : -1}
            data-tab={t.id}
            onClick={() => onChange(t.id)}
            className={`relative z-[1] h-9 flex-auto sm:flex-none whitespace-nowrap rounded-full px-2.5 sm:px-4 text-[13px] sm:text-sm transition-colors ${
              active ? 'text-white' : 'text-white/50 hover:text-white/80'
            } ${active && !pill ? 'bg-[#2a2a2a]' : ''}`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export default AuthCard;

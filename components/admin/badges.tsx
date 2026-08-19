import React from 'react';
import { accountState, AccountStateInput } from '@/lib/admin/account-state';

/** Selos compartilhados pelas telas do admin. Um vocabulário visual só. */

type Tone = 'ok' | 'warn' | 'bad' | 'neutral' | 'accent';

/* Trio bg / border / text por tom — os mesmos tokens em claro e em escuro.
   Raio de 2px: badge e input compartilham o valor mais fechado da escala; o pill
   arredondado saiu junto com o resto do vocabulário de "template SaaS". */
const TONE: Record<Tone, string> = {
  ok: 'bg-[color:var(--ok-bg)] text-[color:var(--ok-ink)] border-[color:var(--ok-edge)]',
  warn: 'bg-[color:var(--warn-bg)] text-[color:var(--warn-ink)] border-[color:var(--warn-edge)]',
  bad: 'bg-[color:var(--bad-bg)] text-[color:var(--bad-ink)] border-[color:var(--bad-edge)]',
  neutral: 'bg-transparent text-[color:var(--ink-muted)] border-[color:var(--rule-strong)]',
  accent: 'bg-[color:var(--accent-tint)] text-[color:var(--color-accent-link)] border-[color:var(--accent-edge)]',
};

export function Badge({ tone = 'neutral', children, title }: { tone?: Tone; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 px-1.5 py-px rounded-[2px] text-[11px] font-medium border whitespace-nowrap ${TONE[tone]}`}>
      {children}
    </span>
  );
}

/**
 * ESTADO DA CONTA — o único selo colorido da linha.
 *
 * Antes eram três informações espremidas num pill só ("Legada · teste · 41d") e mais
 * um pill de `professionals.status` que podia contradizê-lo ("Ativa" ao lado de
 * "vencido há 41 dias"). Agora:
 *   estado  → este selo, colorido, derivado de lib/admin/account-state.ts
 *   plano   → <PlanBadge>, neutro, sem cor
 *   prazo   → <DeadlineText>, texto secundário
 */
export function AccountStateBadge({ account }: { account: AccountStateInput }) {
  const s = accountState(account);
  return <Badge tone={s.tone} title={s.deadline ?? undefined}>{s.label}</Badge>;
}

/** Compatibilidade: recebe a linha inteira, não só `status`. */
export function AccountStatusBadge({ account }: { account: AccountStateInput }) {
  return <AccountStateBadge account={account} />;
}

/** Prazo como texto secundário — sem cor, porque cor já é o estado. */
export function DeadlineText({ account }: { account: AccountStateInput }) {
  const s = accountState(account);
  if (!s.deadlineLabel) return null;
  return (
    <span className="text-[11px] text-muted tabular-nums whitespace-nowrap" title={s.deadline ?? undefined}>
      {s.deadlineLabel}
    </span>
  );
}

/** Estado + plano + prazo, na ordem certa e com um só ponto de cor. */
export function AccountStateGroup({ account }: { account: AccountStateInput }) {
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <AccountStateBadge account={account} />
      <PlanBadge plan={account.subscription_plan ?? null} />
      <DeadlineText account={account} />
    </span>
  );
}

const APPT_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'Pendente', tone: 'warn' },
  confirmed: { label: 'Confirmado', tone: 'accent' },
  completed: { label: 'Finalizado', tone: 'ok' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
  no_show: { label: 'Falta', tone: 'bad' },
};

export function AppointmentStatusBadge({ status }: { status: string }) {
  const meta = APPT_STATUS[status] ?? { label: status, tone: 'neutral' as Tone };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export const PLAN_LABEL: Record<string, string> = {
  start: 'Start', pro: 'Pro', premium: 'Premium',
};

/**
 * Só o plano, sempre neutro. "Legada" é conta anterior ao marco de assinatura:
 * acesso cheio sem plano atribuído — não é erro de dado, e por isso não é alerta.
 * Prazo e situação saíram daqui: viraram <DeadlineText> e <AccountStateBadge>.
 */
export function PlanBadge({ plan }: { plan: string | null }) {
  return <Badge tone="neutral">{plan ? PLAN_LABEL[plan] ?? plan : 'Legada'}</Badge>;
}

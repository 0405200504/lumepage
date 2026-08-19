import React from 'react';
import { accountState, AccountStateInput } from '@/lib/admin/account-state';

/** Selos compartilhados pelas telas do admin. Um vocabulário visual só. */

type Tone = 'ok' | 'warn' | 'bad' | 'neutral' | 'accent';

/* Pills — os mesmos do painel da profissional: fundo em 10% do tom, texto no tom
   cheio e anel de 1px. */
const TONE: Record<Tone, string> = {
  ok: 'bg-[color:var(--color-ok)]/10 text-[color:var(--color-ok)] ring-[color:var(--color-ok)]/20',
  warn: 'bg-[color:var(--color-warn)]/10 text-[color:var(--color-warn)] ring-[color:var(--color-warn)]/20',
  bad: 'bg-[color:var(--color-bad)]/10 text-[color:var(--color-bad)] ring-[color:var(--color-bad)]/20',
  neutral: 'bg-surface-2 text-muted ring-line',
  accent: 'bg-accent-soft text-accent-link ring-accent-soft-border',
};

export function Badge({ tone = 'neutral', children, title }: { tone?: Tone; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ring-1 whitespace-nowrap ${TONE[tone]}`}>
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

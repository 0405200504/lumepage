import React from 'react';
import { accountState, AccountStateInput } from '@/lib/admin/account-state';

/**
 * Selos do admin. Pílula de fundo suave com ponto colorido — o mesmo desenho do
 * StatusLabel do painel da profissional. O anel de 1px saiu: contorno em volta
 * de um selo de 24px só existe para dizer que existe.
 */

type Tone = 'ok' | 'warn' | 'bad' | 'neutral' | 'accent' | 'info';

const TONE: Record<Tone, string> = {
  ok: 'bg-success-bg text-success',
  warn: 'bg-warning-bg text-warning',
  bad: 'bg-danger-bg text-danger',
  neutral: 'bg-n-100 text-n-600',
  accent: 'bg-accent-soft text-accent-link',
  info: 'bg-info-bg text-info',
};

export function Badge({ tone = 'neutral', children, title, dot, className = '' }: {
  tone?: Tone; children: React.ReactNode; title?: string;
  /** Ponto à esquerda. Por padrão só nos tons de estado (ok/warn/bad). */
  dot?: boolean; className?: string;
}) {
  const showDot = dot ?? (tone === 'ok' || tone === 'warn' || tone === 'bad');
  return (
    <span title={title} className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-caption font-semibold whitespace-nowrap ${TONE[tone]} ${className}`}>
      {showDot && <span className="status-dot" aria-hidden />}
      {children}
    </span>
  );
}

/**
 * ESTADO DA CONTA — o único selo colorido da linha. Derivado de
 * lib/admin/account-state.ts, a fonte única.
 */
export function AccountStateBadge({ account }: { account: AccountStateInput }) {
  const s = accountState(account);
  return <Badge tone={s.tone} title={s.deadline ?? undefined}>{s.label}</Badge>;
}

/** Compatibilidade. */
export function AccountStatusBadge({ account }: { account: AccountStateInput }) {
  return <AccountStateBadge account={account} />;
}

/** Prazo como texto secundário — sem cor, porque cor já é o estado. */
export function DeadlineText({ account }: { account: AccountStateInput }) {
  const s = accountState(account);
  if (!s.deadlineLabel) return null;
  return (
    <span className="text-caption text-n-500 num whitespace-nowrap" title={s.deadline ?? undefined}>
      {s.deadlineLabel}
    </span>
  );
}

/** Estado + plano + prazo, com um só ponto de cor. */
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
  confirmed: { label: 'Confirmado', tone: 'info' },
  completed: { label: 'Finalizado', tone: 'ok' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
  no_show: { label: 'Falta', tone: 'bad' },
};

export function AppointmentStatusBadge({ status }: { status: string }) {
  const meta = APPT_STATUS[status] ?? { label: status, tone: 'neutral' as Tone };
  return <Badge tone={meta.tone} dot>{meta.label}</Badge>;
}

export const PLAN_LABEL: Record<string, string> = { start: 'Start', pro: 'Pro', premium: 'Premium' };

/** Só o plano, sempre neutro. "Legada" = conta anterior ao marco de assinatura. */
export function PlanBadge({ plan }: { plan: string | null }) {
  return <Badge tone="neutral">{plan ? PLAN_LABEL[plan] ?? plan : 'Legada'}</Badge>;
}

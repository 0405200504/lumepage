import React from 'react';

/** Selos compartilhados pelas telas do admin. Um vocabulário visual só. */

type Tone = 'ok' | 'warn' | 'bad' | 'neutral' | 'accent';

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

const ACCOUNT_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'Ativa', tone: 'ok' },
  paused: { label: 'Pausada', tone: 'warn' },
  cancelled: { label: 'Cancelada', tone: 'bad' },
};

export function AccountStatusBadge({ status }: { status: string }) {
  const meta = ACCOUNT_STATUS[status] ?? { label: status, tone: 'neutral' as Tone };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
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
 * Plano + prazo em um selo só. "Legada" é conta anterior ao marco de assinatura:
 * acesso cheio sem plano atribuído — não é erro de dado.
 */
export function PlanBadge({ plan, status, endsAt, trialEndsAt }: {
  plan: string | null; status: string | null; endsAt: string | null; trialEndsAt: string | null;
}) {
  const label = plan ? PLAN_LABEL[plan] ?? plan : 'Legada';
  const deadline = endsAt || trialEndsAt;
  // Server Component: cada request tem seu "agora", então ler o relógio aqui é
  // legítimo (não há hidratação a divergir). O lint não distingue os dois mundos.
  // eslint-disable-next-line react-hooks/purity
  const days = deadline ? Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000) : null;

  let tone: Tone = plan ? 'accent' : 'neutral';
  let suffix = '';
  if (status === 'trialing') { suffix = days !== null ? ` · teste ${days}d` : ' · teste'; tone = days !== null && days <= 3 ? 'warn' : 'accent'; }
  else if (days !== null && days < 0) { suffix = ` · vencido ${Math.abs(days)}d`; tone = 'bad'; }
  else if (days !== null && days <= 7) { suffix = ` · vence ${days}d`; tone = 'warn'; }
  else if (status === 'past_due') { suffix = ' · inadimplente'; tone = 'bad'; }
  else if (status === 'canceled') { suffix = ' · cancelada'; tone = 'neutral'; }

  return <Badge tone={tone} title={deadline ?? undefined}>{label}{suffix}</Badge>;
}

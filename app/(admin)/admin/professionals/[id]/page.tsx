import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ExternalLink, CheckCircle2, Circle, AlertTriangle, Bot, MessageCircle, TrendingUp,
} from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { EditProfessionalPanel } from '@/components/admin/EditProfessionalPanel';
import { ProfessionalActions } from '@/components/admin/ProfessionalActions';
import { AccountStatusBadge, PlanBadge, Badge } from '@/components/admin/badges';
import { getProfessionalOverview, getSubscriptionHistory } from '@/lib/admin/professional-detail';
import { readAuditLog } from '@/lib/audit';
import { brl, formatDateBR, formatDateTimeBR, formatTimeBR, pct } from '@/lib/format';
import { AppointmentStatusBadge } from '@/components/admin/badges';

export const metadata = { title: 'Conta | Lume Admin' };

type Tab = 'overview' | 'subscription' | 'appointments' | 'clients' | 'finance' | 'bot' | 'settings' | 'logs';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Visão geral' },
  { key: 'subscription', label: 'Assinatura' },
  { key: 'appointments', label: 'Agendamentos' },
  { key: 'clients', label: 'Clientes' },
  { key: 'finance', label: 'Financeiro' },
  { key: 'bot', label: 'Bot & IA' },
  { key: 'settings', label: 'Configurações' },
  { key: 'logs', label: 'Logs' },
];

export default async function ProfessionalDetailPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const tab = (Array.isArray(sp.tab) ? sp.tab[0] : sp.tab) as Tab | undefined;
  const active: Tab = TABS.some(t => t.key === tab) ? (tab as Tab) : 'overview';

  const data = await getProfessionalOverview(id);
  if (!data) notFound();

  const { professional: p, kpis, monthly, onboarding, alerts, bot, services, topServices, recentAppointments, recentClients } = data;
  const [history, audit] = await Promise.all([
    active === 'subscription' ? getSubscriptionHistory(id) : Promise.resolve([]),
    active === 'logs' ? readAuditLog({ entityType: 'professional', entityId: id, limit: 100 }) : Promise.resolve({ rows: [], total: 0 }),
  ]);

  const kpiCard = (label: string, value: string, hint?: string) => (
    <div className="card px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="text-2xl font-bold text-heading tabular-nums leading-tight mt-0.5">{value}</p>
      {hint && <p className="text-[11px] text-muted mt-0.5">{hint}</p>}
    </div>
  );

  const maxMonth = Math.max(1, ...monthly.map(m => m.count));

  return (
    <LayoutAdmin
      session={session}
      title={p.brand_name || p.name}
      subtitle={`${p.name} · ${p.email} · cadastrada em ${formatDateBR(p.created_at)}`}
      actions={
        <ProfessionalActions
          id={p.id}
          brandName={p.brand_name || p.name}
          status={p.status}
          plan={p.subscription_plan ?? null}
          subscriptionStatus={p.subscription_status ?? null}
          endsAt={p.subscription_ends_at ?? p.trial_ends_at ?? null}
        />
      }
    >
      <div className="space-y-4">
        {/* Faixa de identidade */}
        <div className="card px-4 py-3 flex flex-wrap items-center gap-2.5">
          <AccountStatusBadge status={p.status} />
          <PlanBadge plan={p.subscription_plan ?? null} status={p.subscription_status ?? null}
            endsAt={p.subscription_ends_at ?? null} trialEndsAt={p.trial_ends_at ?? null} />
          <Link href={`/agendar/${p.slug}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-semibold text-accent-link hover:underline">
            /agendar/{p.slug} <ExternalLink className="h-3 w-3" />
          </Link>
          {p.whatsapp && <span className="text-xs text-muted">WhatsApp {p.whatsapp}</span>}
        </div>

        {/* Abas */}
        <nav className="flex gap-1 overflow-x-auto scrollbar-none border-b border-line" aria-label="Seções da conta">
          {TABS.map(t => (
            <Link
              key={t.key}
              href={`/admin/professionals/${id}?tab=${t.key}`}
              scroll={false}
              aria-current={active === t.key ? 'page' : undefined}
              className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                active === t.key ? 'border-accent text-accent-link' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {/* ————— Visão geral ————— */}
        {active === 'overview' && (
          <div className="space-y-4">
            {alerts.length > 0 && (
              <ul className="grid gap-2 sm:grid-cols-2">
                {alerts.map((a, i) => (
                  <li key={i} className={`card px-3 py-2.5 flex items-start gap-2 text-xs ${
                    a.level === 'bad' ? 'text-[color:var(--color-bad)]' : a.level === 'warn' ? 'text-[color:var(--color-warn)]' : 'text-muted'
                  }`}>
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-px" aria-hidden />
                    <span className="font-semibold">{a.text}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpiCard('Faturamento 30d', brl(kpis.revenue30dCents), `total ${brl(kpis.revenueTotalCents)}`)}
              {kpiCard('Agendamentos 30d', String(kpis.appointments30d), `total ${kpis.appointmentsTotal}`)}
              {kpiCard('Clientes', String(kpis.clients))}
              {kpiCard('Ticket médio', brl(kpis.ticketCents))}
              {kpiCard('Comparecimento', pct(kpis.completionRate, 0))}
              {kpiCard('Faltas', pct(kpis.noShowRate, 0))}
              {kpiCard('Conversas esperando', String(bot.conversationsWaiting))}
              {kpiCard('Mensagens do bot (mês)', String(bot.messagesMonth))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="card p-4">
                <h2 className="text-sm font-bold text-ink flex items-center gap-2"><TrendingUp className="h-4 w-4 text-muted" /> Agendamentos por mês</h2>
                <ul className="mt-4 flex items-end gap-2 h-32">
                  {monthly.map(m => (
                    <li key={m.label} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[10px] font-bold text-muted tabular-nums">{m.count}</span>
                      <span className="w-full rounded-t bg-accent" style={{ height: `${Math.round((m.count / maxMonth) * 88)}%`, minHeight: m.count ? 4 : 2, opacity: m.count ? 1 : 0.25 }} aria-hidden />
                      <span className="text-[10px] text-muted">{m.label}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="card p-4">
                <h2 className="text-sm font-bold text-ink">Ativação da conta</h2>
                <ul className="mt-3 space-y-2">
                  {onboarding.map(step => (
                    <li key={step.label} className="flex items-center gap-2 text-xs">
                      {step.done
                        ? <CheckCircle2 className="h-4 w-4 text-[color:var(--color-ok)] shrink-0" aria-hidden />
                        : <Circle className="h-4 w-4 text-muted shrink-0" aria-hidden />}
                      <span className={step.done ? 'text-ink font-semibold' : 'text-muted'}>{step.label}</span>
                      {step.hint && <span className="ml-auto text-[11px] text-muted tabular-nums">{step.hint}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        )}

        {/* ————— Assinatura ————— */}
        {active === 'subscription' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpiCard('Plano', p.subscription_plan ? p.subscription_plan : 'Legada')}
              {kpiCard('Situação', p.subscription_status ?? '—')}
              {kpiCard('Trial termina', formatDateBR(p.trial_ends_at, '—'))}
              {kpiCard('Acesso vence', formatDateBR(p.subscription_ends_at, '—'))}
            </div>

            <section className="card overflow-hidden">
              <h2 className="px-4 py-3 text-sm font-bold text-ink border-b border-line">Histórico de mudanças</h2>
              {history.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-muted">
                  Nenhuma mudança registrada. O histórico começa a ser gravado a partir da migration v33.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {history.map(h => (
                    <li key={h.id} className="px-4 py-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="tabular-nums text-muted">{formatDateTimeBR(h.created_at)}</span>
                      <Badge tone="accent">{h.plan_key ?? 'sem plano'}</Badge>
                      <span className="text-muted">{h.status}</span>
                      {h.current_period_end && <span className="text-muted">até {formatDateBR(h.current_period_end)}</span>}
                      {h.note && <span className="text-ink">“{h.note}”</span>}
                      <span className="ml-auto text-muted">{h.changed_by}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {/* ————— Agendamentos ————— */}
        {active === 'appointments' && (
          <section className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">Últimos agendamentos</h2>
              <Link href={`/admin/appointments?prof=${id}`} className="text-xs font-bold text-accent-link hover:underline">Ver todos com filtro</Link>
            </div>
            <ul className="divide-y divide-line">
              {recentAppointments.map(a => (
                <li key={a.id} className="px-4 py-2.5 flex flex-wrap items-center gap-3 text-xs">
                  <span className="tabular-nums font-semibold text-ink w-24">{formatDateBR(a.date)}</span>
                  <span className="tabular-nums text-muted w-12">{formatTimeBR(a.start_time)}</span>
                  <span className="font-semibold text-ink flex-1 min-w-[8rem] truncate">{a.client_name}</span>
                  <span className="text-muted truncate max-w-[12rem]">{a.service?.name}</span>
                  <span className="tabular-nums text-ink">{brl(a.service?.price_cents || 0)}</span>
                  <AppointmentStatusBadge status={a.status} />
                </li>
              ))}
              {recentAppointments.length === 0 && <li className="px-4 py-8 text-center text-xs text-muted">Nenhum agendamento.</li>}
            </ul>
          </section>
        )}

        {/* ————— Clientes ————— */}
        {active === 'clients' && (
          <section className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">Clientes recentes</h2>
              <Link href={`/admin/clients?prof=${id}`} className="text-xs font-bold text-accent-link hover:underline">Ver todas com filtro</Link>
            </div>
            <ul className="divide-y divide-line">
              {recentClients.map(c => (
                <li key={c.id} className="px-4 py-2.5 flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-semibold text-ink flex-1 min-w-[10rem] truncate">{c.name}</span>
                  <span className="text-muted tabular-nums">{c.whatsapp}</span>
                  <span className="text-muted tabular-nums">{c.total_appointments ?? 0} visita(s)</span>
                  <span className="text-muted tabular-nums">{formatDateBR(c.last_appointment_at, 'nunca')}</span>
                </li>
              ))}
              {recentClients.length === 0 && <li className="px-4 py-8 text-center text-xs text-muted">Nenhuma cliente.</li>}
            </ul>
          </section>
        )}

        {/* ————— Financeiro ————— */}
        {active === 'finance' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpiCard('Faturamento total', brl(kpis.revenueTotalCents))}
              {kpiCard('Últimos 30 dias', brl(kpis.revenue30dCents))}
              {kpiCard('Ticket médio', brl(kpis.ticketCents))}
              {kpiCard('Atendimentos pagos', String(kpis.appointmentsTotal))}
            </div>
            <section className="card overflow-hidden">
              <h2 className="px-4 py-3 text-sm font-bold text-ink border-b border-line">Serviços mais vendidos</h2>
              <ul className="divide-y divide-line">
                {topServices.map(s => (
                  <li key={s.name} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                    <span className="font-semibold text-ink flex-1 truncate">{s.name}</span>
                    <span className="text-muted tabular-nums">{s.count}×</span>
                    <span className="text-ink tabular-nums font-semibold">{brl(s.revenueCents)}</span>
                  </li>
                ))}
                {topServices.length === 0 && <li className="px-4 py-8 text-center text-xs text-muted">Sem vendas registradas.</li>}
              </ul>
            </section>
          </div>
        )}

        {/* ————— Bot & IA ————— */}
        {active === 'bot' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpiCard('Conexão', bot.configured ? 'Configurada' : 'Não configurada')}
              {kpiCard('Bot', bot.enabled ? 'Ligado' : 'Desligado')}
              {kpiCard('Automações', bot.automationsOn ? 'Ativas' : 'Desligadas')}
              {kpiCard('Mensagens (mês)', String(bot.messagesMonth))}
            </div>
            <div className="card p-4 text-xs text-muted space-y-2">
              <p className="flex items-center gap-2"><Bot className="h-4 w-4" /> Servidor uazapi: <span className="text-ink font-semibold">{bot.number ?? '—'}</span></p>
              <p className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Conversas esperando atendimento humano: <span className="text-ink font-semibold tabular-nums">{bot.conversationsWaiting}</span></p>
              <p className="pt-2 border-t border-line">
                Ligar/desligar o bot e editar a persona é feito no painel da profissional —
                use <strong className="text-ink">Entrar como</strong> acima. As mudanças ficam registradas na auditoria.
              </p>
            </div>
          </div>
        )}

        {/* ————— Configurações ————— */}
        {active === 'settings' && (
          <div className="space-y-4">
            <section className="card overflow-hidden">
              <h2 className="px-4 py-3 text-sm font-bold text-ink border-b border-line">Serviços cadastrados ({services.length})</h2>
              <ul className="divide-y divide-line">
                {services.map(s => (
                  <li key={s.id} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                    <span className="font-semibold text-ink flex-1 truncate">{s.name}</span>
                    <span className="text-muted tabular-nums">{s.duration_minutes} min</span>
                    <span className="text-ink tabular-nums font-semibold">{brl(s.price_cents)}</span>
                    {!s.is_active && <Badge tone="neutral">inativo</Badge>}
                  </li>
                ))}
                {services.length === 0 && <li className="px-4 py-8 text-center text-xs text-muted">Nenhum serviço cadastrado.</li>}
              </ul>
            </section>
            <EditProfessionalPanel professional={p} />
          </div>
        )}

        {/* ————— Logs ————— */}
        {active === 'logs' && (
          <section className="card overflow-hidden">
            <h2 className="px-4 py-3 text-sm font-bold text-ink border-b border-line">O que o admin fez nesta conta</h2>
            {audit.rows.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted">Nada registrado ainda.</p>
            ) : (
              <ul className="divide-y divide-line">
                {audit.rows.map(r => (
                  <li key={r.id} className="px-4 py-2.5 flex flex-wrap items-center gap-3 text-xs">
                    <span className="tabular-nums text-muted w-36">{formatDateTimeBR(r.created_at)}</span>
                    <Badge tone="neutral">{r.action}</Badge>
                    <span className="text-muted flex-1 truncate">{JSON.stringify(r.after ?? {})}</span>
                    <span className="text-muted">{r.admin_email}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </LayoutAdmin>
  );
}

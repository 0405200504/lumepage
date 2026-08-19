import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ExternalLink, CheckCircle2, Circle, AlertTriangle, Bot, MessageCircle,
} from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { EditProfessionalPanel } from '@/components/admin/EditProfessionalPanel';
import { ProfessionalActions } from '@/components/admin/ProfessionalActions';
import { AccountStateGroup, Badge } from '@/components/admin/badges';
import { StatCard, SectionHeader } from '@/components/admin/primitives';
import { getProfessionalOverview, getSubscriptionHistory, getProfessionalAgenda } from '@/lib/admin/professional-detail';
import { AgendaMonth } from '@/components/admin/AgendaMonth';
import { BarChart } from '@/components/admin/BarChart';
import { listConversations } from '@/lib/admin/queries';
import { parseTableParams } from '@/lib/query-params';
import { getAccessOverview, METHOD_LABEL } from '@/lib/admin/access';
import { AccessPanel, AccessPanelData } from '@/components/admin/AccessPanel';
import { readAuditLog } from '@/lib/audit';
import { brl, formatDateBR, formatDateTimeBR, formatTimeBR, formatDurationBR, pct } from '@/lib/format';
import { AppointmentStatusBadge } from '@/components/admin/badges';

export const metadata = { title: 'Conta | Lume Admin' };

type Tab =
  | 'overview' | 'subscription' | 'access' | 'agenda' | 'appointments' | 'clients'
  | 'services' | 'finance' | 'bot' | 'conversations' | 'page' | 'settings' | 'logs';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Visão geral' },
  { key: 'subscription', label: 'Assinatura' },
  { key: 'access', label: 'Acesso' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'appointments', label: 'Agendamentos' },
  { key: 'clients', label: 'Clientes' },
  { key: 'services', label: 'Serviços' },
  { key: 'finance', label: 'Financeiro' },
  { key: 'bot', label: 'Bot & IA' },
  { key: 'conversations', label: 'Conversas' },
  { key: 'page', label: 'Página pública' },
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
  const [history, audit, accessData] = await Promise.all([
    active === 'subscription' ? getSubscriptionHistory(id) : Promise.resolve([]),
    // A aba Acesso também lê a trilha: é de lá que sai "o que o suporte já fez aqui".
    active === 'logs' || active === 'access'
      ? readAuditLog({ entityType: 'professional', entityId: id, limit: 100 })
      : Promise.resolve({ rows: [], total: 0 }),
    active === 'access' ? getAccessOverview(id) : Promise.resolve(null),
  ]);

  // Espelho de dados: as telas dela renderizadas com os componentes do admin.
  const monthParam = Array.isArray(sp.month) ? sp.month[0] : sp.month;
  const agenda = active === 'agenda' ? await getProfessionalAgenda(id, monthParam) : null;
  const conversations = active === 'conversations'
    ? await listConversations(
        parseTableParams({ prof: id, size: '25' }, { filterKeys: ['prof', 'state'], defaultSort: 'last' }),
        new Map([[id, p.brand_name || p.name]]),
      )
    : null;

  // Monta o pacote da aba Acesso. Nada aqui carrega senha — por construção, ver
  // lib/admin/access.ts.
  const accessPanel: AccessPanelData | null = accessData && {
    professionalId: id,
    brandName: p.brand_name || p.name,
    loginEmail: accessData.loginEmail,
    businessEmail: p.email,
    loginEmailMatchesBusiness: accessData.loginEmailMatchesBusiness,
    methodLabel: METHOD_LABEL[accessData.method],
    method: accessData.method,
    hasAuthUser: !!accessData.auth,
    passwordSetAt: accessData.passwordSetAt,
    mustChangePassword: accessData.mustChangePassword,
    lastSignInAt: accessData.auth?.lastSignInAt ?? null,
    lastIp: accessData.history.find(h => h.success)?.ip ?? null,
    lastDevice: accessData.history.find(h => h.success)?.user_agent ?? null,
    signIns30d: accessData.signInsLast30d,
    activeSessions: accessData.auth?.activeSessions ?? -1,
    emailConfirmedAt: accessData.auth?.emailConfirmedAt ?? null,
    available: accessData.available,
    reason: accessData.reason,
    history: accessData.history.map(h => ({
      id: h.id, method: h.method, success: h.success, ip: h.ip,
      userAgent: h.user_agent, impersonatedBy: h.impersonated_by, createdAt: h.created_at,
    })),
    supportActions: audit.rows
      .filter(r => r.action.startsWith('access.') || r.action.startsWith('professional.impersonate'))
      .slice(0, 20)
      .map(r => ({ id: r.id, action: r.action, adminEmail: r.admin_email, createdAt: r.created_at })),
  };

  const kpiCard = (label: string, value: string, hint?: string) => (
    <StatCard key={label} label={label} value={value} note={hint} />
  );

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
      <div className="space-y-5">
        {/* Faixa de identidade — filete, sem cartão: é contexto, não conteúdo. */}
        <div className="flex flex-wrap items-center gap-2.5 pb-3 border-b border-[color:var(--rule-subtle)]">
          <AccountStateGroup account={p} />
          <Link href={`/agendar/${p.slug}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-semibold text-accent-link hover:underline">
            /agendar/{p.slug} <ExternalLink className="h-3 w-3" />
          </Link>
          {p.whatsapp && <span className="text-xs text-muted">WhatsApp {p.whatsapp}</span>}
        </div>

        {/* Abas */}
        <nav className="flex gap-0 overflow-x-auto scrollbar-none border-b border-[color:var(--rule-strong)]" aria-label="Seções da conta">
          {TABS.map(t => (
            <Link
              key={t.key}
              href={`/admin/professionals/${id}?tab=${t.key}`}
              scroll={false}
              aria-current={active === t.key ? 'page' : undefined}
              className={`px-3 py-2 text-[12px] whitespace-nowrap border-b-2 -mb-px transition-colors ${
                active === t.key
                  ? 'border-[color:var(--accent)] text-[color:var(--ink)] font-semibold'
                  : 'border-transparent text-[color:var(--ink-muted)] font-medium hover:text-[color:var(--ink)]'
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
                  <li
                    key={i}
                    style={{ borderLeftColor: a.level === 'bad' ? 'var(--bad-ink)' : a.level === 'warn' ? 'var(--warn-ink)' : 'var(--rule-strong)' }}
                    className="border border-[color:var(--rule-subtle)] border-l-2 rounded-[8px] px-3 py-2.5 text-[13px] text-[color:var(--ink)]"
                  >
                    {a.text}
                  </li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {kpiCard('Faturamento 30d', brl(kpis.revenue30dCents), `total ${brl(kpis.revenueTotalCents)}`)}
              {kpiCard('Agendamentos 30d', String(kpis.appointments30d), `total ${kpis.appointmentsTotal}`)}
              {kpiCard('Clientes', String(kpis.clients))}
              {kpiCard('Ticket médio', brl(kpis.ticketCents))}
              {kpiCard('Comparecimento', pct(kpis.completionRate, 0))}
              {kpiCard('Faltas', pct(kpis.noShowRate, 0))}
              {kpiCard('Conversas esperando', String(bot.conversationsWaiting))}
              {kpiCard('Mensagens do bot (mês)', String(bot.messagesMonth))}
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
              <section className="lg:col-span-7">
                <SectionHeader index="02" title="Agendamentos por mês" />
                <BarChart points={monthly.map(m => ({ label: m.label, value: m.count }))} format={v => String(Math.round(v))} />
              </section>

              <section className="lg:col-span-5">
                <SectionHeader index="03" title="Ativação da conta" />
                <ul className="space-y-2">
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
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

        {/* ————— Acesso ————— */}
        {active === 'access' && (
          accessPanel
            ? <AccessPanel data={accessPanel} />
            : <p className="card px-4 py-8 text-center text-xs text-muted">
                Dados de acesso indisponíveis para esta conta.
              </p>
        )}

        {/* ————— Agenda ————— */}
        {active === 'agenda' && agenda && (
          <AgendaMonth agenda={agenda} basePath={`/admin/professionals/${id}?tab=agenda`} />
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
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

        {/* ————— Serviços ————— */}
        {active === 'services' && (
          <section className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-ink">{services.length} serviço(s) cadastrado(s)</h2>
              <span className="text-[11px] text-muted">É isto que a cliente vê na página de agendamento.</span>
            </div>
            {services.length === 0 ? (
              <p className="px-4 py-10 text-center text-xs text-muted">
                Nenhum serviço cadastrado — a página de agendamento dela está vazia e ninguém consegue marcar horário.
              </p>
            ) : (
              <table className="min-w-full text-left border-collapse">
                <caption className="sr-only">Serviços da profissional com preço e duração</caption>
                <thead className="bg-surface-2 text-[11px] font-bold text-muted uppercase tracking-[0.08em]">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 border-b border-line">Serviço</th>
                    <th scope="col" className="px-4 py-2.5 border-b border-line text-right">Duração</th>
                    <th scope="col" className="px-4 py-2.5 border-b border-line text-right">Preço</th>
                    <th scope="col" className="px-4 py-2.5 border-b border-line text-right">Vendas</th>
                    <th scope="col" className="px-4 py-2.5 border-b border-line">Situação</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {services.map(s => {
                    const sold = topServices.find(t => t.name === s.name);
                    return (
                      <tr key={s.id} className="border-b border-line/70">
                        <td className="px-4 py-2.5">
                          <span className="block font-semibold text-ink">{s.name}</span>
                          {s.description && <span className="block text-[11px] text-muted truncate max-w-md">{s.description}</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted">{s.duration_minutes} min</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-ink">{brl(s.price_cents)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted">{sold ? `${sold.count}×` : '—'}</td>
                        <td className="px-4 py-2.5">{s.is_active ? <Badge tone="ok">ativo</Badge> : <Badge tone="neutral">inativo</Badge>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* ————— Conversas ————— */}
        {active === 'conversations' && conversations && (
          <section className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-ink">Conversas de WhatsApp desta conta</h2>
              <Link href={`/admin/conversations?prof=${id}`} className="text-xs font-bold text-accent-link hover:underline">Abrir na tela cheia</Link>
            </div>
            {conversations.rows.length === 0 ? (
              <p className="px-4 py-10 text-center text-xs text-muted">Nenhuma conversa registrada.</p>
            ) : (
              <ul className="divide-y divide-line">
                {conversations.rows.map(c => (
                  <li key={c.id} className="px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <Link href={`/admin/conversations/${c.id}`} className="font-semibold text-ink hover:underline w-36 shrink-0 tabular-nums">
                      {c.clientPhone}
                    </Link>
                    <span className="text-muted flex-1 min-w-[10rem] truncate">{c.lastMessage || '—'}</span>
                    <span className="text-muted tabular-nums">{c.messageCount} msg</span>
                    {c.botPaused
                      ? <Badge tone="warn">esperando {formatDurationBR(c.waitingHours * 3_600_000)}</Badge>
                      : <Badge tone="neutral">bot atendendo</Badge>}
                    <span className="text-muted tabular-nums w-24 text-right">{formatDateTimeBR(c.lastMessageAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ————— Página pública ————— */}
        {active === 'page' && (
          <div className="grid gap-4 lg:grid-cols-12">
            <section className="card overflow-hidden lg:col-span-7">
              <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-ink">Prévia de /agendar/{p.slug}</h2>
                <Link href={`/agendar/${p.slug}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-bold text-accent-link hover:underline">
                  Abrir em tamanho real <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <iframe
                src={`/agendar/${p.slug}`}
                title={`Página pública de ${p.brand_name || p.name}`}
                loading="lazy"
                className="w-full h-[70vh] bg-white"
              />
            </section>

            <section className="card p-4 lg:col-span-5 space-y-3 text-xs">
              <h2 className="text-sm font-bold text-ink">O que a cliente encontra</h2>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  {services.filter(s => s.is_active).length > 0
                    ? <CheckCircle2 className="h-4 w-4 text-[color:var(--color-ok)] shrink-0" aria-hidden />
                    : <AlertTriangle className="h-4 w-4 text-[color:var(--color-bad)] shrink-0" aria-hidden />}
                  <span className={services.filter(s => s.is_active).length > 0 ? 'text-ink' : 'text-[color:var(--color-bad)] font-semibold'}>
                    {services.filter(s => s.is_active).length} serviço(s) ativo(s) para escolher
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  {p.logo_url
                    ? <CheckCircle2 className="h-4 w-4 text-[color:var(--color-ok)] shrink-0" aria-hidden />
                    : <Circle className="h-4 w-4 text-muted shrink-0" aria-hidden />}
                  <span className={p.logo_url ? 'text-ink' : 'text-muted'}>Logo da marca</span>
                </li>
                <li className="flex items-center gap-2">
                  {p.public_bio
                    ? <CheckCircle2 className="h-4 w-4 text-[color:var(--color-ok)] shrink-0" aria-hidden />
                    : <Circle className="h-4 w-4 text-muted shrink-0" aria-hidden />}
                  <span className={p.public_bio ? 'text-ink' : 'text-muted'}>Texto de apresentação</span>
                </li>
                <li className="flex items-center gap-2">
                  {p.whatsapp
                    ? <CheckCircle2 className="h-4 w-4 text-[color:var(--color-ok)] shrink-0" aria-hidden />
                    : <Circle className="h-4 w-4 text-muted shrink-0" aria-hidden />}
                  <span className={p.whatsapp ? 'text-ink' : 'text-muted'}>WhatsApp de contato</span>
                </li>
              </ul>
              <p className="pt-2 border-t border-line text-muted">
                A prévia é a página real, carregada como uma cliente a veria — sem sessão nenhuma.
              </p>
            </section>
          </div>
        )}

        {/* ————— Configurações ————— */}
        {active === 'settings' && (
          <div className="space-y-4">
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

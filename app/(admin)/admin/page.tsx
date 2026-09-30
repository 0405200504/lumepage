import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Bell, Info, ChevronRight, CheckCircle2 } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { BarChart } from '@/components/admin/BarChart';
import { RankedBars } from '@/components/admin/RankedBars';
import { AppointmentStatusBadge } from '@/components/admin/badges';
import { StatCard, StatStrip, Trend, Panel, SectionHeader, EmptyState, Notice } from '@/components/admin/primitives';
import { SubNav, INICIO_NAV } from '@/components/admin/SubNav';
import { TaskList, NewTaskForm } from '@/components/admin/TaskList';
import { AlertActions } from '@/components/admin/AlertActions';
import { textLink } from '@/components/admin/ui';
import { getSaasRevenue, getNetworkVolume } from '@/lib/admin/business';
import { getAdminAlerts } from '@/lib/admin/alerts';
import { listTasks, listHublaEvents, MIGRATION_CRM } from '@/lib/admin/crm';
import { accountState } from '@/lib/admin/account-state';
import { listPlansAction } from '@/app/actions/admin-plans';
import { professionalOptions } from '@/lib/admin/queries';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';
import { parseTableParams, RawSearchParams } from '@/lib/query-params';
import { brl, brlCompact, formatDateBR, formatTimeBR } from '@/lib/format';

export const metadata = { title: 'Início | Lume Admin' };

const BASE = '/admin';

export default async function AdminHomePage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const session = await requireAdmin();
  const raw = await searchParams;
  const params = parseTableParams(raw, { defaultRange: '30d' });

  const db = () => getSupabaseAdmin() || supabase;
  const [{ plans }, options, alerts, tasksRes, unmatched, profsRes, recentRes, waitingRes] = await Promise.all([
    listPlansAction(), professionalOptions(), getAdminAlerts(),
    listTasks({ limit: 8 }),
    listHublaEvents({ unmatchedOnly: true, limit: 50 }),
    isSupabaseConfigured
      ? db().from('professionals').select('id, status, created_at, subscription_status, subscription_plan, subscription_ends_at, trial_ends_at')
        .is('deleted_at', null).neq('id', DEMO_PROFESSIONAL_ID)
      : Promise.resolve({ data: [] }),
    isSupabaseConfigured
      ? db().from('appointments').select('id, client_name, date, start_time, status, professional_id, service:services(name)')
        .is('deleted_at', null).neq('professional_id', DEMO_PROFESSIONAL_ID)
        .order('created_at', { ascending: false }).limit(8)
      : Promise.resolve({ data: [] }),
    isSupabaseConfigured
      ? db().from('whatsapp_conversations').select('id', { count: 'exact', head: true }).eq('bot_paused', true).not('client_phone', 'like', '_debug_%')
      : Promise.resolve({ count: 0 }),
  ]);
  const profNames = new Map(options.map(o => [o.value, o.label]));

  const [saas, network] = await Promise.all([
    getSaasRevenue(plans),
    getNetworkVolume(params.from, params.to, profNames),
  ]);

  type P = { id: string; status: string; created_at: string; subscription_status: string | null; subscription_plan: string | null; subscription_ends_at: string | null; trial_ends_at: string | null };
  const profs = (profsRes.data || []) as P[];
  // eslint-disable-next-line react-hooks/purity -- Server Component: relógio por request.
  const now = Date.now();
  const in7 = now + 7 * 86_400_000;
  const new7d = profs.filter(p => now - new Date(p.created_at).getTime() <= 7 * 86_400_000).length;
  const withAccess = profs.filter(p => accountState(p).hasAccess).length;
  const expiring7d = profs.filter(p => {
    const s = accountState(p);
    if (!s.hasAccess || !s.deadline) return false;
    const t = new Date(s.deadline).getTime();
    return t >= now && t <= in7;
  }).length;
  const pastDue = profs.filter(p => p.subscription_status === 'past_due').length;
  const waiting = waitingRes.count ?? 0;

  const recent = (recentRes.data || []) as unknown as {
    id: string; client_name: string; date: string; start_time: string; status: string; professional_id: string; service: { name?: string } | null;
  }[];

  const alertIcon = { bad: AlertTriangle, warn: Bell, info: Info } as const;
  const alertTone = { bad: 'text-danger bg-danger-bg', warn: 'text-warning bg-warning-bg', info: 'text-n-500 bg-surface-2' } as const;

  return (
    <LayoutAdmin
      session={session}
      title="Início"
      subtitle="O que precisa de você hoje, o que a Lume fatura e o que a rede movimenta."
      actions={<DateRangeFilter basePath={BASE} presets={['7d', '30d', 'month', '90d', 'year']} hideCustom />}
    >
      <div className="space-y-6">
        <SubNav items={INICIO_NAV} />

        {/* ——— Hoje ——— */}
        <StatStrip cols={5} items={[
          { label: 'Contas novas (7 dias)', value: String(new7d), note: `${withAccess} com acesso no total`, href: '/admin/professionals?stage=nova' },
          { label: 'Vencem em 7 dias', value: String(expiring7d), note: 'acesso ou teste', tone: expiring7d ? 'warn' : 'default', href: '/admin/professionals?risk=trial7' },
          { label: 'Inadimplentes', value: String(pastDue), tone: pastDue ? 'bad' : 'default', href: '/admin/subscriptions?state=past_due' },
          { label: 'Esperando humano', value: String(waiting), note: 'conversas do WhatsApp', tone: waiting ? 'warn' : 'default', href: '/admin/conversations?state=waiting' },
          { label: 'Pagamentos sem dona', value: String(unmatched.events.length), note: 'chegaram pela Hubla', tone: unmatched.events.length ? 'bad' : 'default', href: '/admin/subscriptions#sem-dona' },
        ]} />

        <div className="grid gap-4 lg:grid-cols-12">
          {/* ——— Atenção ——— */}
          <section id="atencao" className="scroll-mt-6 lg:col-span-7">
            <SectionHeader title="Precisa da sua atenção" note={alerts.length > 0 ? `${alerts.length} item(s)` : undefined} />
            {alerts.length === 0 ? (
              <div className="card">
                <EmptyState icon={<CheckCircle2 />} title="Tudo em ordem" description="Nenhuma conta vencendo, nenhuma conversa parada, nenhuma cobrança em atraso." className="py-8" />
              </div>
            ) : (
              <ul className="card divide-y divide-line overflow-hidden">
                {alerts.map(a => {
                  const Icon = alertIcon[a.level];
                  return (
                    <li key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-n-25 transition-ui">
                      <Link href={a.href} className="flex items-center gap-3 min-w-0 flex-1">
                        <span className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${alertTone[a.level]}`}>
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-body-sm font-semibold text-heading">{a.title}</span>
                          <span className="block text-caption text-n-500 mt-0.5 truncate">{a.detail}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-n-400 shrink-0" aria-hidden />
                      </Link>
                      {tasksRes.available && <AlertActions alertId={a.id} title={a.title} />}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ——— Tarefas ——— */}
          <section className="lg:col-span-5">
            <SectionHeader title="Suas tarefas" note={tasksRes.tasks.length > 0 ? `${tasksRes.tasks.length} aberta(s)` : undefined}
              action={<Link href="/admin/tasks" className={textLink}>Ver todas</Link>} />
            <div className="card overflow-hidden">
              {!tasksRes.available ? (
                <Notice tone="warn" className="m-4">Rode <code className="font-mono">{MIGRATION_CRM}</code> no Supabase para ligar tarefas, notas e o CRM das contas.</Notice>
              ) : (
                <>
                  {tasksRes.tasks.length === 0
                    ? <EmptyState title="Nada pendente" description="Crie uma tarefa abaixo ou transforme um alerta em tarefa." className="py-6" />
                    : <TaskList tasks={tasksRes.tasks} compact />}
                  <div className="border-t border-line p-3">
                    <NewTaskForm accounts={options} />
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        {/* ——— Números ——— */}
        <div className="grid gap-4 lg:grid-cols-12">
          <StatCard
            accent
            className="lg:col-span-5"
            label="Receita recorrente da Lume"
            value={brl(saas.mrrCents)}
            note={saas.activeSubscriptions > 0
              ? `${saas.activeSubscriptions} assinatura(s) ativa(s) · ${brl(saas.arrCents)} ao ano`
              : 'Nenhuma assinatura ativa ainda'}
            href="/admin/finance"
          />
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Contas com acesso" value={String(withAccess)} note={`de ${profs.length} cadastradas`} href="/admin/professionals" />
            <StatCard label="Movimento da rede" value={brl(network.gmvCents)}
              note={<Trend current={network.gmvCents} previous={network.gmvPreviousCents} />} href="/admin/finance" />
            <StatCard label="Agendamentos" value={String(network.appointments)}
              note={<Trend current={network.appointments} previous={network.appointmentsPrevious} />} href="/admin/appointments" />
          </div>
        </div>

        {/* ——— Gráficos ——— */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="MRR mês a mês" note="Assinaturas ativas da Lume">
            {saas.mrrCents === 0 ? (
              <EmptyState title="Sem assinatura ativa" description="O gráfico aparece quando a primeira conta ganhar um plano."
                action={<Link href="/admin/professionals" className={textLink}>Definir planos</Link>} className="py-8" />
            ) : (
              <BarChart points={saas.mrrSeries.map(s => ({ label: s.label, value: s.mrrCents, hint: `${s.label}: ${brl(s.mrrCents)}` }))} format={brlCompact} />
            )}
          </Panel>

          <Panel title="Faturamento por conta" note="O que cada profissional movimentou no período. Não é receita da Lume."
            action={<Link href="/admin/finance" className={textLink}>Ver tudo</Link>}>
            <RankedBars
              items={network.byProfessional.slice(0, 8).map(p => ({ id: p.id, label: p.name, value: p.gmvCents, sharePct: p.sharePct, alert: p.sharePct >= 50 }))}
              format={brl}
            />
          </Panel>
        </div>

        {/* ——— Atividade ——— */}
        <Panel flush title="Últimos agendamentos" note="Criados mais recentemente em toda a rede"
          action={<Link href="/admin/appointments" className={textLink}>Ver todos</Link>}>
          <ul className="divide-y divide-line border-t border-line">
            {recent.map(a => (
              <li key={a.id} className="px-5 py-3 flex items-center gap-4 text-body-sm">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-heading truncate">{a.client_name}</span>
                  <span className="block text-caption text-n-500 truncate">{a.service?.name ?? '—'} · {profNames.get(a.professional_id) ?? '—'}</span>
                </span>
                <span className="text-caption text-n-500 num whitespace-nowrap">{formatDateBR(a.date)} · {formatTimeBR(a.start_time)}</span>
                <AppointmentStatusBadge status={a.status} />
              </li>
            ))}
            {recent.length === 0 && <li><EmptyState title="Nenhum agendamento ainda" className="py-8" /></li>}
          </ul>
        </Panel>
      </div>
    </LayoutAdmin>
  );
}

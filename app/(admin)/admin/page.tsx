import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Bell, Info, ChevronRight, CheckCircle2 } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { BarChart } from '@/components/admin/BarChart';
import { RankedBars } from '@/components/admin/RankedBars';
import { AppointmentStatusBadge } from '@/components/admin/badges';
import { StatCard, Trend, Panel, SectionHeader, EmptyState } from '@/components/admin/primitives';
import { textLink } from '@/components/admin/ui';
import { getSaasRevenue, getNetworkVolume } from '@/lib/admin/business';
import { getAdminAlerts } from '@/lib/admin/alerts';
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

  const [{ plans }, options, alerts] = await Promise.all([
    listPlansAction(), professionalOptions(), getAdminAlerts(),
  ]);
  const profNames = new Map(options.map(o => [o.value, o.label]));

  const [saas, network] = await Promise.all([
    getSaasRevenue(plans),
    getNetworkVolume(params.from, params.to, profNames),
  ]);

  const db = () => getSupabaseAdmin() || supabase;
  const [profsRes, recentRes] = isSupabaseConfigured
    ? await Promise.all([
      db().from('professionals').select('id, status').is('deleted_at', null).neq('id', DEMO_PROFESSIONAL_ID),
      db().from('appointments').select('id, client_name, date, start_time, status, professional_id, service:services(name)')
        .is('deleted_at', null).neq('professional_id', DEMO_PROFESSIONAL_ID)
        .order('created_at', { ascending: false }).limit(8),
    ])
    : [{ data: [] }, { data: [] }];

  const profs = (profsRes.data || []) as { id: string; status: string }[];
  const activeCount = profs.filter(p => p.status === 'active').length;
  const recent = (recentRes.data || []) as unknown as {
    id: string; client_name: string; date: string; start_time: string; status: string; professional_id: string; service: { name?: string } | null;
  }[];

  const alertIcon = { bad: AlertTriangle, warn: Bell, info: Info } as const;
  const alertTone = { bad: 'text-danger bg-danger-bg', warn: 'text-warning bg-warning-bg', info: 'text-n-500 bg-surface-2' } as const;

  return (
    <LayoutAdmin
      session={session}
      title="Início"
      subtitle="O que a Lume fatura, o que a rede movimenta e o que precisa de você."
      actions={<DateRangeFilter basePath={BASE} presets={['7d', '30d', 'month', '90d', 'year']} hideCustom />}
    >
      <div className="space-y-6">
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
            <StatCard label="Contas com acesso" value={String(activeCount)} note={`de ${profs.length} cadastradas`} href="/admin/professionals" />
            <StatCard label="Movimento da rede" value={brl(network.gmvCents)}
              note={<Trend current={network.gmvCents} previous={network.gmvPreviousCents} />} href="/admin/finance" />
            <StatCard label="Agendamentos" value={String(network.appointments)}
              note={<Trend current={network.appointments} previous={network.appointmentsPrevious} />} href="/admin/appointments" />
          </div>
        </div>

        {/* ——— Atenção ——— */}
        <section id="atencao" className="scroll-mt-6">
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
                  <li key={a.id}>
                    <Link href={a.href} className="flex items-center gap-4 px-5 py-3.5 hover:bg-n-25 transition-ui">
                      <span className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${alertTone[a.level]}`}>
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-body-sm font-semibold text-heading">{a.title}</span>
                        <span className="block text-caption text-n-500 mt-0.5 truncate">{a.detail}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-n-400 shrink-0" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

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

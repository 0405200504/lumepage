import React from 'react';
import Link from 'next/link';
import {
  Users, Wallet, CalendarDays, TrendingUp, AlertTriangle, Bell, Info, ArrowRight,
} from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { BarChart } from '@/components/admin/BarChart';
import { AppointmentStatusBadge } from '@/components/admin/badges';
import { getSaasRevenue, getNetworkVolume } from '@/lib/admin/business';
import { getAdminAlerts } from '@/lib/admin/alerts';
import { listPlansAction } from '@/app/actions/admin-plans';
import { professionalOptions } from '@/lib/admin/queries';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';
import { parseTableParams, RawSearchParams } from '@/lib/query-params';
import { brl, brlCompact, formatDateBR, formatTimeBR, pct } from '@/lib/format';

export const metadata = { title: 'Visão Geral | Lume Admin' };

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
        .order('created_at', { ascending: false }).limit(6),
    ])
    : [{ data: [] }, { data: [] }];

  const profs = (profsRes.data || []) as { id: string; status: string }[];
  const activeCount = profs.filter(p => p.status === 'active').length;
  const recent = (recentRes.data || []) as unknown as { id: string; client_name: string; date: string; start_time: string; status: string; professional_id: string; service: { name?: string } | null }[];

  const trend = (cur: number, prev: number) => {
    if (!prev) return null;
    const p = ((cur - prev) / prev) * 100;
    return (
      <span className={`text-[11px] font-bold ${p >= 0 ? 'text-[color:var(--color-ok)]' : 'text-[color:var(--color-bad)]'}`}>
        {pct(p, 0)} vs período anterior
      </span>
    );
  };

  const kpi = (icon: React.ReactNode, label: string, value: string, sub?: React.ReactNode, href?: string) => {
    const body = (
      <>
        <span className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-xl bg-accent-soft text-accent-link flex items-center justify-center shrink-0">{icon}</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{label}</span>
        </span>
        <span className="block text-3xl font-bold text-heading tabular-nums leading-none mt-3">{value}</span>
        {sub && <span className="block mt-1">{sub}</span>}
      </>
    );
    return href
      ? <Link href={href} className="card px-4 py-4 block hover:bg-surface-2 transition-colors">{body}</Link>
      : <div className="card px-4 py-4">{body}</div>;
  };

  const alertIcon = { bad: AlertTriangle, warn: Bell, info: Info } as const;
  const alertTone = {
    bad: 'text-[color:var(--color-bad)] bg-[color:var(--color-bad)]/10',
    warn: 'text-[color:var(--color-warn)] bg-[color:var(--color-warn)]/10',
    info: 'text-muted bg-surface-2',
  } as const;

  return (
    <LayoutAdmin
      session={session}
      title="Visão geral"
      subtitle="O estado da rede em uma tela: o que a Lume fatura, o que a rede movimenta e o que precisa de você."
      actions={<DateRangeFilter basePath={BASE} />}
    >
      <div className="space-y-6">
        {/* ───── Faixa 1 · números do negócio ───── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpi(<TrendingUp className="h-4 w-4" />, 'MRR da Lume', brl(saas.mrrCents),
            <span className="text-[11px] text-muted">{saas.activeSubscriptions} assinatura(s) ativa(s)</span>, '/admin/finance')}
          {kpi(<Users className="h-4 w-4" />, 'Contas ativas', String(activeCount),
            <span className="text-[11px] text-muted">{profs.length} no total</span>, '/admin/professionals')}
          {kpi(<Wallet className="h-4 w-4" />, 'GMV da rede', brl(network.gmvCents),
            trend(network.gmvCents, network.gmvPreviousCents), '/admin/finance')}
          {kpi(<CalendarDays className="h-4 w-4" />, 'Agendamentos', String(network.appointments),
            trend(network.appointments, network.appointmentsPrevious), '/admin/appointments')}
        </div>

        {/* ───── Faixa 2 · precisa da sua atenção ───── */}
        <section>
          <h2 className="text-sm font-bold text-ink mb-2.5">Precisa da sua atenção</h2>
          {alerts.length === 0 ? (
            <p className="card px-4 py-6 text-center text-xs text-muted">Nada pendente. Rede rodando.</p>
          ) : (
            <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {alerts.slice(0, 6).map(a => {
                const Icon = alertIcon[a.level];
                return (
                  <li key={a.id}>
                    <Link href={a.href} className="card px-4 py-3 flex items-start gap-3 hover:bg-surface-2 transition-colors h-full">
                      <span className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${alertTone[a.level]}`}>
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-ink">{a.title}</span>
                        <span className="block text-[11px] text-muted mt-0.5 line-clamp-2">{a.detail}</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted shrink-0 mt-1" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ───── Faixa 3 · dois gráficos ───── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card p-4">
            <h2 className="text-sm font-bold text-ink mb-3">MRR mês a mês</h2>
            <BarChart
              points={saas.mrrSeries.map(s => ({ label: s.label, value: s.mrrCents, hint: `${s.label}: ${brl(s.mrrCents)}` }))}
              format={brlCompact}
              caption="Receita recorrente da Lume — assinaturas ativas."
            />
          </section>

          <section className="card p-4">
            <h2 className="text-sm font-bold text-ink mb-3">Faturamento por profissional (período)</h2>
            <BarChart
              points={network.byProfessional.slice(0, 8).map(p => ({
                label: p.name.split(' ')[0].slice(0, 8),
                value: p.gmvCents,
                hint: `${p.name}: ${brl(p.gmvCents)} (${pct(p.sharePct, 0)} da rede)`,
              }))}
              format={brlCompact}
              trimLeadingZeros={false}
              caption="GMV das profissionais — não é receita da Lume."
            />
          </section>
        </div>

        {/* ───── Faixa 4 · ranking e atividade ───── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">Top profissionais</h2>
              <Link href="/admin/professionals" className="text-xs font-bold text-accent-link hover:underline">ver tudo</Link>
            </div>
            <ul className="divide-y divide-line">
              {network.byProfessional.slice(0, 5).map(p => (
                <li key={p.id} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                  <Link href={`/admin/professionals/${p.id}`} className="font-semibold text-ink flex-1 truncate hover:underline">{p.name}</Link>
                  <span className="text-muted tabular-nums">{pct(p.sharePct, 0)}</span>
                  <span className="text-ink font-bold tabular-nums w-24 text-right">{brl(p.gmvCents)}</span>
                </li>
              ))}
              {network.byProfessional.length === 0 && <li className="px-4 py-8 text-center text-xs text-muted">Sem movimento no período.</li>}
            </ul>
          </section>

          <section className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">Atividade recente</h2>
              <Link href="/admin/appointments" className="text-xs font-bold text-accent-link hover:underline">ver tudo</Link>
            </div>
            <ul className="divide-y divide-line">
              {recent.map(a => (
                <li key={a.id} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                  <span className="font-semibold text-ink flex-1 truncate">{a.client_name}</span>
                  <span className="text-muted truncate max-w-[10rem] hidden sm:block">{profNames.get(a.professional_id) ?? '—'}</span>
                  <span className="text-muted tabular-nums">{formatDateBR(a.date)} {formatTimeBR(a.start_time)}</span>
                  <AppointmentStatusBadge status={a.status} />
                </li>
              ))}
              {recent.length === 0 && <li className="px-4 py-8 text-center text-xs text-muted">Nenhum agendamento recente.</li>}
            </ul>
          </section>
        </div>

        <p className="text-[11px] text-muted px-1">
          Infraestrutura (uso do banco, lixeira da rede, webhooks) foi para{' '}
          <Link href="/admin/system" className="font-bold text-accent-link hover:underline">Saúde do sistema</Link>.
        </p>
      </div>
    </LayoutAdmin>
  );
}

import React from 'react';
import Link from 'next/link';
import {
  Users, Wallet, CalendarDays, TrendingUp, AlertTriangle, Bell, Info, ArrowRight,
} from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { BarChart } from '@/components/admin/BarChart';
import { RankedBars } from '@/components/admin/RankedBars';
import { AppointmentStatusBadge } from '@/components/admin/badges';
import { StatCard } from '@/components/admin/primitives';
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
      <span className={`text-caption font-bold ${p >= 0 ? 'text-success' : 'text-danger'}`}>
        {pct(p, 0)} vs período anterior
      </span>
    );
  };

  const alertIcon = { bad: AlertTriangle, warn: Bell, info: Info } as const;
  const alertTone = {
    bad: 'text-danger bg-danger-bg',
    warn: 'text-warning bg-warning-bg',
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="MRR da Lume" value={brl(saas.mrrCents)} icon={<TrendingUp className="h-[18px] w-[18px]" />} tint="wine"
            note={`${saas.activeSubscriptions} assinatura(s) ativa(s)`} href="/admin/finance" />
          <StatCard label="Contas com acesso" value={String(activeCount)} icon={<Users className="h-[18px] w-[18px]" />} tint="indigo"
            note={`${profs.length} no total`} href="/admin/professionals" />
          <StatCard label="GMV da rede" value={brl(network.gmvCents)} icon={<Wallet className="h-[18px] w-[18px]" />} tint="emerald"
            note={trend(network.gmvCents, network.gmvPreviousCents)} href="/admin/finance" />
          <StatCard label="Agendamentos" value={String(network.appointments)} icon={<CalendarDays className="h-[18px] w-[18px]" />} tint="amber"
            note={trend(network.appointments, network.appointmentsPrevious)} href="/admin/appointments" />
        </div>

        {/* ───── Faixa 2 · precisa da sua atenção ───── */}
        <section>
          <h2 className="text-label font-bold text-ink mb-2.5">Precisa da sua atenção</h2>
          {alerts.length === 0 ? (
            <p className="card px-4 py-6 text-center text-caption text-muted">
              Nada pendente — nenhuma conta vencendo, nenhuma conversa parada, nenhuma cobrança em atraso.
            </p>
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
                        <span className="block text-caption font-bold text-ink">{a.title}</span>
                        <span className="block text-caption text-muted mt-0.5 line-clamp-2">{a.detail}</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted shrink-0 mt-1" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ───── Faixa 3 · gráficos ───── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card p-4 sm:p-5 rounded-3xl">
            <h2 className="text-label font-bold text-ink mb-3">MRR mês a mês</h2>
            {saas.mrrCents === 0 ? (
              <p className="py-8 text-center text-caption text-muted">
                Ainda não há assinatura ativa para compor MRR.{' '}
                <Link href="/admin/professionals" className="font-bold text-accent-link hover:underline">Definir planos →</Link>
              </p>
            ) : (
              <BarChart
                points={saas.mrrSeries.map(s => ({ label: s.label, value: s.mrrCents, hint: `${s.label}: ${brl(s.mrrCents)}` }))}
                format={brlCompact}
                caption="Receita recorrente da Lume — assinaturas ativas."
              />
            )}
          </section>

          <section className="card p-4 sm:p-5 rounded-3xl">
            <h2 className="text-label font-bold text-ink mb-3">Faturamento por profissional</h2>
            <RankedBars
              items={network.byProfessional.slice(0, 8).map(p => ({
                id: p.id, label: p.name, value: p.gmvCents, sharePct: p.sharePct,
                alert: p.sharePct >= 50,
              }))}
              format={brl}
            />
            <p className="mt-3 text-caption text-muted">GMV das profissionais — não é receita da Lume.</p>
          </section>
        </div>

        {/* ───── Faixa 4 · atividade e ranking ───── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card rounded-3xl overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex items-center justify-between">
              <h2 className="text-label font-bold text-ink">Atividade recente</h2>
              <Link href="/admin/appointments" className="text-caption font-bold text-accent-link hover:underline">ver tudo</Link>
            </div>
            <ul className="divide-y divide-line">
              {recent.map(a => (
                <li key={a.id} className="px-4 py-2.5 flex items-center gap-3 text-caption">
                  <span className="font-semibold text-ink flex-1 truncate">{a.client_name}</span>
                  <span className="text-muted truncate max-w-[10rem] hidden sm:block">{profNames.get(a.professional_id) ?? '—'}</span>
                  <span className="text-muted num whitespace-nowrap">{formatDateBR(a.date)} {formatTimeBR(a.start_time)}</span>
                  <AppointmentStatusBadge status={a.status} />
                </li>
              ))}
              {recent.length === 0 && (
                <li className="px-4 py-8 text-center text-caption text-muted">Nenhum agendamento criado ainda nesta rede.</li>
              )}
            </ul>
          </section>

          <section className="card rounded-3xl overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex items-center justify-between">
              <h2 className="text-label font-bold text-ink">Contas por faturamento</h2>
              <Link href="/admin/professionals" className="text-caption font-bold text-accent-link hover:underline">ver tudo</Link>
            </div>
            <ul className="divide-y divide-line">
              {network.byProfessional.slice(0, 5).map(p => (
                <li key={p.id} className="px-4 py-2.5 flex items-center gap-3 text-caption">
                  <Link href={`/admin/professionals/${p.id}`} className="font-semibold text-ink flex-1 truncate hover:underline">{p.name}</Link>
                  <span className="text-muted num">{pct(p.sharePct, 0)}</span>
                  <span className="text-ink font-bold num w-24 text-right">{brl(p.gmvCents)}</span>
                </li>
              ))}
              {network.byProfessional.length === 0 && (
                <li className="px-4 py-8 text-center text-caption text-muted">Nenhum atendimento pago no período escolhido.</li>
              )}
            </ul>
          </section>
        </div>

        <p className="text-caption text-muted px-1">
          Infraestrutura (uso do banco, lixeira da rede, webhooks) foi para{' '}
          <Link href="/admin/system" className="font-bold text-accent-link hover:underline">Saúde do sistema</Link>.
        </p>
      </div>
    </LayoutAdmin>
  );
}

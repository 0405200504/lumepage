import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { BarChart } from '@/components/admin/BarChart';
import { RankedBars } from '@/components/admin/RankedBars';
import { AppointmentStatusBadge } from '@/components/admin/badges';
import { StatCard, SectionHeader } from '@/components/admin/primitives';
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

  // Marcador do nível do alerta: um filete colorido de 2px na borda esquerda, não
  // um ícone dentro de quadradinho. A cor entra uma vez, na menor área possível.
  const alertEdge = {
    bad: 'var(--bad-ink)',
    warn: 'var(--warn-ink)',
    info: 'var(--rule-strong)',
  } as const;

  return (
    <LayoutAdmin
      session={session}
      title="Visão geral"
      subtitle="O estado da rede em uma tela: o que a Lume fatura, o que a rede movimenta e o que precisa de você."
      actions={<DateRangeFilter basePath={BASE} />}
    >
      {/* Espaço negativo agressivo ENTRE blocos (56px) e apertado dentro deles. */}
      <div className="space-y-14">
        {/* ───── 01 · números do negócio ───── */}
        <section>
          <SectionHeader index="01" title="Onde o negócio está" note="MRR é da Lume; GMV é da rede — não se somam" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <StatCard label="MRR da Lume" value={brl(saas.mrrCents)} accent
              note={`${saas.activeSubscriptions} assinatura(s) ativa(s)`} href="/admin/finance" />
            <StatCard label="Contas com acesso" value={String(activeCount)}
              note={`${profs.length} no total`} href="/admin/professionals" />
            <StatCard label="GMV da rede" value={brl(network.gmvCents)}
              note={trend(network.gmvCents, network.gmvPreviousCents)} href="/admin/finance" />
            <StatCard label="Agendamentos" value={String(network.appointments)}
              note={trend(network.appointments, network.appointmentsPrevious)} href="/admin/appointments" />
          </div>
        </section>

        {/* ───── 02 · precisa da sua atenção ───── */}
        <section>
          <SectionHeader index="02" title="Precisa da sua atenção"
            note={alerts.length ? `${alerts.length} item(ns)` : undefined} />
          {alerts.length === 0 ? (
            <p className="text-[13px] text-[color:var(--ink-muted)] py-2">
              Nada pendente — nenhuma conta vencendo, nenhuma conversa parada, nenhuma cobrança em atraso.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {alerts.slice(0, 6).map(a => (
                <li key={a.id}>
                  <Link
                    href={a.href}
                    style={{ borderLeftColor: alertEdge[a.level] }}
                    className="block h-full border border-[color:var(--rule-subtle)] border-l-2 rounded-[8px] px-3.5 py-3 hover:bg-[color:var(--surface-raised)] transition-colors group"
                  >
                    <span className="flex items-start gap-2">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-[color:var(--ink)] leading-snug">{a.title}</span>
                        <span className="block text-[11px] text-[color:var(--ink-muted)] mt-1 line-clamp-2">{a.detail}</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-[color:var(--ink-faint)] shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ───── 03 · série no tempo (7) × ranking (5) ─────
             Assimetria proposital: a série precisa de largura para os meses; o
             ranking é uma lista e lê melhor estreito. Nada de 6/6. */}
        <div className="grid gap-4 lg:grid-cols-12">
          <section className="lg:col-span-7">
            <SectionHeader index="03" title="MRR mês a mês" note="assinaturas ativas da Lume" />
            {saas.mrrCents === 0 ? (
              <p className="py-8 text-center text-xs text-muted">
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

          <section className="lg:col-span-5">
            <SectionHeader index="04" title="Faturamento por profissional" note="GMV — não é receita da Lume" />
            <RankedBars
              items={network.byProfessional.slice(0, 8).map(p => ({
                id: p.id, label: p.name, value: p.gmvCents, sharePct: p.sharePct,
                alert: p.sharePct >= 50,
              }))}
              format={brl}
            />
          </section>
        </div>

        {/* ───── 05 · atividade ─────
             Listas secundárias sem cartão: filete no topo de cada linha. Cartão com
             sombra para cinco linhas de texto é embalagem, não estrutura. */}
        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <SectionHeader index="05" title="Atividade recente"
              action={<Link href="/admin/appointments" className="text-[11px] font-semibold text-[color:var(--color-accent-link)] hover:underline">ver tudo</Link>} />
            <ul className="border-t border-[color:var(--rule-subtle)]">
              {recent.map(a => (
                <li key={a.id} className="flex items-center gap-3 py-2 border-b border-[color:var(--rule-subtle)] text-[13px] group">
                  <span className="font-medium text-[color:var(--ink)] flex-1 truncate">{a.client_name}</span>
                  <span className="text-[color:var(--ink-muted)] truncate max-w-[10rem] hidden sm:block">{profNames.get(a.professional_id) ?? '—'}</span>
                  {/* Hover revela a hora exata; em repouso só a data importa. */}
                  <span className="text-[color:var(--ink-muted)] tabular-nums whitespace-nowrap">
                    {formatDateBR(a.date)}
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity"> {formatTimeBR(a.start_time)}</span>
                  </span>
                  <AppointmentStatusBadge status={a.status} />
                </li>
              ))}
              {recent.length === 0 && (
                <li className="py-3 text-[13px] text-[color:var(--ink-muted)]">
                  Nenhum agendamento criado ainda nesta rede.
                </li>
              )}
            </ul>
          </section>

          <section>
            <SectionHeader index="06" title="Contas por faturamento"
              action={<Link href="/admin/professionals" className="text-[11px] font-semibold text-[color:var(--color-accent-link)] hover:underline">ver tudo</Link>} />
            <ul className="border-t border-[color:var(--rule-subtle)]">
              {network.byProfessional.slice(0, 5).map(p => (
                <li key={p.id} className="flex items-center gap-3 py-2 border-b border-[color:var(--rule-subtle)] text-[13px]">
                  <Link href={`/admin/professionals/${p.id}`} className="font-medium text-[color:var(--ink)] flex-1 truncate hover:text-[color:var(--accent)] transition-colors">{p.name}</Link>
                  <span className="text-[color:var(--ink-muted)] tabular-nums">{pct(p.sharePct, 0)}</span>
                  <span className="text-[color:var(--ink)] font-semibold tabular-nums w-24 text-right">{brl(p.gmvCents)}</span>
                </li>
              ))}
              {network.byProfessional.length === 0 && (
                <li className="py-3 text-[13px] text-[color:var(--ink-muted)]">
                  Nenhum atendimento pago no período escolhido.
                </li>
              )}
            </ul>
          </section>
        </div>

        <p className="text-[11px] text-[color:var(--ink-faint)]">
          Infraestrutura (uso do banco, lixeira da rede, webhooks) foi para{' '}
          <Link href="/admin/system" className="font-bold text-accent-link hover:underline">Saúde do sistema</Link>.
        </p>
      </div>
    </LayoutAdmin>
  );
}

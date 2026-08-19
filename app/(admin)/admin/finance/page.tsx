import React from 'react';
import Link from 'next/link';
import { AlertTriangle, TrendingUp, Building2 } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { getSaasRevenue, getNetworkVolume } from '@/lib/admin/business';
import { listPlansAction } from '@/app/actions/admin-plans';
import { professionalOptions } from '@/lib/admin/queries';
import { parseTableParams, RawSearchParams } from '@/lib/query-params';
import { brl, brlCompact, pct } from '@/lib/format';
import { BarChart } from '@/components/admin/BarChart';
import { RankedBars } from '@/components/admin/RankedBars';
import { StatCard, SectionHeader } from '@/components/admin/primitives';

export const metadata = { title: 'Financeiro | Lume Admin' };

const BASE = '/admin/finance';

export default async function AdminFinancePage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const session = await requireAdmin();
  const raw = await searchParams;
  const params = parseTableParams(raw, { defaultRange: '30d' });

  const [{ plans }, options] = await Promise.all([listPlansAction(), professionalOptions()]);
  const [saas, network] = await Promise.all([
    getSaasRevenue(plans),
    getNetworkVolume(params.from, params.to, new Map(options.map(o => [o.value, o.label]))),
  ]);

  const delta = (cur: number, prev: number) => {
    if (!prev) return null;
    const p = ((cur - prev) / prev) * 100;
    return <span className={`text-[11px] font-bold ${p >= 0 ? 'text-[color:var(--color-ok)]' : 'text-[color:var(--color-bad)]'}`}>{pct(p, 0)} vs período anterior</span>;
  };

  const kpi = (label: string, value: string, hint?: React.ReactNode) => (
    <StatCard key={label} label={label} value={value} note={hint} />
  );

  // Bloco inteiro zerado = feature ainda não rodou. Colapsa em uma linha (B.6).
  const noSubscriptions = saas.activeSubscriptions === 0 && saas.mrrCents === 0;

  // Segunda faixa: só os contadores que têm valor. Zero não ocupa cartão.
  const secondary = ([
    { label: 'Em teste', value: saas.trialing },
    { label: 'Inadimplentes', value: saas.pastDue },
    { label: 'Canceladas', value: saas.canceled, hint: <span className="text-[11px] text-muted">churn {pct(saas.churnRatePct, 1)}</span> },
    { label: 'Sem plano (legadas)', value: saas.legacy },
  ] as const)
    .filter(k => k.value > 0)
    .map(k => ({ label: k.label, value: String(k.value), hint: 'hint' in k ? k.hint : undefined }));

  return (
    <LayoutAdmin
      session={session}
      title="Financeiro"
      subtitle="Duas coisas diferentes, cada uma no seu bloco: o que a Lume fatura e o que a rede movimenta."
    >
      <div className="space-y-6">
        {/* ══════════ 01 · RECEITA DA LUME ══════════ */}
        <section className="space-y-3">
          <SectionHeader icon={<TrendingUp className="h-4 w-4 text-accent-link" />} title="Receita da Lume"
            note="assinaturas — este é o dinheiro do negócio" />

          {noSubscriptions ? (
            /* Oito caixas com R$ 0,00 não são informação — são ruído. Enquanto
               nenhuma conta tiver plano, o bloco inteiro vira uma linha com a ação. */
            <p className="card px-4 py-3.5 rounded-3xl text-xs text-ink flex flex-wrap items-center gap-x-2 gap-y-1">
              <strong>Nenhuma assinatura ativa ainda.</strong>
              <span className="text-muted">
                As {saas.legacy} conta(s) da rede estão como <strong className="text-ink">Legada</strong>, sem plano atribuído —
                então MRR, ARR, ARPA, LTV e churn não têm o que calcular.
              </span>
              <Link href="/admin/professionals" className="font-bold text-accent-link hover:underline">Definir planos →</Link>
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {kpi('MRR', brl(saas.mrrCents), <span className="text-[11px] text-muted">{saas.activeSubscriptions} assinatura(s) ativa(s)</span>)}
                {kpi('ARR', brl(saas.arrCents))}
                {kpi('ARPA', brl(saas.arpaCents))}
                {kpi('LTV estimado', brl(saas.ltvCents), <span className="text-[11px] text-muted">ARPA ÷ churn</span>)}
              </div>

              {/* Segunda linha: só o que tem valor. O que está zerado vira uma frase. */}
              {secondary.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {secondary.map(k => kpi(k.label, k.value, k.hint))}
                </div>
              ) : (
                <p className="text-[11px] text-muted px-1">
                  Nenhuma conta em teste, inadimplente ou cancelada — e {saas.legacy} legada(s).
                </p>
              )}
            </>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="card p-4 sm:p-5 rounded-3xl">
              <h3 className="text-xs font-bold text-ink mb-3">MRR mês a mês</h3>
              {noSubscriptions ? (
                <p className="py-6 text-center text-xs text-muted">
                  Sem assinatura, sem série. O gráfico aparece quando a primeira conta ganhar um plano.
                </p>
              ) : (
                <>
                  <BarChart
                    points={saas.mrrSeries.map(s => ({ label: s.label, value: s.mrrCents, hint: `${s.label}: ${brl(s.mrrCents)}` }))}
                    format={brlCompact}
                  />
                  <p className="mt-2 text-[11px] text-muted">
                    Reconstruído a partir da data de criação de cada conta e do preço do plano atual —
                    não há histórico de preço por mês antes da migration v33.
                  </p>
                </>
              )}
            </div>

            <div className="card rounded-3xl overflow-hidden">
              <h3 className="px-4 py-3 text-xs font-bold text-ink border-b border-line">Assinaturas por plano</h3>
              <ul className="divide-y divide-line">
                {saas.byPlan.map(p => (
                  <li key={p.key} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                    <span className="font-semibold text-ink flex-1">{p.name}</span>
                    <span className="text-muted tabular-nums">{p.count} conta(s)</span>
                    <span className="text-ink font-bold tabular-nums w-24 text-right">{brl(p.mrrCents)}</span>
                  </li>
                ))}
                {saas.byPlan.length === 0 && <li className="px-4 py-8 text-center text-xs text-muted">Nenhum plano configurado.</li>}
              </ul>
              <div className="px-4 py-2.5 border-t border-line">
                <Link href="/admin/plans" className="text-xs font-bold text-accent-link hover:underline">Editar catálogo de planos →</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ MOVIMENTO DA REDE ══════════ */}
        <section className="space-y-3">
          <SectionHeader
            icon={<Building2 className="h-4 w-4" />} title="Movimento da rede (GMV)"
            note={<>o que as profissionais faturam — <strong className="text-ink">não é receita da Lume</strong></>}
            action={<DateRangeFilter basePath={BASE} />}
          />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {kpi('GMV no período', brl(network.gmvCents), delta(network.gmvCents, network.gmvPreviousCents))}
            {kpi('Agendamentos', String(network.appointments), delta(network.appointments, network.appointmentsPrevious))}
            {kpi('Ticket médio', brl(network.ticketCents))}
            {kpi('Movimentação manual', `${brl(network.manualIncomeCents)} / −${brl(network.manualExpenseCents)}`)}
          </div>

          {network.concentrationPct >= 50 && network.byProfessional[0] && (
            <p className="card px-4 py-3 flex items-start gap-2 text-xs text-[color:var(--color-bad)]">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-px" aria-hidden />
              <span>
                <strong>Risco de concentração:</strong> {network.byProfessional[0].name} responde por{' '}
                <strong className="tabular-nums">{pct(network.concentrationPct, 0)}</strong> de todo o GMV do período.
                Perder essa conta é perder quase toda a atividade da plataforma.
              </span>
            </p>
          )}

          <div className="card p-4 sm:p-5 rounded-3xl">
            <h3 className="text-xs font-bold text-ink mb-3">Faturamento por profissional</h3>
            <RankedBars
              items={network.byProfessional.slice(0, 15).map(p => ({
                id: p.id, label: p.name, value: p.gmvCents, sharePct: p.sharePct, alert: p.sharePct >= 50,
              }))}
              format={brl}
            />
          </div>
        </section>
      </div>
    </LayoutAdmin>
  );
}

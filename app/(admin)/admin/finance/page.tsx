import React from 'react';
import Link from 'next/link';
import { AlertTriangle, TrendingUp, Building2 } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { Badge } from '@/components/admin/badges';
import { getSaasRevenue, getNetworkVolume } from '@/lib/admin/business';
import { listPlansAction } from '@/app/actions/admin-plans';
import { professionalOptions } from '@/lib/admin/queries';
import { parseTableParams, RawSearchParams } from '@/lib/query-params';
import { brl, pct } from '@/lib/format';

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
    <div className="card px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="text-2xl font-bold text-heading tabular-nums leading-tight mt-0.5">{value}</p>
      {hint && <p className="mt-0.5">{hint}</p>}
    </div>
  );

  const maxMrr = Math.max(1, ...saas.mrrSeries.map(s => s.mrrCents));

  return (
    <LayoutAdmin
      session={session}
      title="Financeiro"
      subtitle="Duas coisas diferentes, cada uma no seu bloco: o que a Lume fatura e o que a rede movimenta."
    >
      <div className="space-y-6">
        {/* ══════════ RECEITA DA LUME ══════════ */}
        <section className="space-y-3">
          <header className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent-link" aria-hidden />
            <h2 className="text-sm font-bold text-ink">Receita da Lume</h2>
            <span className="text-[11px] text-muted">assinaturas — este é o dinheiro do negócio</span>
          </header>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpi('MRR', brl(saas.mrrCents), <span className="text-[11px] text-muted">{saas.activeSubscriptions} assinatura(s) ativa(s)</span>)}
            {kpi('ARR', brl(saas.arrCents))}
            {kpi('ARPA', brl(saas.arpaCents))}
            {kpi('LTV estimado', brl(saas.ltvCents), <span className="text-[11px] text-muted">ARPA ÷ churn</span>)}
            {kpi('Em teste', String(saas.trialing))}
            {kpi('Inadimplentes', String(saas.pastDue))}
            {kpi('Canceladas', String(saas.canceled), <span className="text-[11px] text-muted">churn {pct(saas.churnRatePct, 1)}</span>)}
            {kpi('Sem plano (legadas)', String(saas.legacy))}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="card p-4">
              <h3 className="text-xs font-bold text-ink mb-3">MRR mês a mês</h3>
              <ul className="flex items-end gap-1.5 h-32">
                {saas.mrrSeries.map((s, i) => (
                  <li key={i} className="flex-1 flex flex-col items-center gap-1" title={`${s.label}: ${brl(s.mrrCents)}`}>
                    <span className="w-full rounded-t bg-accent" style={{ height: `${Math.round((s.mrrCents / maxMrr) * 100)}%`, minHeight: 2, opacity: s.mrrCents ? 1 : 0.2 }} aria-hidden />
                    <span className="text-[9px] text-muted">{s.label}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-muted">
                Reconstruído a partir da data de criação de cada conta e do preço do plano atual —
                não há histórico de preço por mês antes da migration v33.
              </p>
            </div>

            <div className="card overflow-hidden">
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
          <header className="flex flex-wrap items-center gap-2">
            <Building2 className="h-4 w-4 text-muted" aria-hidden />
            <h2 className="text-sm font-bold text-ink">Movimento da rede (GMV)</h2>
            <span className="text-[11px] text-muted">o que as profissionais faturam — <strong>não é receita da Lume</strong></span>
            <div className="ml-auto"><DateRangeFilter basePath={BASE} /></div>
          </header>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

          <div className="card overflow-hidden">
            <h3 className="px-4 py-3 text-xs font-bold text-ink border-b border-line">Faturamento por profissional</h3>
            <ul className="divide-y divide-line">
              {network.byProfessional.slice(0, 15).map(p => (
                <li key={p.id} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                  <Link href={`/admin/professionals/${p.id}`} className="font-semibold text-ink flex-1 truncate hover:underline">{p.name}</Link>
                  <span className="text-muted tabular-nums">{p.appointments} agend.</span>
                  <span className="w-24 h-1.5 rounded-full bg-surface-2 overflow-hidden hidden sm:block" aria-hidden>
                    <span className="block h-full bg-accent" style={{ width: `${Math.min(100, p.sharePct)}%` }} />
                  </span>
                  {p.sharePct >= 50 && <Badge tone="bad">{pct(p.sharePct, 0)}</Badge>}
                  <span className="text-ink font-bold tabular-nums w-24 text-right">{brl(p.gmvCents)}</span>
                </li>
              ))}
              {network.byProfessional.length === 0 && <li className="px-4 py-8 text-center text-xs text-muted">Sem movimento no período.</li>}
            </ul>
          </div>
        </section>
      </div>
    </LayoutAdmin>
  );
}

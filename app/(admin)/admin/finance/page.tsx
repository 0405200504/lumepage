import React from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
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
import { StatCard, StatStrip, SectionHeader, Panel, Notice, Trend, EmptyState } from '@/components/admin/primitives';
import { SubNav, FINANCEIRO_NAV } from '@/components/admin/SubNav';
import { textLink } from '@/components/admin/ui';

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

  const noSubscriptions = saas.activeSubscriptions === 0 && saas.mrrCents === 0;

  return (
    <LayoutAdmin
      session={session}
      title="Financeiro"
      subtitle="Duas coisas diferentes: o que a Lume fatura em assinaturas e o que a rede movimenta em atendimentos."
      actions={<DateRangeFilter basePath={BASE} />}
    >
      <div className="space-y-4">
        <SubNav items={FINANCEIRO_NAV} />

        {/* ——— Receita da Lume ——— */}
        <section className="space-y-4 pt-2">
          <SectionHeader title="Receita da Lume" note="assinaturas · o dinheiro do negócio" />

          {noSubscriptions ? (
            <Notice
              action={<Link href="/admin/professionals" className={textLink}>Definir planos</Link>}
            >
              <strong className="text-heading">Nenhuma assinatura ativa ainda.</strong>{' '}
              As {saas.legacy} conta(s) da rede estão como Legada, sem plano atribuído — MRR, ARR e churn não têm o que calcular.
            </Notice>
          ) : (
            <div className="grid gap-4 lg:grid-cols-12">
              <StatCard accent className="lg:col-span-4" label="MRR" value={brl(saas.mrrCents)} note={`${saas.activeSubscriptions} assinatura(s) ativa(s)`} />
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="ARR" value={brl(saas.arrCents)} note="receita anualizada" />
                <StatCard label="ARPA" value={brl(saas.arpaCents)} note="receita média por conta" />
                <StatCard label="LTV estimado" value={brl(saas.ltvCents)} note="ARPA ÷ churn" />
              </div>
            </div>
          )}

          <StatStrip items={[
            { label: 'Em teste', value: String(saas.trialing) },
            { label: 'Inadimplentes', value: String(saas.pastDue), tone: saas.pastDue ? 'bad' : 'default' },
            { label: 'Canceladas', value: String(saas.canceled), note: `churn ${pct(saas.churnRatePct, 1)}` },
            { label: 'Sem plano (legadas)', value: String(saas.legacy), note: 'acesso cheio, fora do MRR' },
          ]} />

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="MRR mês a mês" note="Reconstruído pela data de criação de cada conta e o preço do plano atual">
              {noSubscriptions
                ? <EmptyState title="Sem assinatura, sem série" description="O gráfico aparece quando a primeira conta ganhar um plano." className="py-8" />
                : <BarChart points={saas.mrrSeries.map(s => ({ label: s.label, value: s.mrrCents, hint: `${s.label}: ${brl(s.mrrCents)}` }))} format={brlCompact} />}
            </Panel>

            <Panel flush title="Assinaturas por plano" action={<Link href="/admin/plans" className={textLink}>Editar planos</Link>}>
              <ul className="divide-y divide-line border-t border-line">
                {saas.byPlan.map(p => (
                  <li key={p.key} className="px-5 py-3 flex items-center gap-3 text-body-sm">
                    <span className="font-semibold text-heading flex-1">{p.name}</span>
                    <span className="text-n-500 num">{p.count} conta(s)</span>
                    <span className="text-heading font-semibold num w-28 text-right">{brl(p.mrrCents)}</span>
                  </li>
                ))}
                {saas.byPlan.length === 0 && <li><EmptyState title="Nenhum plano configurado" className="py-8" /></li>}
              </ul>
            </Panel>
          </div>
        </section>

        {/* ——— Movimento da rede ——— */}
        <section className="space-y-4 pt-4">
          <SectionHeader title="Movimento da rede" note="o que as profissionais faturam · não é receita da Lume" />

          <StatStrip items={[
            { label: 'Movimento no período', value: brl(network.gmvCents), note: <Trend current={network.gmvCents} previous={network.gmvPreviousCents} suffix="vs anterior" />, tone: 'accent' },
            { label: 'Agendamentos', value: String(network.appointments), note: <Trend current={network.appointments} previous={network.appointmentsPrevious} suffix="vs anterior" /> },
            { label: 'Ticket médio', value: brl(network.ticketCents) },
            { label: 'Lançamentos manuais', value: brl(network.manualIncomeCents), note: `saídas ${brl(network.manualExpenseCents)}` },
          ]} />

          {network.concentrationPct >= 50 && network.byProfessional[0] && (
            <Notice tone="bad" icon={<AlertTriangle />}>
              <strong>Concentração:</strong> {network.byProfessional[0].name} responde por{' '}
              <strong className="num">{pct(network.concentrationPct, 0)}</strong> de todo o movimento do período.
            </Notice>
          )}

          <Panel title="Faturamento por conta" note="As 15 maiores no período">
            <RankedBars
              items={network.byProfessional.slice(0, 15).map(p => ({ id: p.id, label: p.name, value: p.gmvCents, sharePct: p.sharePct, alert: p.sharePct >= 50 }))}
              format={brl}
            />
          </Panel>
        </section>
      </div>
    </LayoutAdmin>
  );
}

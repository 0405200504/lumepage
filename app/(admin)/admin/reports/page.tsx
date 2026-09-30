import React from 'react';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { StatStrip, Panel, EmptyState } from '@/components/admin/primitives';
import { SubNav, FINANCEIRO_NAV } from '@/components/admin/SubNav';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { BarChart } from '@/components/admin/BarChart';
import { getReports } from '@/lib/admin/reports';
import { parseTableParams, RawSearchParams } from '@/lib/query-params';
import { brl, formatDateBR, pct } from '@/lib/format';

export const metadata = { title: 'Relatórios | Lume Admin' };

const BASE = '/admin/reports';

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const session = await requireAdmin();
  const raw = await searchParams;
  const params = parseTableParams(raw, { defaultRange: '90d' });
  const r = await getReports(params.from, params.to);

  return (
    <LayoutAdmin
      session={session}
      title="Relatórios"
      subtitle="Ativação, retenção e risco: as perguntas que decidem o produto."
      actions={<DateRangeFilter basePath={BASE} />}
    >
      <div className="space-y-4">
        <SubNav items={FINANCEIRO_NAV} />

        <StatStrip items={[
          { label: 'Contas na rede', value: String(r.totals.professionals) },
          { label: 'Agendamentos no período', value: String(r.totals.appointments) },
          { label: 'Comparecimento', value: r.totals.appointments ? pct((r.totals.completed / r.totals.appointments) * 100, 0) : '—', note: `${r.totals.completed} finalizados` },
          { label: 'Faltas', value: r.totals.appointments ? pct((r.totals.noShow / r.totals.appointments) * 100, 0) : '—', note: `${r.totals.noShow} no período`, tone: r.totals.noShow ? 'warn' : 'default' },
        ]} />

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Funil de ativação" note="Quantas contas chegam a cada passo. O degrau mais fundo é onde o produto perde gente.">
            <ul className="space-y-3">
              {r.activation.map(step => (
                <li key={step.label} className="text-body-sm">
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <span className="text-heading font-medium truncate">{step.label}</span>
                    <span className="num text-n-500 shrink-0"><strong className="text-heading">{step.count}</strong> · {pct(step.pct, 0)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden" aria-hidden>
                    <span className="block h-full rounded-full bg-wine-700" style={{ width: `${step.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Volume mês a mês" note="Agendamentos criados na rede">
            <BarChart points={r.monthly.map(m => ({ label: m.label, value: m.appointments, hint: `${m.label}: ${m.appointments} agendamentos · ${m.newProfessionals} contas novas · ${m.newClients} clientes novas` }))} format={v => String(Math.round(v))} trimLeadingZeros={false} />
          </Panel>
        </div>

        <Panel flush title="Retenção por coorte" note="Contas agrupadas pelo mês de cadastro; cada célula é quantas ainda tiveram agendamento naquele mês.">
          <div className="overflow-x-auto border-t border-line">
            <table className="admin-table min-w-full">
              <caption className="sr-only">Retenção de profissionais por mês de cadastro</caption>
              <thead>
                <tr>
                  <th scope="col">Coorte</th>
                  <th scope="col" className="text-right">Contas</th>
                  {['M0', 'M1', 'M2', 'M3', 'M4', 'M5'].map(m => <th key={m} scope="col" className="text-right">{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {r.cohorts.map(c => (
                  <tr key={c.cohort}>
                    <th scope="row" className="px-4 py-3 text-left font-semibold text-heading text-body-sm">{c.cohort}</th>
                    <td className="text-right num text-n-500">{c.size}</td>
                    {Array.from({ length: 6 }).map((_, i) => {
                      const value = c.retained[i];
                      const share = value !== undefined && c.size ? value / c.size : null;
                      return (
                        <td key={i} className="text-right num">
                          {value === undefined ? <span className="text-n-300">—</span> : (
                            <span className="inline-block min-w-[2.25rem] px-2 py-0.5 rounded-badge font-semibold text-heading"
                              style={{ backgroundColor: `color-mix(in srgb, var(--color-wine-700) ${Math.round((share ?? 0) * 55)}%, transparent)`, color: (share ?? 0) > 0.5 ? '#fff' : undefined }}>
                              {value}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {r.cohorts.length === 0 && <tr><td colSpan={8}><EmptyState title="Sem dados suficientes" className="py-8" /></td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel flush title={`Contas em risco (${r.atRisk.length})`} note="Com acesso, mas sem movimento">
            <ul className="divide-y divide-line border-t border-line max-h-96 overflow-y-auto">
              {r.atRisk.map(a => (
                <li key={a.id} className="px-5 py-3 flex items-center gap-3 text-body-sm">
                  <Link href={`/admin/professionals/${a.id}`} className="font-semibold text-heading flex-1 truncate hover:underline underline-offset-2">{a.name}</Link>
                  <span className="text-caption text-n-500 truncate max-w-[14rem]">{a.reason}</span>
                  <span className="text-caption text-n-500 num">{formatDateBR(a.lastActivity, '—')}</span>
                </li>
              ))}
              {r.atRisk.length === 0 && <li><EmptyState title="Nenhuma conta parada" className="py-8" /></li>}
            </ul>
          </Panel>

          <Panel flush title="Faltas por conta" note="Acima de 15% acende em laranja">
            <ul className="divide-y divide-line border-t border-line max-h-96 overflow-y-auto">
              {r.attendance.map(a => (
                <li key={a.id} className="px-5 py-3 flex items-center gap-3 text-body-sm">
                  <span className="font-semibold text-heading flex-1 truncate">{a.name}</span>
                  <span className="text-caption text-n-500 num">{a.total} agend.</span>
                  <span className={`num font-semibold ${a.noShowPct > 15 ? 'text-danger' : 'text-n-500'}`}>{a.noShow} faltas · {pct(a.noShowPct, 0)}</span>
                </li>
              ))}
              {r.attendance.length === 0 && <li><EmptyState title="Sem agendamentos no período" className="py-8" /></li>}
            </ul>
          </Panel>
        </div>

        <Panel flush title="Serviços e preços praticados" note="Os mais oferecidos na rede e a faixa de preço">
          <div className="overflow-x-auto border-t border-line">
            <table className="admin-table min-w-full">
              <caption className="sr-only">Serviços mais oferecidos e faixa de preço</caption>
              <thead>
                <tr>
                  <th scope="col">Serviço</th>
                  <th scope="col" className="text-right">Contas</th>
                  <th scope="col" className="text-right">Mínimo</th>
                  <th scope="col" className="text-right">Médio</th>
                  <th scope="col" className="text-right">Máximo</th>
                </tr>
              </thead>
              <tbody>
                {r.services.map(s => (
                  <tr key={s.name}>
                    <td className="text-heading capitalize font-medium">{s.name}</td>
                    <td className="text-right num text-n-500">{s.count}</td>
                    <td className="text-right num">{brl(s.minCents)}</td>
                    <td className="text-right num font-semibold text-heading">{brl(s.avgCents)}</td>
                    <td className="text-right num">{brl(s.maxCents)}</td>
                  </tr>
                ))}
                {r.services.length === 0 && <tr><td colSpan={5}><EmptyState title="Nenhum serviço cadastrado" className="py-8" /></td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </LayoutAdmin>
  );
}

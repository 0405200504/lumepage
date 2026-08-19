import React from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
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

  const maxMonthly = Math.max(1, ...r.monthly.map(m => m.appointments));

  const kpi = (label: string, value: string, hint?: string) => (
    <div className="card px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="text-2xl font-bold text-heading tabular-nums leading-tight mt-0.5">{value}</p>
      {hint && <p className="text-[11px] text-muted mt-0.5">{hint}</p>}
    </div>
  );

  return (
    <LayoutAdmin
      session={session}
      title="Relatórios"
      subtitle="Ativação, retenção e risco — as perguntas que decidem o produto, não só o volume do mês."
      actions={<DateRangeFilter basePath={BASE} />}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpi('Contas na rede', String(r.totals.professionals))}
          {kpi('Agendamentos no período', String(r.totals.appointments))}
          {kpi('Comparecimento', r.totals.appointments ? pct((r.totals.completed / r.totals.appointments) * 100, 0) : '—', `${r.totals.completed} finalizados`)}
          {kpi('Faltas', r.totals.appointments ? pct((r.totals.noShow / r.totals.appointments) * 100, 0) : '—', `${r.totals.noShow} no período`)}
        </div>

        {/* Ativação */}
        <section className="card p-4">
          <h2 className="text-sm font-bold text-ink">Funil de ativação</h2>
          <p className="text-[11px] text-muted mt-0.5">Quantas contas chegam até cada passo. O degrau mais fundo é onde o produto perde gente.</p>
          <ul className="mt-4 space-y-2">
            {r.activation.map(step => (
              <li key={step.label} className="flex items-center gap-3 text-xs">
                <span className="w-52 shrink-0 text-ink font-semibold">{step.label}</span>
                <span className="flex-1 h-4 rounded-full bg-surface-2 overflow-hidden" aria-hidden>
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${step.pct}%` }} />
                </span>
                <span className="w-20 text-right tabular-nums text-ink font-bold">{step.count} · {pct(step.pct, 0)}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Coortes */}
        <section className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-line">
            <h2 className="text-sm font-bold text-ink">Retenção por coorte</h2>
            <p className="text-[11px] text-muted mt-0.5">Contas agrupadas pelo mês de cadastro; cada célula é quantas ainda tiveram agendamento naquele mês.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <caption className="sr-only">Retenção de profissionais por mês de cadastro</caption>
              <thead className="bg-surface-2 text-[10px] uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left">Coorte</th>
                  <th scope="col" className="px-3 py-2 text-right">Contas</th>
                  {['M0', 'M1', 'M2', 'M3', 'M4', 'M5'].map(m => <th key={m} scope="col" className="px-3 py-2 text-right">{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {r.cohorts.map(c => (
                  <tr key={c.cohort} className="border-t border-line">
                    <th scope="row" className="px-4 py-2 text-left font-semibold text-ink">{c.cohort}</th>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{c.size}</td>
                    {Array.from({ length: 6 }).map((_, i) => {
                      const value = c.retained[i];
                      const share = value !== undefined && c.size ? value / c.size : null;
                      return (
                        <td key={i} className="px-3 py-2 text-right tabular-nums">
                          {value === undefined ? <span className="text-faint">—</span> : (
                            <span className="inline-block px-2 py-0.5 rounded font-bold"
                              style={{ backgroundColor: `color-mix(in srgb, var(--color-accent) ${Math.round((share ?? 0) * 60)}%, transparent)` }}>
                              {value}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {r.cohorts.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Sem dados suficientes.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {/* Volume mensal */}
        <section className="card p-4">
          <h2 className="text-sm font-bold text-ink">Volume mês a mês</h2>
          <ul className="mt-4 flex items-end gap-1.5 h-32">
            {r.monthly.map((m, i) => (
              <li key={i} className="flex-1 flex flex-col items-center gap-1" title={`${m.label}: ${m.appointments} agendamentos, ${m.newProfessionals} contas novas, ${m.newClients} clientes novas`}>
                <span className="text-[9px] font-bold text-muted tabular-nums">{m.appointments || ''}</span>
                <span className="w-full rounded-t bg-accent" style={{ height: `${Math.round((m.appointments / maxMonthly) * 92)}%`, minHeight: 2, opacity: m.appointments ? 1 : 0.2 }} aria-hidden />
                <span className="text-[9px] text-muted">{m.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Risco */}
          <section className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[color:var(--color-warn)]" aria-hidden />
              <h2 className="text-sm font-bold text-ink">Contas em risco ({r.atRisk.length})</h2>
            </div>
            <ul className="divide-y divide-line max-h-96 overflow-y-auto">
              {r.atRisk.map(a => (
                <li key={a.id} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                  <Link href={`/admin/professionals/${a.id}`} className="font-semibold text-ink flex-1 truncate hover:underline">{a.name}</Link>
                  <span className="text-muted truncate max-w-[14rem]">{a.reason}</span>
                  <span className="text-muted tabular-nums">{formatDateBR(a.lastActivity, '—')}</span>
                </li>
              ))}
              {r.atRisk.length === 0 && <li className="px-4 py-8 text-center text-muted text-xs">Nenhuma conta parada.</li>}
            </ul>
          </section>

          {/* Comparecimento por profissional */}
          <section className="card overflow-hidden">
            <h2 className="px-4 py-3 text-sm font-bold text-ink border-b border-line">Faltas por profissional</h2>
            <ul className="divide-y divide-line max-h-96 overflow-y-auto">
              {r.attendance.map(a => (
                <li key={a.id} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                  <span className="font-semibold text-ink flex-1 truncate">{a.name}</span>
                  <span className="text-muted tabular-nums">{a.total} agend.</span>
                  <span className={`tabular-nums font-bold ${a.noShowPct > 15 ? 'text-[color:var(--color-bad)]' : 'text-muted'}`}>
                    {a.noShow} faltas · {pct(a.noShowPct, 0)}
                  </span>
                </li>
              ))}
              {r.attendance.length === 0 && <li className="px-4 py-8 text-center text-muted text-xs">Sem agendamentos no período.</li>}
            </ul>
          </section>
        </div>

        {/* Preços praticados */}
        <section className="card overflow-hidden">
          <h2 className="px-4 py-3 text-sm font-bold text-ink border-b border-line">Serviços e preços praticados na rede</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <caption className="sr-only">Serviços mais oferecidos e faixa de preço</caption>
              <thead className="bg-surface-2 text-[10px] uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left">Serviço</th>
                  <th scope="col" className="px-3 py-2 text-right">Profissionais</th>
                  <th scope="col" className="px-3 py-2 text-right">Mínimo</th>
                  <th scope="col" className="px-3 py-2 text-right">Médio</th>
                  <th scope="col" className="px-3 py-2 text-right">Máximo</th>
                </tr>
              </thead>
              <tbody>
                {r.services.map(s => (
                  <tr key={s.name} className="border-t border-line">
                    <td className="px-4 py-2 text-ink capitalize">{s.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{s.count}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{brl(s.minCents)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-ink">{brl(s.avgCents)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{brl(s.maxCents)}</td>
                  </tr>
                ))}
                {r.services.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Nenhum serviço cadastrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </LayoutAdmin>
  );
}

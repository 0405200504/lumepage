'use client';

import React, { useMemo, useState } from 'react';
import { Appointment, Service, Transaction } from '@/types/database';
import {
  TrendingUp, CalendarCheck, CalendarX, UserX, Wallet, Ticket, Crown, Star, Clock,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { IndexGrid } from '@/components/ui/IndexGrid';

interface PerformancePanelProps {
  appointments: Appointment[];
  services: Service[];
  transactions?: Transaction[];
}

type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function rangeFor(period: Period, customStart: string, customEnd: string): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  if (period === 'today') { const t = toISO(now); return { start: t, end: t }; }
  if (period === 'week') {
    const dow = now.getDay(); // 0=Dom
    const monday = new Date(y, m, d - ((dow + 6) % 7));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    return { start: toISO(monday), end: toISO(sunday) };
  }
  if (period === 'month') return { start: toISO(new Date(y, m, 1)), end: toISO(new Date(y, m + 1, 0)) };
  if (period === 'year') return { start: toISO(new Date(y, 0, 1)), end: toISO(new Date(y, 11, 31)) };
  return { start: customStart || toISO(now), end: customEnd || toISO(now) };
}

import { BarChart } from '@/components/ui/charts/BarChart';

const Bars: React.FC<{ data: { label: string; value: number }[]; format?: (v: number) => string }> = ({ data, format }) => {
  return (
    <BarChart
      data={data.map((d) => ({ label: d.label, value: d.value }))}
      format={format}
      barColor="var(--color-wine-500)"
    />
  );
};

export const PerformancePanel: React.FC<PerformancePanelProps> = ({ appointments, services, transactions = [] }) => {
  const [period, setPeriod] = useState<Period>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const priceOf = (a: Appointment) =>
    a.service?.price_cents ?? services.find(s => s.id === a.service_id)?.price_cents ?? 0;

  const { start, end } = rangeFor(period, customStart, customEnd);

  const data = useMemo(() => {
    const inRange = appointments.filter(a => a.date >= start && a.date <= end);
    const completed = inRange.filter(a => a.status === 'completed');
    const cancelled = inRange.filter(a => a.status === 'cancelled');
    const noShow = inRange.filter(a => a.status === 'no_show');
    const upcoming = inRange.filter(a => a.status === 'pending' || a.status === 'confirmed');
    const active = inRange.filter(a => a.status !== 'cancelled'); // agendamentos válidos

    const realized = completed.reduce((s, a) => s + priceOf(a), 0);
    const predicted = upcoming.reduce((s, a) => s + priceOf(a), 0);
    const ticket = completed.length ? Math.round(realized / completed.length) : 0;

    // Entradas/saídas (transações no período)
    const txIn = transactions.filter(t => t.type === 'income' && t.date >= start && t.date <= end).reduce((s, t) => s + t.amount_cents, 0);
    const txOut = transactions.filter(t => t.type === 'expense' && t.date >= start && t.date <= end).reduce((s, t) => s + t.amount_cents, 0);

    // Serviço mais vendido (por concluídos; fallback por ativos)
    const svcCount = new Map<string, number>();
    (completed.length ? completed : active).forEach(a => {
      const name = a.service?.name || services.find(s => s.id === a.service_id)?.name || 'Serviço';
      svcCount.set(name, (svcCount.get(name) || 0) + 1);
    });
    const topServices = [...svcCount.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);

    // Cliente que mais agendou
    const cliCount = new Map<string, number>();
    active.forEach(a => cliCount.set(a.client_name, (cliCount.get(a.client_name) || 0) + 1));
    const topClient = [...cliCount.entries()].sort((a, b) => b[1] - a[1])[0];

    // Dias da semana com maior movimento
    const byWeekday = WEEKDAYS.map((label, i) => ({
      label,
      value: active.filter(a => new Date(`${a.date}T12:00:00`).getDay() === i).length,
    }));

    // Horários mais procurados
    const hourCount = new Map<string, number>();
    active.forEach(a => { const h = (a.start_time || '').substring(0, 2); if (h) hourCount.set(`${h}h`, (hourCount.get(`${h}h`) || 0) + 1); });
    const topHours = [...hourCount.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);

    // Status (no período)
    const statusData = [
      { label: 'Concluídos', value: completed.length },
      { label: 'Agendados', value: upcoming.length },
      { label: 'Cancelados', value: cancelled.length },
      { label: 'Faltas', value: noShow.length },
    ];

    // Faturamento realizado por mês (ano corrente) — para visão anual
    const year = new Date().getFullYear();
    const byMonth = MONTHS.map((label, i) => ({
      label,
      value: appointments
        .filter(a => a.status === 'completed' && a.date.startsWith(`${year}-${pad(i + 1)}`))
        .reduce((s, a) => s + priceOf(a), 0),
    }));

    return {
      count: active.length, completed: completed.length, cancelled: cancelled.length, noShow: noShow.length,
      realized, predicted, ticket, txIn, txOut, topServices, topClient, byWeekday, topHours, statusData, byMonth,
      hasData: inRange.length > 0,
    };
  }, [appointments, services, transactions, start, end]);

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: 'Hoje' },
    { key: 'week', label: 'Esta semana' },
    { key: 'month', label: 'Este mês' },
    { key: 'year', label: 'Este ano' },
    { key: 'custom', label: 'Personalizado' },
  ];

  return (
    <div className="space-y-5">
      {/* Seletor de período */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {periods.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`tap text-caption font-bold px-3.5 py-2 rounded-xl transition-ui ${
                period === p.key ? 'surface-wine text-white shadow-soft' : 'bg-n-50 text-n-600 hover:text-ink border border-n-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
              className="text-caption font-semibold text-ink bg-n-50 border border-n-200 rounded-xl px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700" />
            <span className="text-caption text-n-600">até</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
              className="text-caption font-semibold text-ink bg-n-50 border border-n-200 rounded-xl px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700" />
          </div>
        )}
      </div>

      {!data.hasData ? (
        <EmptyState title="Ainda não há dados para este período" description="Escolha outro período ou aguarde novos atendimentos para ver seu desempenho aqui." />
      ) : (
        <>
          {/* KPIs */}
          <IndexGrid
            cols={4}
            items={[
              { label: 'Receita realizada', value: brl(data.realized), accent: true },
              { label: 'Receita prevista', value: brl(data.predicted), hint: 'Pendentes + confirmados' },
              { label: 'Ticket médio', value: brl(data.ticket) },
              { label: 'Saldo (caixa)', value: brl(data.txIn - data.txOut), format: 'money' },
              { label: 'Total agendamentos', value: String(data.count), format: 'mono' },
              { label: 'Concluídos', value: String(data.completed), format: 'mono' },
              { label: 'Cancelados', value: String(data.cancelled), format: 'mono' },
              { label: 'Faltas', value: String(data.noShow), format: 'mono' },
            ]}
          />

          {/* Destaques */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="card p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-wine-50 text-wine-700"><Star className="h-5 w-5" /></div>
              <div className="min-w-0">
                <p className="mono-micro text-n-500">Serviço mais vendido</p>
                <p className="text-label font-bold text-ink truncate">{data.topServices[0]?.label || '—'}</p>
                {data.topServices[0] && <p className="text-caption text-n-600">{data.topServices[0].value}x no período</p>}
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-wine-50 text-wine-700"><Crown className="h-5 w-5" /></div>
              <div className="min-w-0">
                <p className="mono-micro text-n-500">Cliente que mais agendou</p>
                <p className="text-label font-bold text-ink truncate">{data.topClient?.[0] || '—'}</p>
                {data.topClient && <p className="text-caption text-n-600">{data.topClient[1]} agendamentos</p>}
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Status dos agendamentos"><Bars data={data.statusData} /></ChartCard>
            <ChartCard title="Serviços mais vendidos">
              {data.topServices.length ? <Bars data={data.topServices} /> : <Muted />}
            </ChartCard>
            <ChartCard title="Movimento por dia da semana"><Bars data={data.byWeekday} /></ChartCard>
            <ChartCard title="Horários mais procurados">
              {data.topHours.length ? <Bars data={data.topHours} /> : <Muted />}
            </ChartCard>
            <div className="lg:col-span-2">
              <ChartCard title={`Faturamento realizado por mês (${new Date().getFullYear()})`}>
                <Bars data={data.byMonth} format={(v) => brl(v)} />
              </ChartCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="card p-5">
    <p className="mono-micro text-n-500 mb-3 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {title}</p>
    {children}
  </div>
);

const Muted = () => <p className="text-caption text-n-600 py-4 text-center">Sem dados no período.</p>;

export default PerformancePanel;

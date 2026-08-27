'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Appointment, Service } from '@/types/database';
import { ArrowRight, ArrowUpRight, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { statusMeta } from '@/lib/appointments/status';
import { appointmentRevenueCents, indexServices } from '@/lib/finance';
import { toISO, compare } from '@/lib/analytics';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { PillGroup } from '@/components/ui/PillGroup';
import { EmptyState } from '@/components/ui/EmptyState';
import { CountUp } from '@/components/ui/CountUp';
import { AreaChart, type AreaPoint } from '@/components/ui/charts/AreaChart';

interface DashboardOverviewProps {
  professionalName: string;
  brandName: string;
  slug: string;
  appointments: Appointment[];
  services: Service[];
}

type Period = 'hoje' | 'semana' | 'mes' | 'ano';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mês' },
  { key: 'ano', label: 'Ano' },
];

const PERIOD_NOUN: Record<Period, string> = {
  hoje: 'hoje',
  semana: 'nos últimos 7 dias',
  mes: 'neste mês',
  ano: 'neste ano',
};

const COMPARISON_NOUN: Record<Period, string> = {
  hoje: 'que ontem',
  semana: 'que os 7 dias anteriores',
  mes: 'que o mês passado',
  ano: 'que o ano passado',
};

const brl = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const shiftDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  professionalName,
  slug,
  appointments,
  services,
}) => {
  const [period, setPeriod] = useState<Period>('mes');

  const today = useMemo(() => new Date(), []);
  const todayIso = toISO(today);
  const byId = useMemo(() => indexServices(services), [services]);
  const firstName = professionalName?.split(' ')[0] || professionalName;
  const bookingHref = slug ? `/agendar/${slug}` : '#';

  /* Faturamento segue a MESMA regra da aba Contas: confirmados + concluídos.
     Se as duas telas divergirem, a profissional para de confiar nas duas. */
  const billable = useMemo(
    () => appointments.filter((a) => a.status === 'confirmed' || a.status === 'completed'),
    [appointments],
  );

  const revenueBetween = React.useCallback(
    (startIso: string, endIso: string) =>
      billable
        .filter((a) => a.date >= startIso && a.date <= endIso)
        .reduce((sum, a) => sum + appointmentRevenueCents(a, byId), 0),
    [billable, byId],
  );

  /* ---- Período selecionado, período anterior equivalente e a série ---- */
  const { revenue, previous, series } = useMemo(() => {
    if (period === 'hoje') {
      const ontem = toISO(shiftDays(today, -1));
      // Por hora: mostra quanto já entrou ao longo do dia, acumulado.
      const doDia = billable.filter((a) => a.date === todayIso);
      let acc = 0;
      const pontos: AreaPoint[] = [];
      for (let h = 7; h <= 21; h++) {
        acc += doDia
          .filter((a) => Number(a.start_time.slice(0, 2)) === h)
          .reduce((s, a) => s + appointmentRevenueCents(a, byId), 0);
        pontos.push({ label: `${String(h).padStart(2, '0')}:00`, value: acc });
      }
      return { revenue: revenueBetween(todayIso, todayIso), previous: revenueBetween(ontem, ontem), series: pontos };
    }

    if (period === 'semana') {
      const inicio = shiftDays(today, -6);
      const pontos: AreaPoint[] = [];
      let acc = 0;
      for (let i = 0; i < 7; i++) {
        const d = shiftDays(inicio, i);
        const iso = toISO(d);
        acc += revenueBetween(iso, iso);
        pontos.push({ label: `${WEEKDAYS[d.getDay()].slice(0, 3)}, ${d.getDate()}`, value: acc });
      }
      return {
        revenue: revenueBetween(toISO(inicio), todayIso),
        previous: revenueBetween(toISO(shiftDays(today, -13)), toISO(shiftDays(today, -7))),
        series: pontos,
      };
    }

    if (period === 'mes') {
      const inicio = new Date(today.getFullYear(), today.getMonth(), 1);
      const pontos: AreaPoint[] = [];
      let acc = 0;
      for (let dia = 1; dia <= today.getDate(); dia++) {
        const iso = toISO(new Date(today.getFullYear(), today.getMonth(), dia));
        acc += revenueBetween(iso, iso);
        pontos.push({ label: `${dia} de ${MONTHS_SHORT[today.getMonth()]}`, value: acc });
      }
      // Mês anterior ATÉ O MESMO DIA — comparar mês inteiro com mês pela metade
      // faria o painel anunciar queda todo dia 2.
      const prevInicio = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const prevFim = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      return {
        revenue: revenueBetween(toISO(inicio), todayIso),
        previous: revenueBetween(toISO(prevInicio), toISO(prevFim)),
        series: pontos,
      };
    }

    // ano
    const pontos: AreaPoint[] = [];
    let acc = 0;
    for (let m = 0; m <= today.getMonth(); m++) {
      const ini = toISO(new Date(today.getFullYear(), m, 1));
      const fim = toISO(new Date(today.getFullYear(), m + 1, 0));
      acc += revenueBetween(ini, fim);
      pontos.push({ label: `${MONTHS_SHORT[m]} de ${today.getFullYear()}`, value: acc });
    }
    return {
      revenue: revenueBetween(toISO(new Date(today.getFullYear(), 0, 1)), todayIso),
      previous: revenueBetween(
        toISO(new Date(today.getFullYear() - 1, 0, 1)),
        toISO(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())),
      ),
      series: pontos,
    };
  }, [period, today, todayIso, billable, byId, revenueBetween]);

  const delta = compare(revenue, previous);

  /* ---- Métricas dos cards. Nenhuma repete o número do hero. ---- */
  const ativos = useMemo(() => appointments.filter((a) => a.status !== 'cancelled'), [appointments]);
  const deHoje = useMemo(
    () => ativos.filter((a) => a.date === todayIso).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [ativos, todayIso],
  );
  const pendentes = useMemo(() => ativos.filter((a) => a.status === 'pending'), [ativos]);
  const clientes = useMemo(() => new Set(ativos.map((a) => a.client_whatsapp)).size, [ativos]);
  const ticketMedio = useMemo(() => {
    const mes = billable.filter((a) => a.date.startsWith(todayIso.slice(0, 7)));
    if (!mes.length) return 0;
    return mes.reduce((s, a) => s + appointmentRevenueCents(a, byId), 0) / mes.length;
  }, [billable, byId, todayIso]);

  /* ---- Próximos 7 dias (a partir de amanhã) ---- */
  const proximos = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = shiftDays(today, i + 1);
        const iso = toISO(d);
        const dia = ativos.filter((a) => a.date === iso);
        return {
          iso,
          weekday: WEEKDAYS[d.getDay()],
          diaMes: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
          count: dia.length,
          cents: dia
            .filter((a) => a.status === 'confirmed' || a.status === 'completed')
            .reduce((s, a) => s + appointmentRevenueCents(a, byId), 0),
        };
      }),
    [today, ativos, byId],
  );

  const TrendIcon = delta.direction === 'up' ? TrendingUp : delta.direction === 'down' ? TrendingDown : Minus;

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Saudação + filtro de período. O filtro comanda o hero e só ele. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-label text-n-600">
          Bem-vinda de volta, <span className="text-heading font-semibold">{firstName}</span>.
        </p>
        <PillGroup items={PERIODS} value={period} onChange={setPeriod} ariaLabel="Período" />
      </div>

      {/* ===================== BENTO =====================
          Colunas de tamanhos diferentes de propósito: uma grade de cartões
          todos iguais é justamente o que fazia a tela antiga parecer um
          template. 7/5 em cima, 3+3+3+3 no meio, 7/5 embaixo. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* --- HERO: o faturamento. Aparece UMA vez na tela, aqui. --- */}
        <Card hero pad="p-6 sm:p-8" className="lg:col-span-7 flex flex-col">
          <span className="overline text-white/60">Faturamento {PERIOD_NOUN[period]}</span>
          <p className="num text-display font-bold mt-2">
            <CountUp value={revenue} format={brl} />
          </p>

          <div className="flex items-center gap-2 mt-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold ${
                delta.direction === 'down' ? 'bg-white/12 text-white/80' : 'bg-white/15 text-white'
              }`}
            >
              <TrendIcon className="h-4 w-4" aria-hidden />
              <span className="num">{delta.deltaPct > 0 ? '+' : ''}{delta.deltaPct.toFixed(0)}%</span>
            </span>
            <span className="text-caption text-white/60">
              {delta.direction === 'flat' ? 'igual' : delta.direction === 'up' ? 'a mais' : 'a menos'} {COMPARISON_NOUN[period]}
              {' · '}
              <span className="num">{brl(previous)}</span>
            </span>
          </div>

          <div className="mt-auto pt-6 -mx-1">
            <AreaChart data={series} format={brl} tone="onWine" height={110} />
          </div>
        </Card>

        {/* --- Atendimentos de hoje: linha do tempo, ocupa a coluna inteira --- */}
        <Card pad="p-5 sm:p-6" className="lg:col-span-5 lg:row-span-2 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-h3 text-heading">Atendimentos de hoje</h2>
              <p className="text-caption text-n-500 mt-0.5">
                {deHoje.length > 0
                  ? `${deHoje.length} ${deHoje.length === 1 ? 'horário reservado' : 'horários reservados'}`
                  : 'Nada marcado ainda'}
              </p>
            </div>
            <Link
              href="/dashboard/agenda"
              className="shrink-0 inline-flex items-center gap-1 text-caption font-semibold text-wine-600 hover:text-wine-700 transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 rounded-chip"
            >
              Ver agenda <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <div className="mt-5 flex-1">
            {deHoje.length > 0 ? (
              <ol className="relative">
                {/* conector vertical da linha do tempo */}
                <span className="absolute left-[38px] top-2 bottom-2 w-px bg-n-200" aria-hidden />
                {deHoje.map((app, i) => {
                  const m = statusMeta(app.status);
                  return (
                    <li key={app.id} className="stagger-item relative" style={{ ['--i' as string]: i }}>
                      <Link
                        href="/dashboard/appointments"
                        className="tap group flex items-start gap-4 py-2 rounded-chip transition-ui hover:bg-n-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
                      >
                        <span className="num shrink-0 w-[52px] pt-2.5 text-caption text-n-500 text-right">
                          {app.start_time.slice(0, 5)}
                        </span>
                        <span className="relative shrink-0 mt-3 h-2.5 w-2.5 rounded-full bg-wine-700 ring-4 ring-surface" aria-hidden />
                        <span className="min-w-0 flex-1 pb-1">
                          <span className="flex items-center gap-2 justify-between">
                            <span className="text-label font-semibold text-heading truncate">{app.client_name}</span>
                            <StatusPill tone={m.tone}>{m.label}</StatusPill>
                          </span>
                          <span className="block text-caption text-n-500 truncate mt-0.5">
                            {app.service?.name ?? 'Serviço não informado'}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState
                title="Hoje está livre"
                description="Nenhum horário marcado. Divulgue seu link e deixe as clientes escolherem."
                action={
                  <Link
                    href={bookingHref}
                    target="_blank"
                    className="tap inline-flex items-center gap-1.5 h-11 px-4 rounded-control bg-wine-700 text-white text-label font-semibold shadow-wine transition-ui hover:bg-wine-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
                  >
                    Abrir link de agendamento <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </Link>
                }
              />
            )}
          </div>
        </Card>

        {/* --- KPIs: OUTRAS métricas. O faturamento não se repete aqui. --- */}
        <div className="lg:col-span-7 grid grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
          <StatCard label="Atendimentos hoje" value={deHoje.length} hint="Reservados para hoje" />
          <StatCard
            label="Pendentes"
            value={pendentes.length}
            hint={pendentes.length > 0 ? 'Precisam da sua resposta' : 'Tudo em dia'}
            accent={pendentes.length > 0}
            href={pendentes.length > 0 ? '/dashboard/appointments?status=pending' : undefined}
          />
          <StatCard label="Ticket médio" value={brl(ticketMedio)} hint="Média do mês" />
          <StatCard label="Clientes" value={clientes} hint="Na sua carteira" href="/dashboard/clients" />
        </div>

        {/* --- Serviços: tabela de verdade, não lista de cartões --- */}
        <Card pad="p-0" className="lg:col-span-7 overflow-hidden">
          <div className="flex items-start justify-between gap-3 p-5 sm:p-6 pb-4">
            <div>
              <h2 className="text-h3 text-heading">Seus serviços</h2>
              <p className="text-caption text-n-500 mt-0.5">Preços e durações do seu catálogo.</p>
            </div>
            <Link
              href="/dashboard/services"
              className="shrink-0 inline-flex items-center gap-1 text-caption font-semibold text-wine-600 hover:text-wine-700 transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 rounded-chip"
            >
              Gerenciar <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          {services.length > 0 ? (
            <div className="max-h-[320px] overflow-y-auto scroll-touch">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr className="border-y border-line">
                    <th scope="col" className="px-5 sm:px-6 py-2.5 overline text-n-500 font-semibold">Serviço</th>
                    <th scope="col" className="px-3 py-2.5 overline text-n-500 font-semibold text-right">Duração</th>
                    <th scope="col" className="px-5 sm:px-6 py-2.5 overline text-n-500 font-semibold text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s, i) => (
                    <tr
                      key={s.id}
                      className={`group h-[52px] transition-ui hover:bg-wine-50/60 ${i % 2 === 1 ? 'bg-n-25' : ''}`}
                    >
                      <td className="px-5 sm:px-6 text-label text-heading">{s.name}</td>
                      <td className="num px-3 text-caption text-n-500 text-right whitespace-nowrap">{s.duration_minutes} min</td>
                      <td className="num px-5 sm:px-6 text-label font-semibold text-heading text-right whitespace-nowrap">
                        {brl(s.price_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border-t border-line">
              <EmptyState
                title="Nenhum serviço cadastrado"
                description="Cadastre o que você faz, com preço e duração, para as clientes conseguirem agendar."
                action={
                  <Link
                    href="/dashboard/services"
                    className="tap inline-flex items-center gap-1.5 h-11 px-4 rounded-control bg-wine-700 text-white text-label font-semibold shadow-wine transition-ui hover:bg-wine-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
                  >
                    Cadastrar serviço
                  </Link>
                }
              />
            </div>
          )}
        </Card>

        {/* --- Próximos 7 dias --- */}
        <Card pad="p-5 sm:p-6" className="lg:col-span-5">
          <h2 className="text-h3 text-heading">Próximos 7 dias</h2>
          <p className="text-caption text-n-500 mt-0.5">O que já está reservado a partir de amanhã.</p>

          <ul className="mt-4 divide-y divide-line">
            {proximos.map((d, i) => (
              <li key={d.iso} className="stagger-item flex items-center gap-3 h-[52px]" style={{ ['--i' as string]: i }}>
                <span className="min-w-0 flex-1">
                  <span className="block text-label text-heading truncate">{d.weekday}</span>
                  <span className="num block text-caption text-n-500">{d.diaMes}</span>
                </span>
                {d.count > 0 ? (
                  <>
                    <span className="num text-caption text-n-500 whitespace-nowrap">
                      {d.count} {d.count === 1 ? 'horário' : 'horários'}
                    </span>
                    <span className="num text-label font-semibold text-heading whitespace-nowrap w-24 text-right">
                      {brl(d.cents)}
                    </span>
                  </>
                ) : (
                  <span className="text-caption text-n-400 whitespace-nowrap">livre</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;

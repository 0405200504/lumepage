import type { DateRange } from '@/lib/analytics';

/* =========================================================================
   Período das telas de resultado (Contas e Vendas): dia, semana, mês ou um
   intervalo escolhido no calendário. Funções PURAS; datas em "YYYY-MM-DD",
   sempre montadas no fuso local — nunca por toISOString(), que é UTC e
   devolve o dia seguinte depois das 21h no Brasil.
   ========================================================================= */

export type PeriodKind = 'day' | 'week' | 'month' | 'custom';

/** Intervalo fechado [start, end] e o modo em que foi escolhido. */
export interface Period extends DateRange { kind: PeriodKind }

export const MONTHS_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const MONTHS_SHORT_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAYS_SHORT_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const pad = (n: number) => String(n).padStart(2, '0');

export const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "YYYY-MM-DD" → Date local à meia-noite. */
export function dateOf(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = dateOf(iso);
  d.setDate(d.getDate() + n);
  return isoOf(d);
}

/** Dias corridos do intervalo, contando as duas pontas. */
export function daysInRange(r: DateRange): number {
  return Math.round((dateOf(r.end).getTime() - dateOf(r.start).getTime()) / 86400000) + 1;
}

/** A semana vai de domingo a sábado, igual à Agenda. */
export function weekStartOf(iso: string): string {
  return addDays(iso, -dateOf(iso).getDay());
}

const monthEnd = (y: number, m0: number) => isoOf(new Date(y, m0 + 1, 0));

/** O dia, a semana ou o mês que contém `anchor`. */
export function periodFor(kind: Exclude<PeriodKind, 'custom'>, anchor: string): Period {
  if (kind === 'day') return { kind, start: anchor, end: anchor };
  if (kind === 'week') {
    const start = weekStartOf(anchor);
    return { kind, start, end: addDays(start, 6) };
  }
  const d = dateOf(anchor);
  return { kind, start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`, end: monthEnd(d.getFullYear(), d.getMonth()) };
}

/** Anda um período para trás (-1) ou para frente (+1). O personalizado anda
 *  pelo próprio tamanho: 10 dias viram os 10 dias anteriores. */
export function stepPeriod(p: Period, dir: 1 | -1): Period {
  if (p.kind === 'day') return periodFor('day', addDays(p.start, dir));
  if (p.kind === 'week') return periodFor('week', addDays(p.start, 7 * dir));
  if (p.kind === 'month') {
    const d = dateOf(p.start);
    return periodFor('month', isoOf(new Date(d.getFullYear(), d.getMonth() + dir, 1)));
  }
  const len = daysInRange(p);
  return { kind: 'custom', start: addDays(p.start, len * dir), end: addDays(p.end, len * dir) };
}

/** O período de comparação: o anterior de mesmo tipo (ontem, semana passada,
 *  mês passado) ou, no personalizado, os mesmos N dias logo antes. */
export function previousPeriod(p: Period): DateRange {
  return stepPeriod(p, -1);
}

const dayMonth = (iso: string) => {
  const d = dateOf(iso);
  return `${d.getDate()} ${MONTHS_SHORT_PT[d.getMonth()]}`;
};

/** "15 set – 14 out", com o ano só quando ele não é o de hoje ou muda no meio. */
export function rangeLabel(r: DateRange, today: string): string {
  const s = dateOf(r.start), e = dateOf(r.end);
  const thisYear = dateOf(today).getFullYear();
  if (r.start === r.end) {
    return `${dayMonth(r.start)}${s.getFullYear() !== thisYear ? ` ${s.getFullYear()}` : ''}`;
  }
  const sameYear = s.getFullYear() === e.getFullYear();
  const startTxt = sameYear && s.getMonth() === e.getMonth() ? String(s.getDate()) : dayMonth(r.start);
  const showYear = !sameYear || e.getFullYear() !== thisYear;
  if (!sameYear) return `${startTxt} ${s.getFullYear()} – ${dayMonth(r.end)} ${e.getFullYear()}`;
  return `${startTxt} – ${dayMonth(r.end)}${showYear ? ` ${e.getFullYear()}` : ''}`;
}

/** O texto do botão do período: "Hoje, 1 out", "Outubro 2026", "27 set – 3 out". */
export function periodLabel(p: Period, today: string): string {
  if (p.kind === 'day') {
    if (p.start === today) return `Hoje, ${dayMonth(p.start)}`;
    if (p.start === addDays(today, -1)) return `Ontem, ${dayMonth(p.start)}`;
    const d = dateOf(p.start);
    return `${WEEKDAYS_SHORT_PT[d.getDay()]}, ${rangeLabel(p, today)}`;
  }
  if (p.kind === 'month') {
    const d = dateOf(p.start);
    const name = MONTHS_PT[d.getMonth()];
    return `${name[0].toUpperCase()}${name.slice(1)} ${d.getFullYear()}`;
  }
  return rangeLabel(p, today);
}

/** O complemento dos títulos: "Lucro líquido de hoje", "Total de vendas do mês". */
export function periodPhrase(p: Period, today: string): string {
  const hasToday = today >= p.start && today <= p.end;
  if (p.kind === 'day') return p.start === today ? 'de hoje' : p.start === addDays(today, -1) ? 'de ontem' : 'do dia';
  if (p.kind === 'week') return hasToday ? 'desta semana' : 'da semana';
  if (p.kind === 'month') return hasToday ? 'deste mês' : 'do mês';
  return 'do período';
}

/** Legenda do selo de variação: "vs. dia anterior". */
export function comparisonLabel(kind: PeriodKind): string {
  return { day: 'vs. dia anterior', week: 'vs. semana anterior', month: 'vs. mês anterior', custom: 'vs. período anterior' }[kind];
}

/** Nome curto para arquivo exportado: "2026-10" no mês, "2026-09-15_a_2026-10-14" no resto. */
export function periodSlug(p: Period): string {
  if (p.kind === 'month') return p.start.slice(0, 7);
  return p.start === p.end ? p.start : `${p.start}_a_${p.end}`;
}

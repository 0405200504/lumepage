'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { DateRange } from '@/lib/analytics';
import {
  Period, PeriodKind, periodFor, stepPeriod, periodLabel, rangeLabel, daysInRange,
  isoOf, dateOf, addDays, weekStartOf, MONTHS_PT, MONTHS_SHORT_PT,
} from '@/lib/period';
import { Portal } from './Portal';

/**
 * Seletor de período das telas de resultado (Contas e Vendas).
 *
 * Dia, Semana e Mês andam com as setas e abrem o calendário no botão do meio,
 * para pular direto para qualquer data. Personalizado abre o calendário
 * inteiro: toca no primeiro dia, toca no último, Aplicar. No computador ele é
 * um popover com dois meses lado a lado; no celular, uma folha que sobe de
 * baixo com um mês por vez.
 */

interface PeriodPickerProps {
  value: Period;
  onChange: (p: Period) => void;
  /** Hoje em YYYY-MM-DD — o mesmo "hoje" que a tela usa nas contas. */
  today: string;
  /** Primeiro e último dia com movimento: vira o atalho "Todo o período". */
  allTime?: DateRange | null;
  /** O botão de ação da tela. No celular ele divide a linha com o período. */
  action?: React.ReactNode;
  /** Alvo do tour de boas-vindas, quando o seletor é o controle principal da tela. */
  dataTour?: string;
  className?: string;
}

const KINDS: { key: PeriodKind; label: string }[] = [
  { key: 'day', label: 'Dia' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'custom', label: 'Personalizado' },
];

const SHEET_TITLE: Record<PeriodKind, string> = {
  day: 'Escolher dia', week: 'Escolher semana', month: 'Escolher mês', custom: 'Escolher datas',
};

const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const pad = (n: number) => String(n).padStart(2, '0');
const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);
const firstOfMonth = (iso: string) => `${iso.slice(0, 7)}-01`;
const shiftMonth = (first: string, n: number) => {
  const d = dateOf(first);
  return isoOf(new Date(d.getFullYear(), d.getMonth() + n, 1));
};

function useMedia(query: string): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatch(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [query]);
  return match;
}

function shortcutsFor(today: string, allTime?: DateRange | null): { label: string; range: DateRange }[] {
  const t = dateOf(today);
  const y = t.getFullYear();
  const lastMonth = periodFor('month', isoOf(new Date(y, t.getMonth() - 1, 1)));
  const list = [
    { label: 'Últimos 7 dias', range: { start: addDays(today, -6), end: today } },
    { label: 'Últimos 30 dias', range: { start: addDays(today, -29), end: today } },
    { label: 'Últimos 90 dias', range: { start: addDays(today, -89), end: today } },
    { label: 'Mês passado', range: { start: lastMonth.start, end: lastMonth.end } },
    { label: 'Este ano', range: { start: `${y}-01-01`, end: `${y}-12-31` } },
    { label: 'Ano passado', range: { start: `${y - 1}-01-01`, end: `${y - 1}-12-31` } },
  ];
  if (allTime) list.push({ label: 'Todo o período', range: allTime });
  return list;
}

export function PeriodPicker({ value, onChange, today, allTime, action, dataTour, className = '' }: PeriodPickerProps) {
  // Qual calendário está aberto (null = fechado). Normalmente é o do próprio
  // período; "Personalizado" abre o de intervalo antes de mudar o valor.
  const [open, setOpen] = useState<PeriodKind | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const isPhone = useMedia('(max-width: 639px)');
  const isWide = useMedia('(min-width: 1024px)');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    const onDown = (e: MouseEvent) => {
      if (!isPhone && wrap.current && !wrap.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, isPhone]);

  // Folha aberta no celular: a página de trás não rola junto.
  useEffect(() => {
    if (!open || !isPhone) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open, isPhone]);

  const pickKind = (kind: PeriodKind) => {
    if (kind === 'custom') { setOpen(open === 'custom' ? null : 'custom'); return; }
    // Fica onde ela está: se o período atual tem o dia de hoje, abre o de
    // hoje; se ela tinha voltado para junho, a semana é a de junho.
    const anchor = today >= value.start && today <= value.end ? today : value.start;
    onChange(periodFor(kind, anchor));
    setOpen(null);
  };

  const apply = (p: Period) => { onChange(p); setOpen(null); };
  const activeKind = open === 'custom' ? 'custom' : value.kind;

  const panel = open && (
    <CalendarPanel
      key={open}
      mode={open}
      value={value}
      today={today}
      allTime={allTime}
      months={open === 'custom' && isWide ? 2 : 1}
      sheet={isPhone}
      onApply={apply}
      onClose={() => setOpen(null)}
    />
  );

  const popover = open && (
    <div
      role="dialog"
      aria-label={SHEET_TITLE[open]}
      className="absolute left-0 top-full mt-2 z-40 bg-surface rounded-surface shadow-[var(--shadow-lg)] animate-fade-up"
    >
      {panel}
    </div>
  );

  return (
    <div ref={wrap} className={`relative flex flex-wrap items-center gap-2 ${className}`}>
      {/* No celular o seletor ocupa a linha inteira; a data e o botão da tela
          descem juntos para a linha de baixo. */}
      <div className="w-full sm:w-auto">
        <div className="segmented" role="group" aria-label="Período" data-tour={dataTour}>
          {KINDS.map(k => (
            <button
              key={k.key}
              type="button"
              onClick={() => pickKind(k.key)}
              aria-pressed={activeKind === k.key}
              data-active={activeKind === k.key ? 'true' : undefined}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex items-center gap-1 flex-1 sm:flex-none min-w-0">
        <button type="button" onClick={() => onChange(stepPeriod(value, -1))} aria-label="Período anterior" className="icon-chip">
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setOpen(open ? null : value.kind)}
          aria-haspopup="dialog"
          aria-expanded={!!open}
          className="flex-1 sm:flex-none min-w-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 h-10 sm:h-9 px-3 sm:px-4 rounded-full bg-surface shadow-[var(--shadow-sm)] text-body-sm font-semibold text-heading hover:bg-n-50 transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
        >
          <CalendarDays className="h-4 w-4 text-wine-700 shrink-0" aria-hidden />
          <span className="truncate num">{periodLabel(value, today)}</span>
        </button>
        <button type="button" onClick={() => onChange(stepPeriod(value, 1))} aria-label="Próximo período" className="icon-chip">
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
        {open && open !== 'custom' && !isPhone && popover}
      </div>

      {action && <div className="shrink-0 sm:ml-auto">{action}</div>}

      {/* O intervalo tem dois meses e atalhos: ancora na borda esquerda da
          tela, não no botão, para não vazar pela direita. */}
      {open === 'custom' && !isPhone && popover}

      {open && isPhone && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-end">
            <div className="absolute inset-0 sheet-backdrop" onClick={() => setOpen(null)} aria-hidden />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={SHEET_TITLE[open]}
              className="relative z-10 w-full max-h-[92vh] overflow-y-auto bg-surface rounded-t-hero shadow-[var(--shadow-lg)] animate-slide-up"
            >
              {panel}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

/* ---------------- calendário ---------------- */

interface CalendarPanelProps {
  mode: PeriodKind;
  value: Period;
  today: string;
  allTime?: DateRange | null;
  months: 1 | 2;
  sheet: boolean;
  onApply: (p: Period) => void;
  onClose: () => void;
}

function CalendarPanel({ mode, value, today, allTime, months, sheet, onApply, onClose }: CalendarPanelProps) {
  const customValue = value.kind === 'custom' ? value : null;
  // `view` é o 1º dia do ÚLTIMO mês visível: no intervalo, o mês do fim
  // fica à direita e o anterior à esquerda — quase toda consulta olha
  // para trás, não para frente.
  const [view, setView] = useState(() =>
    firstOfMonth(mode === 'custom' ? (customValue?.end ?? today) : value.start));
  const [year, setYear] = useState(() => dateOf(mode === 'custom' ? (customValue?.end ?? today) : value.start).getFullYear());
  const [jumping, setJumping] = useState(false);
  const [start, setStart] = useState<string | null>(customValue?.start ?? null);
  const [end, setEnd] = useState<string | null>(customValue?.end ?? null);
  const [hover, setHover] = useState<string | null>(null);

  const visible = months === 2 ? [shiftMonth(view, -1), view] : [view];

  // O que pintar: as pontas (a, b) e, na semana, a faixa de pré-visualização.
  let a: string | null = null, b: string | null = null;
  let previewA: string | null = null, previewB: string | null = null;
  if (mode === 'custom') {
    a = start;
    b = end ?? (start && hover ? hover : null);
    if (a && b && b < a) [a, b] = [b, a];
    if (a && !b) b = a;
  } else if (mode === 'day' || mode === 'week') {
    a = value.start; b = value.end;
    if (mode === 'week' && hover) { previewA = weekStartOf(hover); previewB = addDays(previewA, 6); }
  }

  const pickDay = (iso: string) => {
    if (mode === 'day') return onApply(periodFor('day', iso));
    if (mode === 'week') return onApply(periodFor('week', iso));
    if (!start || end) { setStart(iso); setEnd(null); return; }
    if (iso < start) { setEnd(start); setStart(iso); } else setEnd(iso);
  };

  const applyCustom = () => {
    if (!a) return;
    onApply({ kind: 'custom', start: a, end: b ?? a });
  };

  const pickMonth = (m0: number) => {
    const first = `${year}-${pad(m0 + 1)}-01`;
    if (mode === 'month') return onApply(periodFor('month', first));
    // Pulando de mês no calendário de dias: o escolhido fica à esquerda.
    setView(months === 2 ? shiftMonth(first, 1) : first);
    setJumping(false);
  };

  const status = !start
    ? 'Toque no primeiro dia'
    : !end
      ? `${rangeLabel({ start, end: start }, today)} → toque no último dia`
      : `${rangeLabel({ start: a!, end: b! }, today)} · ${daysInRange({ start: a!, end: b! })} ${daysInRange({ start: a!, end: b! }) === 1 ? 'dia' : 'dias'}`;

  const showMonths = mode === 'month' || jumping;
  const shortcuts = mode === 'custom' ? shortcutsFor(today, allTime) : [];

  const quick = mode === 'day' ? { label: 'Ir para hoje', p: periodFor('day', today) }
    : mode === 'week' ? { label: 'Esta semana', p: periodFor('week', today) }
    : mode === 'month' ? { label: 'Este mês', p: periodFor('month', today) }
    : null;

  return (
    <div className={sheet ? 'safe-sheet' : ''}>
      {sheet && (
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <h2 className="text-h3 text-heading">{SHEET_TITLE[mode]}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="icon-chip">
            <X className="h-[18px] w-[18px]" aria-hidden />
          </button>
        </div>
      )}

      <div className={`flex ${sheet ? 'flex-col' : 'flex-row'}`}>
        {shortcuts.length > 0 && (
          sheet ? (
            <div className="flex gap-2 overflow-x-auto px-5 pt-3 pb-1 scrollbar-none">
              {shortcuts.map(s => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => onApply({ kind: 'custom', ...s.range })}
                  className="shrink-0 h-9 px-3.5 rounded-full bg-surface-2 text-caption font-semibold text-ink hover:bg-n-150 transition-ui"
                >
                  {s.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="w-40 shrink-0 border-r border-line p-2 flex flex-col gap-0.5">
              <p className="px-2.5 pt-1.5 pb-1 text-micro font-semibold uppercase tracking-wider text-n-500">Atalhos</p>
              {shortcuts.map(s => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => onApply({ kind: 'custom', ...s.range })}
                  className="text-left px-2.5 py-2 rounded-chip text-body-sm text-ink hover:bg-surface-2 transition-ui"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )
        )}

        <div className={`${sheet ? 'px-3 pt-2' : 'p-3'}`}>
          {showMonths ? (
            <MonthPicker
              year={year}
              onYear={setYear}
              selected={mode === 'month' ? value.start.slice(0, 7) : visible[0].slice(0, 7)}
              current={today.slice(0, 7)}
              onPick={pickMonth}
              sheet={sheet}
            />
          ) : (
            <div className={`flex ${months === 2 ? 'gap-6' : ''}`} onMouseLeave={() => setHover(null)}>
              {visible.map((first, i) => (
                <MonthGrid
                  key={first}
                  first={first}
                  today={today}
                  a={a} b={b}
                  previewA={previewA} previewB={previewB}
                  sheet={sheet}
                  onPrev={i === 0 ? () => setView(v => shiftMonth(v, -1)) : undefined}
                  onNext={i === visible.length - 1 ? () => setView(v => shiftMonth(v, 1)) : undefined}
                  onTitle={() => { setYear(dateOf(first).getFullYear()); setJumping(true); }}
                  onPick={pickDay}
                  onHover={setHover}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {mode === 'custom' ? (
        <div className={`flex items-center justify-between gap-3 border-t border-line ${sheet ? 'px-5 pt-3 flex-col items-stretch' : 'px-4 py-3'}`}>
          <p className={`text-caption text-n-600 num ${sheet ? 'text-center' : ''}`} aria-live="polite">{status}</p>
          <div className={`flex gap-2 ${sheet ? '' : 'shrink-0'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`h-9 px-4 rounded-full text-body-sm font-semibold text-n-600 hover:bg-surface-2 transition-ui ${sheet ? 'flex-1 h-11' : ''}`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={applyCustom}
              disabled={!start}
              className={`h-9 px-5 rounded-full bg-wine-700 hover:bg-wine-800 text-white text-body-sm font-semibold transition-ui disabled:opacity-40 disabled:pointer-events-none ${sheet ? 'flex-1 h-11' : ''}`}
            >
              Aplicar
            </button>
          </div>
        </div>
      ) : quick && (
        <div className={`border-t border-line flex justify-center ${sheet ? 'px-5 pt-3' : 'px-3 py-2'}`}>
          <button
            type="button"
            onClick={() => onApply(quick.p)}
            className="h-9 px-4 rounded-full text-body-sm font-semibold text-wine-700 hover:bg-wine-50 transition-ui"
          >
            {quick.label}
          </button>
        </div>
      )}
    </div>
  );
}

interface MonthGridProps {
  first: string;
  today: string;
  a: string | null; b: string | null;
  previewA: string | null; previewB: string | null;
  sheet: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onTitle: () => void;
  onPick: (iso: string) => void;
  onHover: (iso: string | null) => void;
}

function MonthGrid({ first, today, a, b, previewA, previewB, sheet, onPrev, onNext, onTitle, onPick, onHover }: MonthGridProps) {
  const d0 = dateOf(first);
  const y = d0.getFullYear(), m = d0.getMonth();
  const lead = d0.getDay();
  const total = new Date(y, m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: total }, (_, i) => `${y}-${pad(m + 1)}-${pad(i + 1)}`),
  ];
  while (cells.length % 7) cells.push(null);

  const cell = sheet ? 'h-11' : 'h-9';
  const dot = sheet ? 'h-10 w-10' : 'h-8 w-8';

  return (
    <div className={sheet ? 'w-full' : 'w-[252px]'}>
      <div className="flex items-center justify-between mb-1 h-9">
        {onPrev
          ? <button type="button" onClick={onPrev} aria-label="Mês anterior" className="icon-chip"><ChevronLeft className="h-4 w-4" aria-hidden /></button>
          : <span className="w-9" />}
        <button
          type="button"
          onClick={onTitle}
          className="px-3 h-9 rounded-full text-body-sm font-semibold text-heading hover:bg-surface-2 transition-ui"
          aria-label={`${capitalize(MONTHS_PT[m])} de ${y} — escolher outro mês`}
        >
          {capitalize(MONTHS_PT[m])} {y}
        </button>
        {onNext
          ? <button type="button" onClick={onNext} aria-label="Próximo mês" className="icon-chip"><ChevronRight className="h-4 w-4" aria-hidden /></button>
          : <span className="w-9" />}
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAY_INITIALS.map((w, i) => (
          <div key={i} className="text-center text-micro font-semibold text-n-500 py-1.5">{w}</div>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <div key={`e${i}`} className={cell} />;
          const day = Number(iso.slice(8));
          const wd = i % 7;
          const isA = iso === a, isB = iso === b;
          const edge = isA || isB;
          const single = a === b;
          const between = !!(a && b && iso > a && iso < b);
          const inPreview = !!(previewA && previewB && iso >= previewA && iso <= previewB);
          const isToday = iso === today;

          // Faixa entre as pontas. Arredonda onde a linha da semana ou o mês
          // acabam, para a faixa nunca ficar cortada no meio do nada.
          const roundL = wd === 0 || day === 1;
          const roundR = wd === 6 || day === total;
          let band = '';
          if (!single && (between || edge)) {
            band = isA ? 'left-1/2 right-0' : isB ? 'left-0 right-1/2' : 'inset-x-0';
            if (between && roundL) band += ' rounded-l-full';
            if (between && roundR) band += ' rounded-r-full';
            if (isA && roundR) band = '';
            if (isB && roundL) band = '';
          }

          return (
            <div key={iso} className={`relative flex items-center justify-center ${cell}`}>
              {inPreview && !between && !edge && (
                <span className={`absolute inset-y-0.5 inset-x-0 bg-n-100 ${wd === 0 ? 'rounded-l-full' : ''} ${wd === 6 ? 'rounded-r-full' : ''}`} aria-hidden />
              )}
              {band && <span className={`absolute inset-y-0.5 bg-wine-50 ${band}`} aria-hidden />}
              <button
                type="button"
                onClick={() => onPick(iso)}
                onMouseEnter={() => onHover(iso)}
                onFocus={() => onHover(iso)}
                aria-pressed={edge || between}
                aria-current={isToday ? 'date' : undefined}
                aria-label={`${day} de ${MONTHS_PT[m]} de ${y}`}
                className={`relative z-10 ${dot} rounded-full text-body-sm num transition-ui focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-wine-700 ${
                  edge ? 'bg-wine-700 text-white font-semibold'
                  : between ? 'text-wine-800 font-semibold hover:bg-wine-100'
                  : isToday ? 'text-wine-700 font-bold ring-1 ring-inset ring-wine-300 hover:bg-wine-50'
                  : 'text-ink hover:bg-n-100'
                }`}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface MonthPickerProps {
  year: number;
  onYear: (y: number) => void;
  selected: string; // YYYY-MM
  current: string;  // YYYY-MM
  onPick: (m0: number) => void;
  sheet: boolean;
}

function MonthPicker({ year, onYear, selected, current, onPick, sheet }: MonthPickerProps) {
  return (
    <div className={sheet ? 'w-full' : 'w-[252px]'}>
      <div className="flex items-center justify-between mb-2 h-9">
        <button type="button" onClick={() => onYear(year - 1)} aria-label="Ano anterior" className="icon-chip"><ChevronLeft className="h-4 w-4" aria-hidden /></button>
        <span className="text-body-sm font-semibold text-heading num">{year}</span>
        <button type="button" onClick={() => onYear(year + 1)} aria-label="Próximo ano" className="icon-chip"><ChevronRight className="h-4 w-4" aria-hidden /></button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {MONTHS_SHORT_PT.map((name, m0) => {
          const ym = `${year}-${pad(m0 + 1)}`;
          const isSel = ym === selected;
          const isNow = ym === current;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onPick(m0)}
              aria-pressed={isSel}
              aria-label={`${capitalize(MONTHS_PT[m0])} de ${year}`}
              className={`${sheet ? 'h-12' : 'h-10'} rounded-full text-body-sm capitalize transition-ui focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-wine-700 ${
                isSel ? 'bg-wine-700 text-white font-semibold'
                : isNow ? 'text-wine-700 font-bold ring-1 ring-inset ring-wine-300 hover:bg-wine-50'
                : 'text-ink hover:bg-n-100'
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PeriodPicker;

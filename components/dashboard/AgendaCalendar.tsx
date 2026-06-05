'use client';

import React, { useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, CalendarDays, CalendarRange, LayoutGrid,
  X, MessageCircle, Clock, PartyPopper, Sparkles
} from 'lucide-react';
import { Appointment, TimeBlock } from '@/types/database';
import { getHolidayMap, Holiday } from '@/lib/holidays/brazil';
import { statusMeta } from '@/lib/appointments/status';
import { buildReminderLink } from '@/lib/whatsapp';

type View = 'year' | 'month' | 'week';

interface AgendaCalendarProps {
  appointments: Appointment[];
  timeBlocks: TimeBlock[];
  reminderTemplate?: string;
}

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const pad = (n: number) => n.toString().padStart(2, '0');
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const addMonths = (d: Date, n: number) => { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; };
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfWeek = (d: Date) => addDays(d, -d.getDay());
const sameDay = (a: Date, b: Date) => isoOf(a) === isoOf(b);

export const AgendaCalendar: React.FC<AgendaCalendarProps> = ({
  appointments,
  timeBlocks,
  reminderTemplate,
}) => {
  const today = new Date();
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState<Date>(startOfMonth(today));
  const [selectedISO, setSelectedISO] = useState<string | null>(null);

  // Índice de agendamentos por data (ignora cancelados na contagem visual de carga)
  const apptByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      (map[a.date] ||= []).push(a);
    }
    for (const k in map) {
      map[k].sort((x, y) => x.start_time.localeCompare(y.start_time));
    }
    return map;
  }, [appointments]);

  const blockByDate = useMemo(() => {
    const map: Record<string, TimeBlock[]> = {};
    for (const b of timeBlocks) (map[b.date] ||= []).push(b);
    return map;
  }, [timeBlocks]);

  const holidayMap = useMemo<Record<string, Holiday>>(() => {
    const y = cursor.getFullYear();
    return getHolidayMap([y - 1, y, y + 1]);
  }, [cursor]);

  const activeOf = (list: Appointment[] = []) => list.filter(a => a.status !== 'cancelled');

  const goToday = () => { setCursor(startOfMonth(today)); };
  const step = (dir: 1 | -1) => {
    if (view === 'year') setCursor(new Date(cursor.getFullYear() + dir, 0, 1));
    else if (view === 'month') setCursor(addMonths(cursor, dir));
    else setCursor(addDays(cursor, dir * 7));
  };

  const title = useMemo(() => {
    if (view === 'year') return `${cursor.getFullYear()}`;
    if (view === 'month') return `${MONTHS[cursor.getMonth()]} de ${cursor.getFullYear()}`;
    const ws = startOfWeek(cursor);
    const we = addDays(ws, 6);
    const sameMonth = ws.getMonth() === we.getMonth();
    return sameMonth
      ? `${ws.getDate()}–${we.getDate()} de ${MONTHS[ws.getMonth()]} ${ws.getFullYear()}`
      : `${ws.getDate()} ${MONTHS[ws.getMonth()].slice(0, 3)} – ${we.getDate()} ${MONTHS[we.getMonth()].slice(0, 3)} ${we.getFullYear()}`;
  }, [view, cursor]);

  return (
    <div className="space-y-5 select-none animate-fade-up">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-paper border border-gray-150 rounded-2xl p-1 shadow-soft">
            <button onClick={() => step(-1)} className="p-2 rounded-xl hover:bg-cream text-gray-450 hover:text-forest transition-colors" aria-label="Anterior">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => step(1)} className="p-2 rounded-xl hover:bg-cream text-gray-450 hover:text-forest transition-colors" aria-label="Próximo">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button onClick={goToday} className="px-4 py-2.5 bg-paper border border-gray-150 rounded-2xl text-xs font-bold text-forest shadow-soft hover:bg-cream transition-colors">
            Hoje
          </button>
          <h3 className="text-lg md:text-xl font-black text-forest tracking-tight ml-1 capitalize">{title}</h3>
        </div>

        {/* Switcher de visão */}
        <div className="flex items-center bg-paper border border-gray-150 rounded-2xl p-1 shadow-soft self-start">
          {([
            { k: 'year', label: 'Ano', icon: LayoutGrid },
            { k: 'month', label: 'Mês', icon: CalendarDays },
            { k: 'week', label: 'Semana', icon: CalendarRange },
          ] as const).map(({ k, label, icon: Icon }) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all-custom ${
                view === k ? 'surface-wine text-white shadow-soft' : 'text-gray-450 hover:text-forest'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-semibold text-gray-450">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#2e7d5b]" /> Confirmado</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#b07a23]" /> Pendente</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-wine-700" /> Finalizado</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#b23a48]" /> Falta</span>
        <span className="inline-flex items-center gap-1.5"><PartyPopper className="h-3 w-3 text-wine-500" /> Feriado nacional</span>
      </div>

      {view === 'month' && (
        <MonthView
          cursor={cursor}
          today={today}
          apptByDate={apptByDate}
          holidayMap={holidayMap}
          blockByDate={blockByDate}
          activeOf={activeOf}
          onSelectDay={setSelectedISO}
        />
      )}

      {view === 'week' && (
        <WeekView
          cursor={cursor}
          today={today}
          apptByDate={apptByDate}
          holidayMap={holidayMap}
          activeOf={activeOf}
          onSelectDay={setSelectedISO}
        />
      )}

      {view === 'year' && (
        <YearView
          cursor={cursor}
          today={today}
          apptByDate={apptByDate}
          holidayMap={holidayMap}
          activeOf={activeOf}
          onPickMonth={(m) => { setCursor(new Date(cursor.getFullYear(), m, 1)); setView('month'); }}
        />
      )}

      {selectedISO && (
        <DayDetail
          iso={selectedISO}
          appts={apptByDate[selectedISO] || []}
          holiday={holidayMap[selectedISO]}
          blocks={blockByDate[selectedISO] || []}
          reminderTemplate={reminderTemplate}
          onClose={() => setSelectedISO(null)}
        />
      )}
    </div>
  );
};

/* ---------------- MÊS ---------------- */
const MonthView: React.FC<{
  cursor: Date; today: Date;
  apptByDate: Record<string, Appointment[]>;
  holidayMap: Record<string, Holiday>;
  blockByDate: Record<string, TimeBlock[]>;
  activeOf: (l?: Appointment[]) => Appointment[];
  onSelectDay: (iso: string) => void;
}> = ({ cursor, today, apptByDate, holidayMap, blockByDate, activeOf, onSelectDay }) => {
  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-150 bg-cream/60">
        {WEEKDAYS_SHORT.map((w, i) => (
          <div key={w} className={`py-2.5 text-center text-[10px] font-black uppercase tracking-wider ${i === 0 ? 'text-wine-500' : 'text-gray-450'}`}>
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const iso = isoOf(day);
          const inMonth = day.getMonth() === cursor.getMonth();
          const isToday = sameDay(day, today);
          const holiday = holidayMap[iso];
          const appts = activeOf(apptByDate[iso]);
          const hasBlock = (blockByDate[iso] || []).length > 0;
          const isSunday = day.getDay() === 0;

          return (
            <button
              key={idx}
              onClick={() => onSelectDay(iso)}
              className={`group relative min-h-[104px] text-left p-2 border-b border-r border-gray-150 last:border-r-0 transition-colors hover:bg-cream/70 ${
                !inMonth ? 'bg-cream/40' : ''
              } ${(holiday || isSunday) && inMonth ? 'bg-wine-50/50' : ''} ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center justify-center h-6 w-6 text-[11px] font-bold rounded-full ${
                  isToday ? 'surface-wine text-white shadow-soft' : inMonth ? 'text-ink' : 'text-gray-450/50'
                }`}>
                  {day.getDate()}
                </span>
                {appts.length > 0 && (
                  <span className="text-[9px] font-black text-wine-600 bg-wine-100/70 rounded-full px-1.5 py-0.5">{appts.length}</span>
                )}
              </div>

              {holiday && (
                <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-wine-600 truncate">
                  <PartyPopper className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{holiday.name}</span>
                </div>
              )}
              {hasBlock && !holiday && (
                <div className="mt-1 text-[9px] font-bold text-gray-450 truncate">Bloqueio</div>
              )}

              <div className="mt-1 space-y-1">
                {appts.slice(0, 3).map((a) => {
                  const m = statusMeta(a.status);
                  return (
                    <div key={a.id} className={`truncate rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${m.block}`}>
                      {a.start_time.substring(0, 5)} {a.client_name.split(' ')[0]}
                    </div>
                  );
                })}
                {appts.length > 3 && (
                  <div className="text-[9px] font-bold text-gray-450 pl-1">+{appts.length - 3} mais</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ---------------- SEMANA ---------------- */
const WeekView: React.FC<{
  cursor: Date; today: Date;
  apptByDate: Record<string, Appointment[]>;
  holidayMap: Record<string, Holiday>;
  activeOf: (l?: Appointment[]) => Appointment[];
  onSelectDay: (iso: string) => void;
}> = ({ cursor, today, apptByDate, holidayMap, activeOf, onSelectDay }) => {
  const ws = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-3">
      {days.map((day) => {
        const iso = isoOf(day);
        const isToday = sameDay(day, today);
        const holiday = holidayMap[iso];
        const appts = activeOf(apptByDate[iso]);
        return (
          <div key={iso} className={`card p-3 flex flex-col min-h-[180px] ${isToday ? 'ring-2 ring-wine-700/30' : ''}`}>
            <button onClick={() => onSelectDay(iso)} className="text-left">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-wider ${day.getDay() === 0 ? 'text-wine-500' : 'text-gray-450'}`}>
                  {WEEKDAYS_SHORT[day.getDay()]}
                </span>
                <span className={`inline-flex items-center justify-center h-7 w-7 text-xs font-bold rounded-full ${isToday ? 'surface-wine text-white' : 'text-ink'}`}>
                  {day.getDate()}
                </span>
              </div>
              {holiday && (
                <div className="mt-1.5 flex items-center gap-1 text-[9px] font-bold text-wine-600">
                  <PartyPopper className="h-2.5 w-2.5" /> <span className="truncate">{holiday.name}</span>
                </div>
              )}
            </button>

            <div className="mt-2 space-y-1.5 flex-1 overflow-y-auto">
              {appts.length === 0 ? (
                <p className="text-[10px] text-gray-450/70 pt-4 text-center">Sem agendamentos</p>
              ) : appts.map((a) => {
                const m = statusMeta(a.status);
                return (
                  <button key={a.id} onClick={() => onSelectDay(iso)} className={`w-full text-left rounded-xl border px-2 py-1.5 ${m.block}`}>
                    <p className="text-[10px] font-black">{a.start_time.substring(0, 5)}</p>
                    <p className="text-[11px] font-bold truncate">{a.client_name}</p>
                    <p className="text-[9px] opacity-80 truncate">{a.service?.name}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- ANO ---------------- */
const YearView: React.FC<{
  cursor: Date; today: Date;
  apptByDate: Record<string, Appointment[]>;
  holidayMap: Record<string, Holiday>;
  activeOf: (l?: Appointment[]) => Appointment[];
  onPickMonth: (month: number) => void;
}> = ({ cursor, today, apptByDate, holidayMap, activeOf, onPickMonth }) => {
  const year = cursor.getFullYear();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {Array.from({ length: 12 }, (_, m) => {
        const monthStart = new Date(year, m, 1);
        const gridStart = startOfWeek(monthStart);
        const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
        return (
          <div key={m} className="card p-3">
            <button onClick={() => onPickMonth(m)} className="w-full text-left mb-2 flex items-center justify-between group">
              <span className="text-sm font-black text-forest capitalize group-hover:underline">{MONTHS[m]}</span>
              <CalendarDays className="h-3.5 w-3.5 text-gray-450 group-hover:text-forest" />
            </button>
            <div className="grid grid-cols-7 gap-0.5">
              {WEEKDAYS_SHORT.map((w, i) => (
                <div key={w} className={`text-center text-[8px] font-bold ${i === 0 ? 'text-wine-400' : 'text-gray-450/60'}`}>{w[0]}</div>
              ))}
              {days.map((day, i) => {
                const iso = isoOf(day);
                const inMonth = day.getMonth() === m;
                const isToday = sameDay(day, today);
                const holiday = holidayMap[iso];
                const count = activeOf(apptByDate[iso]).length;
                return (
                  <div key={i} className="aspect-square flex items-center justify-center">
                    <span className={`relative flex items-center justify-center h-5 w-5 text-[9px] rounded-full ${
                      !inMonth ? 'text-gray-450/30'
                      : isToday ? 'surface-wine text-white font-bold'
                      : holiday ? 'text-wine-600 font-bold ring-1 ring-wine-300'
                      : 'text-ink'
                    }`}>
                      {day.getDate()}
                      {inMonth && count > 0 && !isToday && (
                        <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-wine-600" />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- DETALHE DO DIA ---------------- */
const DayDetail: React.FC<{
  iso: string;
  appts: Appointment[];
  holiday?: Holiday;
  blocks: TimeBlock[];
  reminderTemplate?: string;
  onClose: () => void;
}> = ({ iso, appts, holiday, blocks, reminderTemplate, onClose }) => {
  const [y, mo, d] = iso.split('-').map(Number);
  const dateObj = new Date(y, mo - 1, d);
  const longLabel = `${WEEKDAYS_SHORT[dateObj.getDay()]}, ${d} de ${MONTHS[mo - 1]} de ${y}`;
  const ordered = [...appts].sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#1a0e12]/45 backdrop-blur-sm animate-fade-up" onClick={onClose} />
      <aside className="relative w-full max-w-md h-full bg-paper shadow-glow flex flex-col animate-slide-right">
        <div className="surface-wine text-white p-6 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">Detalhes do dia</p>
            <h3 className="text-lg font-black mt-1 capitalize">{longLabel}</h3>
            {holiday && (
              <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold bg-white/12 rounded-full px-2.5 py-1">
                <PartyPopper className="h-3 w-3" /> {holiday.name}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {blocks.length > 0 && (
            <div className="rounded-2xl border border-gray-150 bg-cream/60 p-3 text-xs text-gray-450">
              <p className="font-bold text-ink mb-1">Bloqueios neste dia</p>
              {blocks.map((b) => (
                <p key={b.id}>• {b.block_type === 'full_day' ? 'Dia inteiro' : `${b.start_time?.substring(0,5)}–${b.end_time?.substring(0,5)}`}{b.reason ? ` — ${b.reason}` : ''}</p>
              ))}
            </div>
          )}

          {ordered.length === 0 ? (
            <div className="text-center py-16">
              <Sparkles className="h-8 w-8 text-wine-200 mx-auto" />
              <p className="text-xs text-gray-450 mt-3">Nenhum agendamento para este dia.</p>
            </div>
          ) : ordered.map((a) => {
            const m = statusMeta(a.status);
            return (
              <div key={a.id} className="rounded-2xl border border-gray-150 bg-paper p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-forest">
                    <Clock className="h-3.5 w-3.5" />
                    {a.start_time.substring(0, 5)}–{a.end_time.substring(0, 5)}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.badge}`}>{m.label}</span>
                </div>
                <h4 className="font-bold text-sm text-ink mt-2">{a.client_name}</h4>
                <p className="text-xs text-gray-450">{a.service?.name}</p>
                {a.status !== 'cancelled' && (
                  <a
                    href={buildReminderLink(a, reminderTemplate)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#226045] bg-[#2e7d5b]/10 hover:bg-[#2e7d5b]/16 border border-[#2e7d5b]/20 rounded-xl px-3 py-1.5 transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Enviar lembrete
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
};

export default AgendaCalendar;

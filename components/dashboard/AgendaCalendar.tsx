'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, ChevronDown, CalendarDays, CalendarRange, LayoutGrid,
  X, MessageCircle, Clock, PartyPopper, NotebookPen, Plus, Check, Trash2, GripVertical, Pencil,
  SlidersHorizontal, Lock, UtensilsCrossed,
} from 'lucide-react';
import { Appointment, Service, TimeBlock, Task, Client, AvailabilityRule } from '@/types/database';
import { getHolidayMap, Holiday } from '@/lib/holidays/brazil';
import { statusMeta } from '@/lib/appointments/status';
import { buildReminderLink } from '@/lib/whatsapp';
import { createTaskAction, toggleTaskAction, deleteTaskAction, updateTaskAction } from '@/app/actions/crm';
import { deleteAppointmentAction, updateAppointmentAction } from '@/app/actions/professional';
import { resolveAppointmentServices, formatServiceNames } from '@/lib/appointments/services';
import { AppointmentStatus } from '@/types/database';
import { QuickAppointmentModal } from './QuickAppointmentModal';
import { QuickAddFab } from '../ui/QuickAddFab';
import { Button } from '../ui/Button';
import { PillGroup } from '../ui/PillGroup';
import { StatusPill } from '../ui/StatusPill';
import { EmptyState } from '../ui/EmptyState';
import { CalendarPlus } from 'lucide-react';
import { useToast } from '../ui/Toast';

type View = 'year' | 'month' | 'week' | 'day';

interface AgendaCalendarProps {
  appointments: Appointment[];
  timeBlocks: TimeBlock[];
  reminderTemplate?: string;
  professionalId: string;
  initialTasks: Task[];
  services: Service[];
  clients: Client[];
  availabilityRules?: AvailabilityRule[];
}

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const pad = (n: number) => n.toString().padStart(2, '0');
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const addMonths = (d: Date, n: number) => { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; };
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfWeek = (d: Date) => addDays(d, -d.getDay());
const sameDay = (a: Date, b: Date) => isoOf(a) === isoOf(b);
const TASK_DND = 'application/lume-task';
const APPT_DND = 'application/lume-appt';
const EMPTY_MAP: Record<string, never> = {};
const SNAP = 30; // granularidade de horário na agenda (minutos)
const hhmmss = (min: number) => `${pad(Math.floor((min % 1440) / 60))}:${pad(min % 60)}:00`;

// Inicia o arraste de um agendamento guardando o id e o offset do ponto pego
// dentro do bloco (pra soltar alinhado embaixo do cursor).
const apptDragStart = (e: React.DragEvent, apptId: string) => {
  const offY = e.clientY - (e.currentTarget as HTMLElement).getBoundingClientRect().top;
  e.dataTransfer.setData(APPT_DND, JSON.stringify({ id: apptId, offY }));
  e.dataTransfer.effectAllowed = 'move';
};

export const AgendaCalendar: React.FC<AgendaCalendarProps> = ({
  appointments, timeBlocks, reminderTemplate, professionalId, initialTasks, services, clients, availabilityRules = [],
}) => {
  const router = useRouter();
  const { success, error } = useToast();
  const today = new Date();
  // Abre sempre na visão diária, apontando para hoje (desktop e mobile).
  // Valor inicial determinístico → sem mismatch de hidratação.
  const [view, setView] = useState<View>('day');
  const [cursor, setCursor] = useState<Date>(today);
  const [selectedISO, setSelectedISO] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  // Estado local de agendamentos: permite mover (arrastar) com resposta imediata
  // antes do servidor responder. Re-sincroniza quando o servidor envia novos dados.
  const [appts, setAppts] = useState<Appointment[]>(appointments);
  const [dragOverISO, setDragOverISO] = useState<string | null>(null);
  const [quickBook, setQuickBook] = useState<{ date: string; time?: string } | null>(null);

  // --- Filtros + opções avançadas (estilo painel lateral) ---
  const [filterStatus, setFilterStatus] = useState<'all' | AppointmentStatus>('all');
  const [filterClient, setFilterClient] = useState<string>('all'); // client_id | 'all'
  const [filterService, setFilterService] = useState<string>('all'); // service id | 'all'
  const [showWeekends, setShowWeekends] = useState(true);
  const [showHolidays, setShowHolidays] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [miniCursor, setMiniCursor] = useState<Date>(startOfMonth(today));
  const [sidebarOpen, setSidebarOpen] = useState(false); // drawer no mobile

  const hasFilters = filterStatus !== 'all' || filterClient !== 'all' || filterService !== 'all';
  const clearFilters = () => { setFilterStatus('all'); setFilterClient('all'); setFilterService('all'); };

  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);
  useEffect(() => { setAppts(appointments); }, [appointments]);

  // Agendamentos após filtros (status / cliente / serviço). Alimenta todas as visões.
  const filteredAppointments = useMemo(() => appts.filter(a => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (filterClient !== 'all' && a.client_id !== filterClient) return false;
    if (filterService !== 'all') {
      const ids = a.service_ids && a.service_ids.length ? a.service_ids : [a.service_id];
      if (!ids.includes(filterService)) return false;
    }
    return true;
  }), [appts, filterStatus, filterClient, filterService]);

  const apptByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of filteredAppointments) (map[a.date] ||= []).push(a);
    for (const k in map) map[k].sort((x, y) => x.start_time.localeCompare(y.start_time));
    return map;
  }, [filteredAppointments]);

  const taskByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    if (!showTasks) return map;
    for (const t of tasks) if (t.due_date) (map[t.due_date] ||= []).push(t);
    for (const k in map) map[k].sort((a, b) => (a.due_time || '99').localeCompare(b.due_time || '99'));
    return map;
  }, [tasks, showTasks]);

  const blockByDate = useMemo(() => {
    const map: Record<string, TimeBlock[]> = {};
    for (const b of timeBlocks) (map[b.date] ||= []).push(b);
    return map;
  }, [timeBlocks]);

  // Horário de almoço por dia da semana (0=Dom..6=Sáb), a partir das regras de
  // disponibilidade ativas que tenham pausa definida. Usado para desenhar o
  // almoço cinza na agenda do dia.
  const lunchByWeekday = useMemo(() => {
    const map: Record<number, { start: string; end: string }> = {};
    for (const r of availabilityRules) {
      if (r.is_active && r.break_start && r.break_end) {
        map[r.weekday] = { start: r.break_start, end: r.break_end };
      }
    }
    return map;
  }, [availabilityRules]);

  const holidayMap = useMemo<Record<string, Holiday>>(() => {
    const y = cursor.getFullYear();
    return getHolidayMap([y - 1, y, y + 1]);
  }, [cursor]);
  // Mapa de feriados visível nas visões (respeita o toggle). O DayDetail continua
  // usando o mapa completo, pois ali o feriado é informação útil mesmo escondido na grade.
  const visibleHolidayMap = showHolidays ? holidayMap : EMPTY_MAP;

  const activeOf = (list: Appointment[] = []) => list.filter(a => a.status !== 'cancelled');

  // ---- ações de tarefa ----
  const moveTask = async (id: string, iso: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || task.due_date === iso) return;
    const oldDueDate = task.due_date;
    setTasks(ts => ts.map(t => t.id === id ? { ...t, due_date: iso } : t));
    const res = await updateTaskAction(professionalId, id, { dueDate: iso });
    if (!res.success) {
      setTasks(initialTasks);
      error('Atenção', 'Não foi possível mover a tarefa.');
    } else {
      success('Tarefa movida', 'A data da tarefa foi atualizada.', {
        actionLabel: 'Desfazer',
        onAction: async () => {
          const undoRes = await updateTaskAction(professionalId, id, { dueDate: oldDueDate });
          if (undoRes.success) {
            setTasks(ts => ts.map(t => t.id === id ? { ...t, due_date: oldDueDate } : t));
            success('Desfeito', 'A tarefa voltou para a data original.');
            router.refresh();
          } else {
            error('Erro', 'Não foi possível reverter a tarefa.');
          }
        }
      });
      router.refresh();
    }
  };
  const addTask = async (iso: string, content: string, time: string) => {
    const res = await createTaskAction(professionalId, { content, dueDate: iso, dueTime: time || null });
    if (res.success) router.refresh();
    return res;
  };
  const toggleT = async (task: Task) => {
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, done: !t.done } : t));
    const res = await toggleTaskAction(professionalId, task.id, !task.done);
    if (!res.success) setTasks(initialTasks); else router.refresh();
  };
  const removeT = async (task: Task) => {
    setTasks(ts => ts.filter(t => t.id !== task.id));
    const res = await deleteTaskAction(professionalId, task.id);
    if (!res.success) setTasks(initialTasks); else router.refresh();
  };

  const removeAppt = async (apptId: string) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;
    const res = await deleteAppointmentAction(apptId, professionalId);
    if (res.success) router.refresh();
    else alert('Erro ao excluir agendamento.');
  };

  const editAppt = async (apptId: string, patch: { date?: string; startTime?: string; endTime?: string; serviceId?: string; serviceIds?: string[]; notes?: string; status?: AppointmentStatus }) => {
    const res = await updateAppointmentAction(apptId, professionalId, patch);
    if (res.success) router.refresh();
    else alert('Erro ao atualizar agendamento.');
    return res.success;
  };

  // Move um agendamento (arrastado na grade) para nova data/horário, mantendo a
  // duração. Atualiza na hora (otimista) e persiste; reverte se o servidor recusar.
  const moveAppt = async (apptId: string, dateIso: string, startMin: number) => {
    const a = appts.find(x => x.id === apptId);
    if (!a) return;
    const oldDate = a.date;
    const oldStartTime = a.start_time;
    const oldEndTime = a.end_time;
    const startMM = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const dur = Math.max(startMM(a.end_time) - startMM(a.start_time), SNAP);
    const startTime = hhmmss(startMin);
    const endTime = hhmmss(startMin + dur);
    if (a.date === dateIso && a.start_time.startsWith(startTime.slice(0, 5))) return; // sem mudança
    setAppts(list => list.map(x => x.id === apptId ? { ...x, date: dateIso, start_time: startTime, end_time: endTime } : x));
    const res = await updateAppointmentAction(apptId, professionalId, { date: dateIso, startTime, endTime });
    if (!res.success) { 
      setAppts(appointments); 
      error('Atenção', 'Não foi possível mover o agendamento.'); 
    } else {
      success('Horário alterado', 'O agendamento foi movido na sua agenda.', {
        actionLabel: 'Desfazer',
        onAction: async () => {
          const undoRes = await updateAppointmentAction(apptId, professionalId, { date: oldDate, startTime: oldStartTime, endTime: oldEndTime });
          if (undoRes.success) {
            setAppts(list => list.map(x => x.id === apptId ? { ...x, date: oldDate, start_time: oldStartTime, end_time: oldEndTime } : x));
            success('Desfeito', 'O agendamento voltou ao horário original.');
            router.refresh();
          } else {
            error('Erro', 'Não foi possível reverter o agendamento.');
          }
        }
      });
      router.refresh();
    }
  };

  const goToday = () => setCursor(view === 'day' || view === 'week' ? today : startOfMonth(today));
  const step = (dir: 1 | -1) => {
    if (view === 'year') setCursor(new Date(cursor.getFullYear() + dir, 0, 1));
    else if (view === 'month') setCursor(addMonths(cursor, dir));
    else if (view === 'day') setCursor(addDays(cursor, dir));
    else setCursor(addDays(cursor, dir * 7));
  };

  const title = useMemo(() => {
    if (view === 'year') return `${cursor.getFullYear()}`;
    if (view === 'month') return `${MONTHS[cursor.getMonth()]} de ${cursor.getFullYear()}`;
    if (view === 'day') return `${WEEKDAYS_SHORT[cursor.getDay()]}, ${cursor.getDate()} de ${MONTHS[cursor.getMonth()]}`;
    const ws = startOfWeek(cursor); const we = addDays(ws, 6);
    return ws.getMonth() === we.getMonth()
      ? `${ws.getDate()}–${we.getDate()} de ${MONTHS[ws.getMonth()]} ${ws.getFullYear()}`
      : `${ws.getDate()} ${MONTHS[ws.getMonth()].slice(0, 3)} – ${we.getDate()} ${MONTHS[we.getMonth()].slice(0, 3)} ${we.getFullYear()}`;
  }, [view, cursor]);

  const dropProps = (iso: string) => ({
    onDragOver: (e: React.DragEvent) => { if (e.dataTransfer.types.includes(TASK_DND)) { e.preventDefault(); setDragOverISO(iso); } },
    onDragLeave: () => setDragOverISO(o => (o === iso ? null : o)),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); const id = e.dataTransfer.getData(TASK_DND); setDragOverISO(null); if (id) moveTask(id, iso); },
  });

  // Vai para um dia específico (a partir do mini-calendário): abre a visão diária.
  const pickDay = (day: Date) => { setCursor(day); setView('day'); setMiniCursor(startOfMonth(day)); setSidebarOpen(false); };
  const jumpToday = () => { goToday(); setMiniCursor(startOfMonth(today)); };

  // Painel de filtros (reutilizado no desktop e no drawer mobile).
  const sidebar = (
    <AgendaSidebar
      miniCursor={miniCursor}
      onStepMonth={(dir) => setMiniCursor(addMonths(miniCursor, dir))}
      today={today}
      selectedISO={isoOf(cursor)}
      apptByDate={apptByDate}
      onPickDay={pickDay}
      filterStatus={filterStatus} setFilterStatus={setFilterStatus}
      filterClient={filterClient} setFilterClient={setFilterClient}
      filterService={filterService} setFilterService={setFilterService}
      clients={clients} services={services}
      hasFilters={hasFilters} onClearFilters={clearFilters}
      showWeekends={showWeekends} setShowWeekends={setShowWeekends}
      showHolidays={showHolidays} setShowHolidays={setShowHolidays}
      showTasks={showTasks} setShowTasks={setShowTasks}
    />
  );

  const fabActions = [
    { label: 'Novo agendamento', icon: CalendarPlus, onClick: () => setQuickBook({ date: isoOf(view === 'day' ? cursor : today) }) },
    { label: 'Novo bloqueio de horário', icon: Lock, onClick: () => router.push('/dashboard/blocks') },
    { label: 'Nova tarefa / lembrete', icon: NotebookPen, onClick: () => setSelectedISO(isoOf(view === 'day' ? cursor : today)) },
  ];

  return (
    <div className="select-none">
      <div className="flex gap-6 items-start">
        {/* Painel lateral (desktop) */}
        <div className="hidden lg:block w-60 shrink-0 sticky top-20">{sidebar}</div>

        {/* Coluna principal */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Topbar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
                leadingIcon={<SlidersHorizontal className="h-4 w-4" />}
              >
                Filtros
                {hasFilters && <span className="h-1.5 w-1.5 rounded-full bg-wine-700" aria-label="filtros ativos" />}
              </Button>
              <Button variant="secondary" size="sm" onClick={jumpToday}>Hoje</Button>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="sm" iconOnly aria-label="Período anterior" onClick={() => step(-1)} leadingIcon={<ChevronLeft className="h-5 w-5" />} />
                <Button variant="ghost" size="sm" iconOnly aria-label="Próximo período" onClick={() => step(1)} leadingIcon={<ChevronRight className="h-5 w-5" />} />
              </div>
              <h2 className="text-h2 text-heading capitalize truncate ml-1">{title}</h2>
            </div>

            <PillGroup
              ariaLabel="Visão da agenda"
              value={view}
              onChange={(k) => { if ((k === 'day' || k === 'week') && view !== k) setCursor(today); setView(k); }}
              items={[
                { key: 'day', label: 'Dia', icon: <Clock className="h-4 w-4" />, labelHiddenOnMobile: true },
                { key: 'week', label: 'Semana', icon: <CalendarRange className="h-4 w-4" />, labelHiddenOnMobile: true },
                { key: 'month', label: 'Mês', icon: <CalendarDays className="h-4 w-4" />, labelHiddenOnMobile: true },
                { key: 'year', label: 'Ano', icon: <LayoutGrid className="h-4 w-4" />, labelHiddenOnMobile: true },
              ]}
            />
          </div>

          {/* Legenda — as cores saem de STATUS_META, a mesma fonte que pinta os
              blocos na grade. Enquanto eram hex escritos à mão aqui, a legenda
              podia mentir sobre o que estava desenhado ao lado. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-caption text-n-600">
            {(['confirmed', 'pending', 'completed', 'no_show'] as const).map((st) => {
              const m = statusMeta(st);
              return (
                <span key={st} className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${m.dot}`} aria-hidden /> {m.label}
                </span>
              );
            })}
            {showTasks && <span className="inline-flex items-center gap-1.5"><NotebookPen className="h-4 w-4 text-wine-700" aria-hidden /> Tarefa (arraste para mover)</span>}
            {showHolidays && <span className="inline-flex items-center gap-1.5"><PartyPopper className="h-4 w-4 text-wine-700" aria-hidden /> Feriado</span>}
          </div>

          {view === 'day' && (
            <DayView cursor={cursor} today={today} apptByDate={apptByDate} taskByDate={taskByDate} holidayMap={visibleHolidayMap} blockByDate={blockByDate} lunchByWeekday={lunchByWeekday} activeOf={activeOf} onSelectDay={setSelectedISO} onQuickBook={(date: string, time?: string) => setQuickBook({ date, time })} onMoveAppt={moveAppt} />
          )}
          {view === 'month' && (
            <MonthView cursor={cursor} today={today} apptByDate={apptByDate} taskByDate={taskByDate} holidayMap={visibleHolidayMap} blockByDate={blockByDate} activeOf={activeOf} onSelectDay={setSelectedISO} dropProps={dropProps} dragOverISO={dragOverISO} />
          )}
          {view === 'week' && (
            <WeekView cursor={cursor} today={today} apptByDate={apptByDate} taskByDate={taskByDate} holidayMap={visibleHolidayMap} blockByDate={blockByDate} lunchByWeekday={lunchByWeekday} activeOf={activeOf} onSelectDay={setSelectedISO} onQuickBook={(date: string, time?: string) => setQuickBook({ date, time })} onMoveAppt={moveAppt} showWeekends={showWeekends} />
          )}
          {view === 'year' && (
            <YearView cursor={cursor} today={today} apptByDate={apptByDate} taskByDate={taskByDate} holidayMap={visibleHolidayMap} activeOf={activeOf} onPickMonth={(m: number) => { setCursor(new Date(cursor.getFullYear(), m, 1)); setView('month'); }} />
          )}
        </div>
      </div>

      {/* Drawer de filtros (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex" role="dialog" aria-modal="true" aria-label="Filtros e opções">
          <div className="sheet-backdrop absolute inset-0" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-[88%] max-w-xs h-full bg-bg overflow-y-auto scroll-touch p-4 shadow-lg animate-slide-right">
            <div className="flex items-center justify-between mb-4">
              <p className="text-label font-semibold text-heading">Filtros e opções</p>
              <Button variant="ghost" size="sm" iconOnly aria-label="Fechar filtros" onClick={() => setSidebarOpen(false)} leadingIcon={<X className="h-5 w-5" />} />
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Botão flutuante (+) padrão com ações rápidas */}
      <QuickAddFab actions={fabActions} label="Novo" />

      {selectedISO && (
        <DayDetail
          iso={selectedISO}
          appts={apptByDate[selectedISO] || []}
          tasks={taskByDate[selectedISO] || []}
          holiday={holidayMap[selectedISO]}
          blocks={blockByDate[selectedISO] || []}
          reminderTemplate={reminderTemplate}
          services={services}
          onClose={() => setSelectedISO(null)}
          onAddTask={addTask}
          onToggleTask={toggleT}
          onRemoveTask={removeT}
          onRemoveAppt={removeAppt}
          onEditAppt={editAppt}
          onQuickBook={(iso: string) => { setSelectedISO(null); setQuickBook({ date: iso }); }}
        />
      )}

      {quickBook && (
        <QuickAppointmentModal
          professionalId={professionalId}
          services={services}
          clients={clients}
          initialDate={quickBook.date}
          initialTime={quickBook.time}
          onClose={() => setQuickBook(null)}
          onCreated={() => { setQuickBook(null); router.refresh(); }}
        />
      )}
    </div>
  );
};

/* ---------------- PAINEL LATERAL (mini-calendário + filtros + opções) ---------------- */
const MINI_WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    role="switch"
    aria-checked={checked}
    className="flex items-center gap-2.5 w-full text-left min-h-11 rounded-chip transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
  >
    <span className={`relative h-5 w-9 rounded-full shrink-0 transition-ui ${checked ? 'bg-wine-700' : 'bg-n-300'}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-n-0 shadow-xs transition-ui ${checked ? 'left-[1.125rem]' : 'left-0.5'}`} />
    </span>
    <span className="text-label text-ink">{label}</span>
  </button>
);

const SelectField: React.FC<{ label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }> = ({ label, value, onChange, children }) => (
  <label className="block">
    <span className="text-label text-ink mb-1.5 block">{label}</span>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 appearance-none bg-surface border border-line rounded-control pl-3 pr-9 text-label text-ink shadow-xs transition-ui hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-n-500" aria-hidden />
    </div>
  </label>
);

interface AgendaSidebarProps {
  miniCursor: Date;
  onStepMonth: (dir: 1 | -1) => void;
  today: Date;
  selectedISO: string;
  apptByDate: Record<string, Appointment[]>;
  onPickDay: (d: Date) => void;
  filterStatus: 'all' | AppointmentStatus;
  setFilterStatus: (v: 'all' | AppointmentStatus) => void;
  filterClient: string;
  setFilterClient: (v: string) => void;
  filterService: string;
  setFilterService: (v: string) => void;
  clients: Client[];
  services: Service[];
  hasFilters: boolean;
  onClearFilters: () => void;
  showWeekends: boolean; setShowWeekends: (v: boolean) => void;
  showHolidays: boolean; setShowHolidays: (v: boolean) => void;
  showTasks: boolean; setShowTasks: (v: boolean) => void;
}

const AgendaSidebar: React.FC<AgendaSidebarProps> = ({
  miniCursor, onStepMonth, today, selectedISO, apptByDate, onPickDay,
  filterStatus, setFilterStatus, filterClient, setFilterClient, filterService, setFilterService,
  clients, services, hasFilters, onClearFilters,
  showWeekends, setShowWeekends, showHolidays, setShowHolidays, showTasks, setShowTasks,
}) => {
  const [advOpen, setAdvOpen] = useState(true);
  const gridStart = startOfWeek(startOfMonth(miniCursor));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const activeServices = services.filter(s => s.is_active);
  const namedClients = clients.filter(c => c.name);

  return (
    <div className="space-y-5">
      {/* Mini-calendário */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="sm" iconOnly aria-label="Mês anterior" onClick={() => onStepMonth(-1)} leadingIcon={<ChevronLeft className="h-4 w-4" />} />
          <p className="text-label text-heading capitalize">{MONTHS[miniCursor.getMonth()]} de {miniCursor.getFullYear()}</p>
          <Button variant="ghost" size="sm" iconOnly aria-label="Próximo mês" onClick={() => onStepMonth(1)} leadingIcon={<ChevronRight className="h-4 w-4" />} />
        </div>
        <div className="grid grid-cols-7">
          {MINI_WEEKDAYS.map((w, i) => (
            <div key={i} className="text-center text-micro font-semibold py-1 text-n-500">{w}</div>
          ))}
          {days.map((d, i) => {
            const iso = isoOf(d);
            const inMonth = d.getMonth() === miniCursor.getMonth();
            const isToday = sameDay(d, today);
            const isSelected = iso === selectedISO;
            const has = (apptByDate[iso] || []).some(a => a.status !== 'cancelled');
            return (
              <button
                key={i}
                onClick={() => onPickDay(d)}
                aria-current={isToday ? 'date' : undefined}
                aria-label={`${d.getDate()} de ${MONTHS[d.getMonth()]}`}
                className="aspect-square flex items-center justify-center rounded-chip focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-wine-600"
              >
                <span className={`num relative flex items-center justify-center h-7 w-7 text-micro rounded-full transition-ui ${
                  isToday ? 'bg-wine-700 text-white font-semibold'
                  : isSelected ? 'bg-wine-50 text-wine-700 font-semibold'
                  : inMonth ? 'text-ink hover:bg-n-100' : 'text-n-400'}`}
                >
                  {d.getDate()}
                  {has && !isToday && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-wine-700" aria-hidden />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-label font-semibold text-heading">Filtros</p>
          <Button variant="ghost" size="sm" onClick={onClearFilters} disabled={!hasFilters}>Limpar</Button>
        </div>
        <SelectField label="Status" value={filterStatus} onChange={(v) => setFilterStatus(v as 'all' | AppointmentStatus)}>
          <option value="all">Todos</option>
          <option value="pending">Pendente</option>
          <option value="confirmed">Confirmado</option>
          <option value="completed">Finalizado</option>
          <option value="no_show">Falta</option>
          <option value="cancelled">Cancelado</option>
        </SelectField>
        <SelectField label="Cliente" value={filterClient} onChange={setFilterClient}>
          <option value="all">Todos</option>
          {namedClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectField>
        <SelectField label="Serviço" value={filterService} onChange={setFilterService}>
          <option value="all">Todos</option>
          {activeServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </SelectField>
      </div>

      {/* Opções avançadas */}
      <div className="space-y-2.5">
        <button
          onClick={() => setAdvOpen(o => !o)}
          aria-expanded={advOpen}
          className="flex items-center gap-1.5 min-h-11 text-label font-semibold text-wine-600 hover:text-wine-700 transition-ui rounded-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
        >
          Opções avançadas
          <ChevronDown className={`h-4 w-4 transition-transform duration-[220ms] ease-out ${advOpen ? 'rotate-180' : ''}`} aria-hidden />
        </button>
        {advOpen && (
          <div className="space-y-2 pt-0.5">
            <Toggle checked={showWeekends} onChange={setShowWeekends} label="Mostrar finais de semana" />
            <Toggle checked={showTasks} onChange={setShowTasks} label="Mostrar tarefas e lembretes" />
            <Toggle checked={showHolidays} onChange={setShowHolidays} label="Mostrar feriados" />
          </div>
        )}
      </div>
    </div>
  );
};

/* ---- chip de tarefa (arrastável) ---- */
const TaskChip: React.FC<{ task: Task; onOpen?: () => void; compact?: boolean }> = ({ task, onOpen, compact }) => (
  <div
    draggable
    onDragStart={(e) => { e.dataTransfer.setData(TASK_DND, task.id); e.dataTransfer.effectAllowed = 'move'; }}
    onClick={(e) => { e.stopPropagation(); onOpen?.(); }}
    title={task.content}
    className={`group/task flex items-center gap-1 rounded-chip border px-1.5 py-0.5 cursor-grab active:cursor-grabbing bg-wine-50 border-wine-100 text-wine-700 ${task.done ? 'opacity-50 line-through' : ''}`}
  >
    <GripVertical className="h-4 w-4 shrink-0 opacity-40" aria-hidden />
    <span className={`truncate text-micro font-semibold ${compact ? 'max-w-full' : ''}`}>
      {task.due_time ? `${task.due_time.substring(0, 5)} ` : ''}{task.content}
    </span>
  </div>
);

/* ---------------- MÊS ---------------- */
const MonthView: React.FC<any> = ({ cursor, today, apptByDate, taskByDate, holidayMap, blockByDate, activeOf, onSelectDay, dropProps, dragOverISO }) => {
  const gridStart = startOfWeek(startOfMonth(cursor));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-line bg-n-25">
        {WEEKDAYS_SHORT.map((w) => (
          <div key={w} className="py-2.5 text-center overline text-n-500">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const iso = isoOf(day);
          const inMonth = day.getMonth() === cursor.getMonth();
          const isToday = sameDay(day, today);
          const holiday = holidayMap[iso];
          const appts = activeOf(apptByDate[iso]);
          const dayTasks: Task[] = taskByDate[iso] || [];
          const hasBlock = (blockByDate[iso] || []).length > 0;
          const isSunday = day.getDay() === 0;
          const isDragOver = dragOverISO === iso;
          return (
            <div
              key={idx}
              onClick={() => onSelectDay(iso)}
              {...dropProps(iso)}
              className={`group relative min-h-[112px] text-left p-2 border-b border-r border-line transition-ui cursor-pointer ${!inMonth ? 'bg-n-25' : ''} ${(holiday || isSunday) && inMonth ? 'bg-wine-50/60' : ''} ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''} ${isDragOver ? 'ring-2 ring-inset ring-wine-700 bg-wine-50' : 'hover:bg-n-50'}`}
            >
              <div className="flex items-center justify-between">
                <span className={`num inline-flex items-center justify-center h-6 w-6 text-micro font-semibold rounded-full ${isToday ? 'bg-wine-700 text-white' : inMonth ? 'text-ink' : 'text-n-400'}`}>{day.getDate()}</span>
                {appts.length > 0 && <span className="num text-micro font-semibold text-wine-700 bg-wine-50 rounded-full px-1.5">{appts.length}</span>}
              </div>
              {holiday && <div className="mt-1 flex items-center gap-1 text-micro font-semibold text-wine-700 truncate"><PartyPopper className="h-4 w-4 shrink-0" aria-hidden /><span className="truncate">{holiday.name}</span></div>}
              {hasBlock && !holiday && <div className="mt-1 text-micro font-semibold text-n-500 truncate">Bloqueio</div>}
              <div className="mt-1 space-y-1">
                {appts.slice(0, 2).map((a: Appointment) => {
                  const m = statusMeta(a.status);
                  return <div key={a.id} className={`num truncate rounded-chip border px-1.5 py-0.5 text-micro font-semibold ${m.block}`}>{a.start_time.substring(0, 5)} {a.client_name.split(' ')[0]}</div>;
                })}
                {appts.length > 2 && <div className="text-micro font-semibold text-n-500 pl-1">+{appts.length - 2} agendamentos</div>}
                {dayTasks.slice(0, 2).map((t) => <TaskChip key={t.id} task={t} onOpen={() => onSelectDay(iso)} compact />)}
                {dayTasks.length > 2 && <div className="text-micro font-semibold text-wine-700 pl-1">+{dayTasks.length - 2} tarefas</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------------- DIA (timeline por hora, estilo Google Agenda) ---------------- */
const tmin = (t: string) => { const [h, m] = (t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const HOUR_H = 56;          // altura de 1 hora em px
const PXM = HOUR_H / 60;    // px por minuto

const DayView: React.FC<any> = ({ cursor, today, apptByDate, taskByDate, holidayMap, blockByDate, lunchByWeekday, activeOf, onSelectDay, onQuickBook, onMoveAppt }) => {
  const iso = isoOf(cursor);
  const isToday = sameDay(cursor, today);
  const holiday = holidayMap[iso];
  const appts: Appointment[] = activeOf(apptByDate[iso]).slice().sort((a: Appointment, b: Appointment) => a.start_time.localeCompare(b.start_time));
  const dayTasks: Task[] = taskByDate[iso] || [];
  const blocks: TimeBlock[] = blockByDate[iso] || [];
  const fullDayBlock = blocks.find(b => b.block_type === 'full_day');
  const timedBlocks = blocks.filter(b => b.block_type === 'custom_time' && b.start_time && b.end_time);

  // Horário de almoço deste dia da semana (se configurado na aba Disponibilidade).
  const lunch: { start: string; end: string } | undefined = (lunchByWeekday || {})[cursor.getDay()];

  // Separa tarefas com e sem horário
  const untimedTasks = dayTasks.filter(t => !t.due_time);
  const timedTasks = dayTasks.filter(t => !!t.due_time);

  // Faixa de horas: 7h–21h por padrão, expandida para caber tudo do dia.
  const startsEnds = [
    ...appts.flatMap(a => [tmin(a.start_time), tmin(a.end_time)]),
    ...timedBlocks.flatMap(b => [tmin(b.start_time!), tmin(b.end_time!)]),
    ...timedTasks.map(t => tmin(t.due_time!)),
    ...(lunch ? [tmin(lunch.start), tmin(lunch.end)] : []),
  ];
  let startHour = 7, endHour = 21;
  if (startsEnds.length) {
    startHour = Math.min(startHour, Math.floor(Math.min(...startsEnds) / 60));
    endHour = Math.max(endHour, Math.ceil(Math.max(...startsEnds) / 60));
  }
  const rangeStartMin = startHour * 60;
  const hours = endHour - startHour;
  const totalH = hours * HOUR_H;
  const yOf = (min: number) => (min - rangeStartMin) * PXM; // px a partir do topo da coluna

  // Distribui agendamentos sobrepostos em colunas (lanes), em % puro da coluna de eventos.
  const laneEnds: number[] = [];
  const placed = appts.map(a => {
    const s = tmin(a.start_time), e = Math.max(tmin(a.end_time), s + 15);
    let lane = laneEnds.findIndex(end => end <= s);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(e); } else { laneEnds[lane] = e; }
    return { a, s, e, lane };
  });
  const laneCount = Math.max(1, laneEnds.length);

  const nowMin = isToday ? (today.getHours() * 60 + today.getMinutes()) : -1;
  const nowInRange = nowMin >= rangeStartMin && nowMin <= endHour * 60;

  // Rola para perto do horário atual (ou do primeiro agendamento) ao abrir o dia.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const targetMin = nowInRange ? nowMin : (appts.length ? tmin(appts[0].start_time) : 8 * 60);
    el.scrollTop = Math.max(0, yOf(targetMin) - 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso]);

  // Estado de interação na timeline (hover para "clique p/ encaixar" + arraste).
  const [hoverMin, setHoverMin] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Converte uma posição Y (relativa ao topo da coluna) em minutos, com snap.
  const minFromY = (clientY: number, rectTop: number, snap = SNAP) => {
    const min = rangeStartMin + Math.round(((clientY - rectTop) / PXM) / snap) * snap;
    return Math.max(rangeStartMin, Math.min(min, endHour * 60 - snap));
  };
  const bookAtY = (clientY: number, rectTop: number) => {
    const min = minFromY(clientY, rectTop);
    onQuickBook(iso, `${pad(Math.floor(min / 60))}:${pad(min % 60)}`);
  };

  return (
    <div className="card p-0 overflow-hidden">
      {/* Cabeçalho do dia */}
      <div className={`flex items-center justify-between gap-3 px-5 py-4 border-b border-line ${isToday ? 'bg-wine-50/60' : 'bg-surface'}`}>
        <div className="flex items-center gap-3">
          <span className={`num inline-flex items-center justify-center h-10 w-10 rounded-control text-label font-semibold ${isToday ? 'bg-wine-700 text-white' : 'text-heading bg-n-100'}`}>{cursor.getDate()}</span>
          <div>
            <p className="text-label font-semibold text-heading capitalize">{WEEKDAYS_SHORT[cursor.getDay()]}{isToday ? ' · Hoje' : ''}</p>
            <p className="num text-caption text-n-500">{appts.length} {appts.length === 1 ? 'agendamento' : 'agendamentos'}</p>
          </div>
        </div>
        {holiday && (
          <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-wine-700 bg-wine-50 border border-wine-100 px-2.5 py-1 rounded-full">
            <PartyPopper className="h-4 w-4" aria-hidden /> {holiday.name}
          </span>
        )}
      </div>

      {/* Tarefas sem horário */}
      {untimedTasks.length > 0 && (
        <div className="px-5 py-3 border-b border-line space-y-1.5 bg-n-25">
          {untimedTasks.map((t) => <TaskChip key={t.id} task={t} onOpen={() => onSelectDay(iso)} />)}
        </div>
      )}

      {fullDayBlock && (
        <div className="mx-5 my-4 flex items-center gap-2 text-label font-semibold text-danger bg-danger-bg border border-danger-border rounded-control px-3 py-2.5">
          <Clock className="h-5 w-5 shrink-0" aria-hidden /> Dia bloqueado{fullDayBlock.reason ? ` — ${fullDayBlock.reason}` : ' (dia inteiro)'}
        </div>
      )}

      {/* Timeline rolável: régua de horas (esquerda) + coluna de eventos (direita) */}
      {!fullDayBlock && (
        <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: '68vh' }}>
          <div className="flex" style={{ height: totalH }}>
            {/* Régua de horas (rótulos de 30 em 30 min) */}
            <div className="relative w-14 shrink-0 select-none">
              {Array.from({ length: hours * 2 + 1 }, (_, i) => {
                const min = rangeStartMin + i * 30;
                const isHour = min % 60 === 0;
                return (
                  <div key={i} className={`num absolute right-2 -translate-y-1/2 text-micro ${isHour ? 'font-semibold text-n-600' : 'text-n-400'}`} style={{ top: yOf(min) }}>
                    {pad(Math.floor(min / 60))}:{pad(min % 60)}
                  </div>
                );
              })}
            </div>

            {/* Coluna de eventos */}
            <div
              className={`relative flex-1 border-l border-n-200 transition-colors ${isDragOver ? 'bg-wine-50/60' : ''}`}
              onDragOver={(e) => { if (e.dataTransfer.types.includes(APPT_DND)) { e.preventDefault(); setIsDragOver(true); } }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault(); setIsDragOver(false);
                const raw = e.dataTransfer.getData(APPT_DND); if (!raw) return;
                const { id, offY } = JSON.parse(raw);
                onMoveAppt?.(id, iso, minFromY(e.clientY - offY, e.currentTarget.getBoundingClientRect().top));
              }}
            >
              {/* Camada de clique (encaixa no horário tocado) */}
              <button
                type="button"
                aria-label="Encaixar cliente neste horário"
                onClick={(e) => bookAtY(e.clientY, e.currentTarget.getBoundingClientRect().top)}
                onMouseMove={(e) => setHoverMin(minFromY(e.clientY, e.currentTarget.getBoundingClientRect().top))}
                onMouseLeave={() => setHoverMin(null)}
                className="absolute inset-0 w-full cursor-pointer"
              />

              {/* Ghost de "clique p/ encaixar" no horário sob o cursor */}
              {hoverMin !== null && (
                <div className="absolute left-1 right-1 z-[5] rounded-chip border border-dashed border-wine-400 bg-wine-50 flex items-center px-2 pointer-events-none" style={{ top: yOf(hoverMin), height: SNAP * PXM }}>
                  <span className="num inline-flex items-center gap-1 text-micro font-semibold text-wine-700"><Plus className="h-4 w-4" aria-hidden /> Encaixar às {pad(Math.floor(hoverMin / 60))}:{pad(hoverMin % 60)}</span>
                </div>
              )}

              {/* Linhas de hora (cheia) + meia-hora (fraca) */}
              {Array.from({ length: hours }, (_, i) => {
                const h = startHour + i;
                return (
                  <React.Fragment key={h}>
                    <div className="absolute left-0 right-0 border-t border-line pointer-events-none" style={{ top: yOf(h * 60) }} />
                    <div className="absolute left-0 right-0 border-t border-dashed border-n-150 pointer-events-none" style={{ top: yOf(h * 60 + 30) }} />
                  </React.Fragment>
                );
              })}
              <div className="absolute left-0 right-0 border-t border-line pointer-events-none" style={{ top: yOf(endHour * 60) }} />

              {/* Horário de almoço (cinza claro) — sempre visível, atrás dos agendamentos */}
              {lunch && (
                <div
                  className="absolute left-1 right-1 rounded-chip bg-n-100 border border-line px-2 py-0.5 overflow-hidden pointer-events-none"
                  style={{ top: yOf(tmin(lunch.start)), height: Math.max((tmin(lunch.end) - tmin(lunch.start)) * PXM, 16) }}
                >
                  <p className="num flex items-center gap-1 text-micro font-semibold text-n-500 truncate">
                    <UtensilsCrossed className="h-4 w-4 shrink-0" aria-hidden /> Almoço · {lunch.start.substring(0, 5)}–{lunch.end.substring(0, 5)}
                  </p>
                </div>
              )}

              {/* Bloqueios de horário */}
              {timedBlocks.map((b, i) => (
                <div key={`b${i}`} className="absolute rounded-chip bg-n-150 border border-dashed border-n-300 left-1 right-1 px-2 py-0.5 overflow-hidden pointer-events-none"
                  style={{ top: yOf(tmin(b.start_time!)), height: Math.max((tmin(b.end_time!) - tmin(b.start_time!)) * PXM, 16) }}>
                  <p className="num flex items-center gap-1 text-micro font-semibold text-n-600 truncate">
                    <Lock className="h-4 w-4 shrink-0" aria-hidden /> {b.reason || 'Bloqueado'} · {b.start_time!.substring(0, 5)}–{b.end_time!.substring(0, 5)}
                  </p>
                </div>
              ))}

              {/* Linha do "agora" */}
              {nowInRange && (
                <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none" style={{ top: yOf(nowMin) }}>
                  <span className="h-2.5 w-2.5 rounded-full bg-danger -ml-1.5 shadow-xs" />
                  <div className="flex-1 border-t-2 border-danger" />
                </div>
              )}

              {/* Agendamentos */}
              {placed.map(({ a, s, e, lane }) => {
                const m = statusMeta(a.status);
                const widthPct = 100 / laneCount;
                const height = Math.max((e - s) * PXM, 22);
                return (
                  <button
                    key={a.id}
                    draggable
                    onDragStart={(e) => apptDragStart(e, a.id)}
                    onClick={() => onSelectDay(iso)}
                    title="Arraste para reagendar · clique para ver"
                    className={`group absolute z-10 text-left rounded-chip border px-2 py-1 overflow-hidden shadow-xs cursor-grab active:cursor-grabbing transition-transform active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-wine-600 ${m.block}`}
                    style={{
                      top: yOf(s) + 1,
                      height: height - 2,
                      left: `calc(${lane * widthPct}% + 4px)`,
                      width: `calc(${widthPct}% - 8px)`,
                    }}
                  >
                    <GripVertical className="absolute right-0.5 top-0.5 h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity" aria-hidden />
                    <p className="num text-micro font-semibold leading-tight">{a.start_time.substring(0, 5)}–{a.end_time.substring(0, 5)}</p>
                    <p className="text-caption font-semibold truncate leading-tight">{a.client_name}</p>
                    {height > 46 && <p className="text-micro opacity-80 truncate">{a.service?.name}{a.service_ids && a.service_ids.length > 1 ? ` +${a.service_ids.length - 1}` : ''}</p>}
                  </button>
                );
              })}

              {/* Tarefas com horário — posicionadas na timeline */}
              {timedTasks.map((t) => {
                const taskMin = tmin(t.due_time!);
                return (
                  <div
                    key={`task-${t.id}`}
                    onClick={(e) => { e.stopPropagation(); onSelectDay(iso); }}
                    className={`absolute z-10 left-1 right-1 flex items-center gap-1.5 rounded-chip border px-2 py-1 cursor-pointer shadow-xs bg-wine-50 border-wine-100 text-wine-700 ${t.done ? 'opacity-50 line-through' : ''}`}
                    style={{
                      top: yOf(taskMin),
                      height: Math.max(HOUR_H * 0.4, 22),
                    }}
                  >
                    <NotebookPen className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="num text-micro font-semibold shrink-0">{t.due_time!.substring(0, 5)}</span>
                    <span className="text-caption font-semibold truncate">{t.content}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {appts.length === 0 && timedBlocks.length === 0 && timedTasks.length === 0 && (
            <div className="border-t border-line">
              <EmptyState
                title="Dia livre"
                description="Nenhum agendamento, bloqueio ou tarefa aqui. Toque em qualquer horário da grade para encaixar uma cliente."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ---------------- SEMANA (grade de horários, colunas por dia) ---------------- */
const WeekView: React.FC<any> = ({ cursor, today, apptByDate, taskByDate, holidayMap, blockByDate, lunchByWeekday, activeOf, onSelectDay, onQuickBook, onMoveAppt, showWeekends }) => {
  const ws = startOfWeek(cursor);
  const allDays = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const days = showWeekends ? allDays : allDays.filter(d => d.getDay() !== 0 && d.getDay() !== 6);

  // Faixa de horas considerando tudo da semana visível (padrão 7h–21h, expande p/ caber).
  const collected: number[] = [];
  days.forEach((d) => {
    const iso = isoOf(d);
    activeOf(apptByDate[iso]).forEach((a: Appointment) => collected.push(tmin(a.start_time), tmin(a.end_time)));
    (blockByDate[iso] || []).filter((b: TimeBlock) => b.start_time && b.end_time).forEach((b: TimeBlock) => collected.push(tmin(b.start_time!), tmin(b.end_time!)));
    (taskByDate[iso] || []).filter((t: Task) => t.due_time).forEach((t: Task) => collected.push(tmin(t.due_time!)));
  });
  let startHour = 7, endHour = 21;
  if (collected.length) {
    startHour = Math.min(startHour, Math.floor(Math.min(...collected) / 60));
    endHour = Math.max(endHour, Math.ceil(Math.max(...collected) / 60));
  }
  const rangeStartMin = startHour * 60;
  const hours = endHour - startHour;
  const totalH = hours * HOUR_H;
  const yOf = (min: number) => (min - rangeStartMin) * PXM;

  const nowMin = today.getHours() * 60 + today.getMinutes();
  const weekKey = isoOf(ws);

  // Hover (clique p/ encaixar) e coluna alvo do arraste.
  const [hover, setHover] = useState<{ iso: string; min: number } | null>(null);
  const [dragOverIso, setDragOverIso] = useState<string | null>(null);
  const minFromY = (clientY: number, rectTop: number, snap = SNAP) => {
    const min = rangeStartMin + Math.round(((clientY - rectTop) / PXM) / snap) * snap;
    return Math.max(rangeStartMin, Math.min(min, endHour * 60 - snap));
  };

  // Rola para perto do horário atual ao abrir/trocar de semana.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    el.scrollTop = Math.max(0, yOf(nowMin >= rangeStartMin && nowMin <= endHour * 60 ? nowMin : 8 * 60) - 90);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey]);

  return (
    <div className="card p-0 overflow-hidden">
      {/* Cabeçalho dos dias */}
      <div className="flex border-b border-line bg-n-25">
        <div className="w-14 shrink-0" />
        {days.map((d) => {
          const iso = isoOf(d);
          const isToday = sameDay(d, today);
          const holiday = holidayMap[iso];
          const count = activeOf(apptByDate[iso]).length;
          return (
            <button
              key={iso}
              onClick={() => onSelectDay(iso)}
              aria-current={isToday ? 'date' : undefined}
              className={`flex-1 min-w-0 py-2 px-1 text-center border-l border-line transition-ui hover:bg-n-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-wine-600 ${(holiday || d.getDay() === 0) ? 'bg-wine-50/60' : ''}`}
            >
              <p className="overline text-n-500">{WEEKDAYS_SHORT[d.getDay()]}</p>
              <span className={`num mt-0.5 inline-flex items-center justify-center h-7 w-7 text-caption font-semibold rounded-full ${isToday ? 'bg-wine-700 text-white' : 'text-ink'}`}>{d.getDate()}</span>
              {count > 0 && <p className="num text-micro font-semibold text-wine-700 truncate">{count}</p>}
            </button>
          );
        })}
      </div>

      {/* Timeline rolável */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: '68vh' }}>
        <div className="flex" style={{ height: totalH }}>
          {/* Régua de horas (rótulos de 30 em 30 min) */}
          <div className="relative w-14 shrink-0 select-none">
            {Array.from({ length: hours * 2 + 1 }, (_, i) => {
              const min = rangeStartMin + i * 30;
              const isHour = min % 60 === 0;
              return <div key={i} className={`num absolute right-2 -translate-y-1/2 text-micro ${isHour ? 'font-semibold text-n-600' : 'text-n-400'}`} style={{ top: yOf(min) }}>{pad(Math.floor(min / 60))}:{pad(min % 60)}</div>;
            })}
          </div>

          {/* Uma coluna por dia */}
          {days.map((d) => {
            const iso = isoOf(d);
            const isToday = sameDay(d, today);
            const appts: Appointment[] = activeOf(apptByDate[iso]).slice().sort((a: Appointment, b: Appointment) => a.start_time.localeCompare(b.start_time));
            const blocks: TimeBlock[] = (blockByDate[iso] || []).filter((b: TimeBlock) => b.block_type === 'custom_time' && b.start_time && b.end_time);
            const lunch = (lunchByWeekday || {})[d.getDay()];
            const tTasks: Task[] = (taskByDate[iso] || []).filter((t: Task) => t.due_time);

            const laneEnds: number[] = [];
            const placed = appts.map((a) => {
              const s = tmin(a.start_time), e = Math.max(tmin(a.end_time), s + 15);
              let lane = laneEnds.findIndex(end => end <= s);
              if (lane === -1) { lane = laneEnds.length; laneEnds.push(e); } else { laneEnds[lane] = e; }
              return { a, s, e, lane };
            });
            const laneCount = Math.max(1, laneEnds.length);

            return (
              <div key={iso}
                className={`relative flex-1 min-w-0 border-l border-line transition-ui ${dragOverIso === iso ? 'bg-wine-50' : isToday ? 'bg-wine-50/40' : ''}`}
                onDragOver={(e) => { if (e.dataTransfer.types.includes(APPT_DND)) { e.preventDefault(); setDragOverIso(iso); } }}
                onDragLeave={() => setDragOverIso(o => (o === iso ? null : o))}
                onDrop={(e) => {
                  e.preventDefault(); setDragOverIso(null);
                  const raw = e.dataTransfer.getData(APPT_DND); if (!raw) return;
                  const { id, offY } = JSON.parse(raw);
                  onMoveAppt?.(id, iso, minFromY(e.clientY - offY, e.currentTarget.getBoundingClientRect().top));
                }}
              >
                {/* Camada de clique (encaixa cliente no horário tocado) */}
                <button type="button" aria-label="Encaixar cliente neste horário"
                  onClick={(e) => {
                    const min = minFromY(e.clientY, e.currentTarget.getBoundingClientRect().top);
                    onQuickBook(iso, `${pad(Math.floor(min / 60))}:${pad(min % 60)}`);
                  }}
                  onMouseMove={(e) => setHover({ iso, min: minFromY(e.clientY, e.currentTarget.getBoundingClientRect().top) })}
                  onMouseLeave={() => setHover(h => (h && h.iso === iso ? null : h))}
                  className="absolute inset-0 w-full cursor-pointer" />

                {/* Ghost de "clique p/ encaixar" */}
                {hover && hover.iso === iso && (
                  <div className="absolute left-0.5 right-0.5 z-[5] rounded-chip border border-dashed border-wine-400 bg-wine-50 flex items-center justify-center pointer-events-none" style={{ top: yOf(hover.min), height: SNAP * PXM }}>
                    <span className="num text-micro font-semibold text-wine-700">+ {pad(Math.floor(hover.min / 60))}:{pad(hover.min % 60)}</span>
                  </div>
                )}

                {/* Linhas de hora / meia-hora */}
                {Array.from({ length: hours }, (_, i) => {
                  const h = startHour + i;
                  return (
                    <React.Fragment key={h}>
                      <div className="absolute left-0 right-0 border-t border-line pointer-events-none" style={{ top: yOf(h * 60) }} />
                      <div className="absolute left-0 right-0 border-t border-dashed border-n-150 pointer-events-none" style={{ top: yOf(h * 60 + 30) }} />
                    </React.Fragment>
                  );
                })}

                {/* Almoço */}
                {lunch && (
                  <div className="absolute left-0.5 right-0.5 rounded-chip bg-n-100 border border-line overflow-hidden pointer-events-none" style={{ top: yOf(tmin(lunch.start)), height: Math.max((tmin(lunch.end) - tmin(lunch.start)) * PXM, 12) }} aria-hidden />
                )}

                {/* Bloqueios */}
                {blocks.map((b, i) => (
                  <div key={`b${i}`} className="absolute left-0.5 right-0.5 rounded-chip bg-n-150 border border-dashed border-n-300 overflow-hidden pointer-events-none px-1" style={{ top: yOf(tmin(b.start_time!)), height: Math.max((tmin(b.end_time!) - tmin(b.start_time!)) * PXM, 12) }}>
                    <p className="num flex items-center gap-0.5 text-micro font-semibold text-n-600 truncate"><Lock className="h-4 w-4 shrink-0" aria-hidden /> {b.start_time!.substring(0, 5)}</p>
                  </div>
                ))}

                {/* Linha do "agora" */}
                {isToday && nowMin >= rangeStartMin && nowMin <= endHour * 60 && (
                  <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none" style={{ top: yOf(nowMin) }}>
                    <span className="h-2 w-2 rounded-full bg-danger -ml-1 shadow-xs" /><div className="flex-1 border-t-2 border-danger" />
                  </div>
                )}

                {/* Agendamentos */}
                {placed.map(({ a, s, e, lane }) => {
                  const m = statusMeta(a.status);
                  const w = 100 / laneCount;
                  const height = Math.max((e - s) * PXM, 20);
                  return (
                    <button key={a.id} draggable onDragStart={(ev) => apptDragStart(ev, a.id)} onClick={() => onSelectDay(iso)} title="Arraste para reagendar · clique para ver"
                      className={`absolute z-10 text-left rounded-chip border px-1 py-0.5 overflow-hidden shadow-xs cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-wine-600 ${m.block}`}
                      style={{ top: yOf(s) + 1, height: height - 2, left: `calc(${lane * w}% + 2px)`, width: `calc(${w}% - 4px)` }}>
                      <p className="num text-micro font-semibold leading-tight">{a.start_time.substring(0, 5)}</p>
                      <p className="text-micro font-semibold truncate leading-tight">{a.client_name.split(' ')[0]}</p>
                    </button>
                  );
                })}

                {/* Tarefas com horário */}
                {tTasks.map((t) => (
                  <div key={`t${t.id}`} onClick={(ev) => { ev.stopPropagation(); onSelectDay(iso); }}
                    className={`absolute z-10 left-0.5 right-0.5 flex items-center gap-1 rounded-chip border px-1 py-0.5 cursor-pointer shadow-xs bg-wine-50 border-wine-100 text-wine-700 ${t.done ? 'opacity-50 line-through' : ''}`}
                    style={{ top: yOf(tmin(t.due_time!)), height: 20 }}>
                    <NotebookPen className="h-4 w-4 shrink-0" aria-hidden /><span className="text-micro font-semibold truncate">{t.content}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ---------------- ANO ---------------- */
const YearView: React.FC<any> = ({ cursor, today, apptByDate, taskByDate, holidayMap, activeOf, onPickMonth }) => {
  const year = cursor.getFullYear();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {Array.from({ length: 12 }, (_, m) => {
        const gridStart = startOfWeek(new Date(year, m, 1));
        const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
        return (
          <div key={m} className="card p-4">
            <button
              onClick={() => onPickMonth(m)}
              className="w-full text-left mb-2 flex items-center justify-between gap-2 min-h-11 rounded-chip transition-ui hover:text-wine-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
            >
              <span className="text-label font-semibold text-heading capitalize">{MONTHS[m]}</span>
              <CalendarDays className="h-4 w-4 text-n-500" aria-hidden />
            </button>
            <div className="grid grid-cols-7 gap-0.5">
              {WEEKDAYS_SHORT.map((w) => <div key={w} className="text-center text-micro font-semibold text-n-500">{w[0]}</div>)}
              {days.map((day, i) => {
                const iso = isoOf(day);
                const inMonth = day.getMonth() === m;
                const isToday = sameDay(day, today);
                const holiday = holidayMap[iso];
                const count = activeOf(apptByDate[iso]).length + (taskByDate[iso]?.length || 0);
                return (
                  <div key={i} className="aspect-square flex items-center justify-center">
                    <span className={`num relative flex items-center justify-center h-5 w-5 text-micro rounded-full ${!inMonth ? 'text-n-400' : isToday ? 'bg-wine-700 text-white font-semibold' : holiday ? 'text-wine-700 font-semibold ring-1 ring-wine-200' : 'text-ink'}`}>
                      {day.getDate()}
                      {inMonth && count > 0 && !isToday && <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-wine-700" aria-hidden />}
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
const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: 'pending', label: 'Pendente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'completed', label: 'Finalizado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'no_show', label: 'Falta' },
];

const DayDetail: React.FC<{
  iso: string; appts: Appointment[]; tasks: Task[]; holiday?: Holiday; blocks: TimeBlock[];
  reminderTemplate?: string; services: Service[]; onClose: () => void;
  onAddTask: (iso: string, content: string, time: string) => Promise<{ success: boolean; error?: string }>;
  onToggleTask: (t: Task) => void; onRemoveTask: (t: Task) => void; onRemoveAppt: (id: string) => void;
  onEditAppt: (apptId: string, patch: { date?: string; startTime?: string; endTime?: string; serviceId?: string; serviceIds?: string[]; notes?: string; status?: AppointmentStatus }) => Promise<boolean>;
  onQuickBook: (iso: string) => void;
}> = ({ iso, appts, tasks, holiday, blocks, reminderTemplate, services, onClose, onAddTask, onToggleTask, onRemoveTask, onRemoveAppt, onEditAppt, onQuickBook }) => {
  const [y, mo, d] = iso.split('-').map(Number);
  const dateObj = new Date(y, mo - 1, d);
  const longLabel = `${WEEKDAYS_SHORT[dateObj.getDay()]}, ${d} de ${MONTHS[mo - 1]} de ${y}`;
  const ordered = [...appts].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const [newTask, setNewTask] = useState('');
  const [newTime, setNewTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const submitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setSaving(true);
    const res = await onAddTask(iso, newTask.trim(), newTime);
    setSaving(false);
    if (res.success) { setNewTask(''); setNewTime(''); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="sheet-backdrop absolute inset-0" onClick={onClose} />
      <aside className="relative w-full max-w-md h-full bg-surface shadow-lg flex flex-col animate-slide-right" role="dialog" aria-modal="true" aria-label={`Detalhes de ${longLabel}`}>
        <div className="surface-wine text-white p-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="overline text-white/60">Detalhes do dia</p>
            <h3 className="text-h2 mt-1 capitalize">{longLabel}</h3>
            {holiday && (
              <span className="mt-2 inline-flex items-center gap-1.5 text-caption font-semibold bg-white/15 rounded-full px-2.5 py-1">
                <PartyPopper className="h-4 w-4" aria-hidden /> {holiday.name}
              </span>
            )}
            <button
              onClick={() => onQuickBook(iso)}
              className="tap mt-4 inline-flex items-center gap-1.5 h-11 px-4 bg-white/15 hover:bg-white/25 rounded-control text-label font-semibold transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <CalendarPlus className="h-4 w-4" aria-hidden /> Encaixar cliente neste dia
            </button>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar detalhes do dia"
            className="tap shrink-0 h-11 w-11 inline-flex items-center justify-center rounded-control hover:bg-white/12 transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-touch p-5 space-y-6">
          {/* Tarefas / notas do dia */}
          <div>
            <p className="overline text-n-500 mb-2 flex items-center gap-1.5"><NotebookPen className="h-4 w-4" aria-hidden /> Tarefas e notas</p>
            <form onSubmit={submitTask} className="flex gap-2 mb-3">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Nova tarefa neste dia…"
                className="flex-1 min-w-0 h-11 px-3 bg-surface border border-line rounded-control text-label text-ink placeholder-n-400 transition-ui hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
              />
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                title="Horário (opcional)"
                aria-label="Horário da tarefa (opcional)"
                className="num w-24 shrink-0 h-11 px-2 bg-surface border border-line rounded-control text-label text-ink transition-ui hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
              />
              <Button type="submit" size="md" iconOnly loading={saving} aria-label="Adicionar tarefa" leadingIcon={<Plus className="h-5 w-5" />} />
            </form>
            <div className="space-y-1.5">
              {tasks.length === 0 ? (
                <p className="text-caption text-n-500 py-1">Nenhuma tarefa para este dia.</p>
              ) : tasks.map((t) => (
                <div key={t.id} className="group flex items-center gap-2.5 rounded-control border border-line px-2.5 py-2">
                  <button
                    type="button"
                    onClick={() => onToggleTask(t)}
                    role="checkbox"
                    aria-checked={t.done}
                    aria-label={`Marcar "${t.content}" como concluída`}
                    className={`h-5 w-5 shrink-0 rounded-chip border flex items-center justify-center transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 ${t.done ? 'bg-wine-700 border-wine-700 text-white' : 'border-n-300 hover:border-wine-700'}`}
                  >
                    {t.done && <Check className="h-4 w-4" />}
                  </button>
                  <span className={`flex-1 text-label ${t.done ? 'line-through text-n-500' : 'text-ink'}`}>
                    {t.due_time ? <b className="num text-wine-700">{t.due_time.substring(0, 5)} </b> : ''}{t.content}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveTask(t)}
                    aria-label={`Excluir tarefa "${t.content}"`}
                    className="h-9 w-9 inline-flex items-center justify-center shrink-0 rounded-chip text-n-500 hover:bg-danger-bg hover:text-danger transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Agendamentos do dia */}
          <div>
            <p className="overline text-n-500 mb-2 flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden /> Agendamentos</p>
            {blocks.length > 0 && (
              <div className="rounded-control border border-line bg-n-50 p-3 text-caption text-n-600 mb-3">
                <p className="text-label font-semibold text-heading mb-1">Bloqueios</p>
                {blocks.map((b) => (
                  <p key={b.id} className="num">
                    • {b.block_type === 'full_day' ? 'Dia inteiro' : `${b.start_time?.substring(0, 5)}–${b.end_time?.substring(0, 5)}`}{b.reason ? ` — ${b.reason}` : ''}
                  </p>
                ))}
              </div>
            )}
            {ordered.length === 0 ? (
              <EmptyState
                title="Nenhum agendamento"
                description="Este dia ainda não tem horários marcados."
                action={
                  <Button variant="secondary" size="sm" onClick={() => onQuickBook(iso)} leadingIcon={<CalendarPlus className="h-4 w-4" />}>
                    Encaixar cliente
                  </Button>
                }
              />
            ) : ordered.map((a) => {
              const m = statusMeta(a.status);
              const isEditing = editingId === a.id;
              return (
                <div key={a.id} className="card mb-2 p-0 overflow-hidden">
                  {/* Cabeçalho do card */}
                  <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
                    <span className="num inline-flex items-center gap-1.5 text-label font-semibold text-heading">
                      <Clock className="h-4 w-4 text-n-500" aria-hidden />{a.start_time.substring(0, 5)}–{a.end_time.substring(0, 5)}
                    </span>
                    <div className="flex items-center gap-1">
                      <StatusPill tone={m.tone}>{m.label}</StatusPill>
                      <button
                        onClick={() => setEditingId(isEditing ? null : a.id)}
                        aria-label={isEditing ? 'Fechar edição' : `Editar agendamento de ${a.client_name}`}
                        aria-expanded={isEditing}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-chip text-n-500 hover:bg-n-100 hover:text-heading transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemoveAppt(a.id); }}
                        aria-label={`Excluir agendamento de ${a.client_name}`}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-chip text-n-500 hover:bg-danger-bg hover:text-danger transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="px-4 pb-3">
                    <h4 className="text-label font-semibold text-heading">{a.client_name}</h4>
                    <p className="text-caption text-n-500">{formatServiceNames(resolveAppointmentServices(a, services)) || a.service?.name}</p>
                  </div>

                  {/* Formulário de edição (inline) */}
                  {isEditing && (
                    <EditApptForm
                      appt={a}
                      services={services}
                      saving={editSaving}
                      onSave={async (patch) => {
                        setEditSaving(true);
                        const ok = await onEditAppt(a.id, patch);
                        setEditSaving(false);
                        if (ok) setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  )}

                  {/* Lembrete — só quando não está editando */}
                  {!isEditing && a.status !== 'cancelled' && (
                    <div className="px-4 pb-4">
                      <a
                        href={buildReminderLink(a, reminderTemplate)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tap inline-flex items-center gap-1.5 h-9 px-3 text-caption font-semibold text-success bg-success-bg hover:bg-success hover:text-white border border-success-border hover:border-success rounded-chip transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
                      >
                        <MessageCircle className="h-4 w-4" aria-hidden /> Enviar lembrete
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
};

/* ---- Formulário de edição de agendamento ---- */
const EditApptForm: React.FC<{
  appt: Appointment;
  services: Service[];
  saving: boolean;
  onSave: (patch: { date?: string; startTime?: string; endTime?: string; serviceId?: string; serviceIds?: string[]; notes?: string; status?: AppointmentStatus }) => void;
  onCancel: () => void;
}> = ({ appt, services, saving, onSave, onCancel }) => {
  const [date, setDate] = useState(appt.date);
  const [startTime, setStartTime] = useState(appt.start_time.substring(0, 5));
  const [serviceId, setServiceId] = useState(appt.service_id || '');
  const [status, setStatus] = useState<AppointmentStatus>(appt.status);
  const [notes, setNotes] = useState(appt.notes || '');

  const selectedService = services.find(s => s.id === serviceId);
  const computedEndTime = (st: string, svc: Service | undefined) => {
    if (!st || !svc) return appt.end_time.substring(0, 5);
    const [h, m] = st.split(':').map(Number);
    const total = h * 60 + m + svc.duration_minutes;
    return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
  };

  const handleSave = () => {
    const endTime = computedEndTime(startTime, selectedService);
    // serviceIds:[serviceId] mantém o multi-serviço consistente ao editar pela agenda
    onSave({ date, startTime: startTime + ':00', endTime: endTime + ':00', serviceId, serviceIds: [serviceId], notes, status });
  };

  return (
    <div className="border-t border-line bg-n-25 px-4 py-4 space-y-3">
      <p className="overline text-n-500">Reagendar ou editar</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-caption text-n-600 mb-1 block">Data</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="num w-full h-11 px-2.5 text-label text-ink border border-line rounded-control bg-surface transition-ui hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600" />
        </div>
        <div>
          <label className="text-caption text-n-600 mb-1 block">Horário</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
            className="num w-full h-11 px-2.5 text-label text-ink border border-line rounded-control bg-surface transition-ui hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600" />
        </div>
      </div>
      <div>
        <label className="text-caption text-n-600 mb-1 block">Serviço</label>
        <select value={serviceId} onChange={e => setServiceId(e.target.value)}
          className="w-full h-11 px-2.5 text-label text-ink border border-line rounded-control bg-surface transition-ui hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600">
          {services.filter(s => s.is_active).map(s => (
            <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes}min)</option>
          ))}
        </select>
        {selectedService && (
          <p className="num text-caption text-n-500 mt-1">Término previsto: {computedEndTime(startTime, selectedService)}</p>
        )}
      </div>
      <div>
        <label className="text-caption text-n-600 mb-1 block">Status</label>
        <select value={status} onChange={e => setStatus(e.target.value as AppointmentStatus)}
          className="w-full h-11 px-2.5 text-label text-ink border border-line rounded-control bg-surface transition-ui hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600">
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <label className="text-caption text-n-600 mb-1 block">Observações</label>
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações sobre o agendamento..."
          className="w-full px-2.5 py-2 text-label text-ink border border-line rounded-control bg-surface resize-none transition-ui hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600" />
      </div>
      <div className="flex gap-2 pt-1">
        <Button onClick={handleSave} loading={saving} className="flex-1">Salvar</Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving} className="flex-1">Cancelar</Button>
      </div>
    </div>
  );
};

export default AgendaCalendar;

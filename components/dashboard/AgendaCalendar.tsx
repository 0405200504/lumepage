'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, CalendarDays, CalendarRange, LayoutGrid,
  X, MessageCircle, Clock, PartyPopper, Sparkles, NotebookPen, Plus, Check, Trash2, GripVertical
} from 'lucide-react';
import { Appointment, TimeBlock, Task } from '@/types/database';
import { getHolidayMap, Holiday } from '@/lib/holidays/brazil';
import { statusMeta } from '@/lib/appointments/status';
import { buildReminderLink } from '@/lib/whatsapp';
import { createTaskAction, toggleTaskAction, deleteTaskAction, updateTaskAction } from '@/app/actions/crm';

type View = 'year' | 'month' | 'week';

interface AgendaCalendarProps {
  appointments: Appointment[];
  timeBlocks: TimeBlock[];
  reminderTemplate?: string;
  professionalId: string;
  initialTasks: Task[];
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

export const AgendaCalendar: React.FC<AgendaCalendarProps> = ({
  appointments, timeBlocks, reminderTemplate, professionalId, initialTasks,
}) => {
  const router = useRouter();
  const today = new Date();
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState<Date>(startOfMonth(today));
  const [selectedISO, setSelectedISO] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [dragOverISO, setDragOverISO] = useState<string | null>(null);

  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

  const apptByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) (map[a.date] ||= []).push(a);
    for (const k in map) map[k].sort((x, y) => x.start_time.localeCompare(y.start_time));
    return map;
  }, [appointments]);

  const taskByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasks) if (t.due_date) (map[t.due_date] ||= []).push(t);
    for (const k in map) map[k].sort((a, b) => (a.due_time || '99').localeCompare(b.due_time || '99'));
    return map;
  }, [tasks]);

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

  // ---- ações de tarefa ----
  const moveTask = async (id: string, iso: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || task.due_date === iso) return;
    setTasks(ts => ts.map(t => t.id === id ? { ...t, due_date: iso } : t));
    const res = await updateTaskAction(professionalId, id, { dueDate: iso });
    if (!res.success) setTasks(initialTasks); else router.refresh();
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

  const goToday = () => setCursor(startOfMonth(today));
  const step = (dir: 1 | -1) => {
    if (view === 'year') setCursor(new Date(cursor.getFullYear() + dir, 0, 1));
    else if (view === 'month') setCursor(addMonths(cursor, dir));
    else setCursor(addDays(cursor, dir * 7));
  };

  const title = useMemo(() => {
    if (view === 'year') return `${cursor.getFullYear()}`;
    if (view === 'month') return `${MONTHS[cursor.getMonth()]} de ${cursor.getFullYear()}`;
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

  return (
    <div className="space-y-5 select-none animate-fade-up">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-paper border border-gray-150 rounded-2xl p-1 shadow-soft">
            <button onClick={() => step(-1)} className="p-2 rounded-xl hover:bg-cream text-gray-450 hover:text-forest transition-colors" aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => step(1)} className="p-2 rounded-xl hover:bg-cream text-gray-450 hover:text-forest transition-colors" aria-label="Próximo"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <button onClick={goToday} className="px-4 py-2.5 bg-paper border border-gray-150 rounded-2xl text-xs font-bold text-forest shadow-soft hover:bg-cream transition-colors">Hoje</button>
          <h3 className="text-lg md:text-xl font-black text-forest tracking-tight ml-1 capitalize">{title}</h3>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button onClick={() => setSelectedISO(isoOf(today))} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 surface-wine text-white rounded-2xl text-xs font-bold shadow-soft hover:opacity-95 transition-all-custom">
            <Plus className="h-3.5 w-3.5" /> Nova tarefa
          </button>
          <div className="flex items-center bg-paper border border-gray-150 rounded-2xl p-1 shadow-soft">
            {([{ k: 'year', label: 'Ano', icon: LayoutGrid }, { k: 'month', label: 'Mês', icon: CalendarDays }, { k: 'week', label: 'Semana', icon: CalendarRange }] as const).map(({ k, label, icon: Icon }) => (
              <button key={k} onClick={() => setView(k)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all-custom ${view === k ? 'surface-wine text-white shadow-soft' : 'text-gray-450 hover:text-forest'}`}>
                <Icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-semibold text-gray-450">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#2e7d5b]" /> Confirmado</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#b07a23]" /> Pendente</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-wine-700" /> Finalizado</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#b23a48]" /> Falta</span>
        <span className="inline-flex items-center gap-1.5"><NotebookPen className="h-3 w-3 text-wine-600" /> Tarefa (arraste p/ mover)</span>
        <span className="inline-flex items-center gap-1.5"><PartyPopper className="h-3 w-3 text-wine-500" /> Feriado</span>
      </div>

      {view === 'month' && (
        <MonthView cursor={cursor} today={today} apptByDate={apptByDate} taskByDate={taskByDate} holidayMap={holidayMap} blockByDate={blockByDate} activeOf={activeOf} onSelectDay={setSelectedISO} dropProps={dropProps} dragOverISO={dragOverISO} />
      )}
      {view === 'week' && (
        <WeekView cursor={cursor} today={today} apptByDate={apptByDate} taskByDate={taskByDate} holidayMap={holidayMap} activeOf={activeOf} onSelectDay={setSelectedISO} dropProps={dropProps} dragOverISO={dragOverISO} />
      )}
      {view === 'year' && (
        <YearView cursor={cursor} today={today} apptByDate={apptByDate} taskByDate={taskByDate} holidayMap={holidayMap} activeOf={activeOf} onPickMonth={(m: number) => { setCursor(new Date(cursor.getFullYear(), m, 1)); setView('month'); }} />
      )}

      {selectedISO && (
        <DayDetail
          iso={selectedISO}
          appts={apptByDate[selectedISO] || []}
          tasks={taskByDate[selectedISO] || []}
          holiday={holidayMap[selectedISO]}
          blocks={blockByDate[selectedISO] || []}
          reminderTemplate={reminderTemplate}
          onClose={() => setSelectedISO(null)}
          onAddTask={addTask}
          onToggleTask={toggleT}
          onRemoveTask={removeT}
        />
      )}
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
    className={`group/task flex items-center gap-1 rounded-md border px-1.5 py-0.5 cursor-grab active:cursor-grabbing bg-wine-700/8 border-wine-700/25 text-wine-800 ${task.done ? 'opacity-50 line-through' : ''}`}
  >
    <GripVertical className="h-2.5 w-2.5 shrink-0 opacity-50" />
    <span className={`truncate ${compact ? 'text-[9px]' : 'text-[10px]'} font-semibold`}>
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
      <div className="grid grid-cols-7 border-b border-gray-150 bg-cream/60">
        {WEEKDAYS_SHORT.map((w, i) => (
          <div key={w} className={`py-2.5 text-center text-[10px] font-black uppercase tracking-wider ${i === 0 ? 'text-wine-500' : 'text-gray-450'}`}>{w}</div>
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
              className={`group relative min-h-[112px] text-left p-2 border-b border-r border-gray-150 transition-colors hover:bg-cream/70 cursor-pointer ${!inMonth ? 'bg-cream/40' : ''} ${(holiday || isSunday) && inMonth ? 'bg-wine-50/50' : ''} ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''} ${isDragOver ? 'ring-2 ring-inset ring-wine-700/50 bg-wine-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center justify-center h-6 w-6 text-[11px] font-bold rounded-full ${isToday ? 'surface-wine text-white shadow-soft' : inMonth ? 'text-ink' : 'text-gray-450/50'}`}>{day.getDate()}</span>
                {appts.length > 0 && <span className="text-[9px] font-black text-wine-600 bg-wine-100/70 rounded-full px-1.5 py-0.5">{appts.length}</span>}
              </div>
              {holiday && <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-wine-600 truncate"><PartyPopper className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{holiday.name}</span></div>}
              {hasBlock && !holiday && <div className="mt-1 text-[9px] font-bold text-gray-450 truncate">Bloqueio</div>}
              <div className="mt-1 space-y-1">
                {appts.slice(0, 2).map((a: Appointment) => {
                  const m = statusMeta(a.status);
                  return <div key={a.id} className={`truncate rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${m.block}`}>{a.start_time.substring(0, 5)} {a.client_name.split(' ')[0]}</div>;
                })}
                {appts.length > 2 && <div className="text-[9px] font-bold text-gray-450 pl-1">+{appts.length - 2} agend.</div>}
                {dayTasks.slice(0, 2).map((t) => <TaskChip key={t.id} task={t} onOpen={() => onSelectDay(iso)} compact />)}
                {dayTasks.length > 2 && <div className="text-[9px] font-bold text-wine-600 pl-1">+{dayTasks.length - 2} tarefas</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------------- SEMANA ---------------- */
const WeekView: React.FC<any> = ({ cursor, today, apptByDate, taskByDate, holidayMap, activeOf, onSelectDay, dropProps, dragOverISO }) => {
  const ws = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-3">
      {days.map((day) => {
        const iso = isoOf(day);
        const isToday = sameDay(day, today);
        const holiday = holidayMap[iso];
        const appts = activeOf(apptByDate[iso]);
        const dayTasks: Task[] = taskByDate[iso] || [];
        const isDragOver = dragOverISO === iso;
        return (
          <div key={iso} {...dropProps(iso)} className={`card p-3 flex flex-col min-h-[200px] ${isToday ? 'ring-2 ring-wine-700/30' : ''} ${isDragOver ? 'ring-2 ring-wine-700/60 bg-wine-50' : ''}`}>
            <button onClick={() => onSelectDay(iso)} className="text-left">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-wider ${day.getDay() === 0 ? 'text-wine-500' : 'text-gray-450'}`}>{WEEKDAYS_SHORT[day.getDay()]}</span>
                <span className={`inline-flex items-center justify-center h-7 w-7 text-xs font-bold rounded-full ${isToday ? 'surface-wine text-white' : 'text-ink'}`}>{day.getDate()}</span>
              </div>
              {holiday && <div className="mt-1.5 flex items-center gap-1 text-[9px] font-bold text-wine-600"><PartyPopper className="h-2.5 w-2.5" /> <span className="truncate">{holiday.name}</span></div>}
            </button>
            <div className="mt-2 space-y-1.5 flex-1 overflow-y-auto">
              {appts.length === 0 && dayTasks.length === 0 && <p className="text-[10px] text-gray-450/70 pt-4 text-center">Sem itens</p>}
              {appts.map((a: Appointment) => {
                const m = statusMeta(a.status);
                return (
                  <button key={a.id} onClick={() => onSelectDay(iso)} className={`w-full text-left rounded-xl border px-2 py-1.5 ${m.block}`}>
                    <p className="text-[10px] font-black">{a.start_time.substring(0, 5)}</p>
                    <p className="text-[11px] font-bold truncate">{a.client_name}</p>
                    <p className="text-[9px] opacity-80 truncate">{a.service?.name}</p>
                  </button>
                );
              })}
              {dayTasks.map((t) => <TaskChip key={t.id} task={t} onOpen={() => onSelectDay(iso)} />)}
            </div>
          </div>
        );
      })}
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
          <div key={m} className="card p-3">
            <button onClick={() => onPickMonth(m)} className="w-full text-left mb-2 flex items-center justify-between group">
              <span className="text-sm font-black text-forest capitalize group-hover:underline">{MONTHS[m]}</span>
              <CalendarDays className="h-3.5 w-3.5 text-gray-450 group-hover:text-forest" />
            </button>
            <div className="grid grid-cols-7 gap-0.5">
              {WEEKDAYS_SHORT.map((w, i) => <div key={w} className={`text-center text-[8px] font-bold ${i === 0 ? 'text-wine-400' : 'text-gray-450/60'}`}>{w[0]}</div>)}
              {days.map((day, i) => {
                const iso = isoOf(day);
                const inMonth = day.getMonth() === m;
                const isToday = sameDay(day, today);
                const holiday = holidayMap[iso];
                const count = activeOf(apptByDate[iso]).length + (taskByDate[iso]?.length || 0);
                return (
                  <div key={i} className="aspect-square flex items-center justify-center">
                    <span className={`relative flex items-center justify-center h-5 w-5 text-[9px] rounded-full ${!inMonth ? 'text-gray-450/30' : isToday ? 'surface-wine text-white font-bold' : holiday ? 'text-wine-600 font-bold ring-1 ring-wine-300' : 'text-ink'}`}>
                      {day.getDate()}
                      {inMonth && count > 0 && !isToday && <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-wine-600" />}
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
  iso: string; appts: Appointment[]; tasks: Task[]; holiday?: Holiday; blocks: TimeBlock[];
  reminderTemplate?: string; onClose: () => void;
  onAddTask: (iso: string, content: string, time: string) => Promise<{ success: boolean; error?: string }>;
  onToggleTask: (t: Task) => void; onRemoveTask: (t: Task) => void;
}> = ({ iso, appts, tasks, holiday, blocks, reminderTemplate, onClose, onAddTask, onToggleTask, onRemoveTask }) => {
  const [y, mo, d] = iso.split('-').map(Number);
  const dateObj = new Date(y, mo - 1, d);
  const longLabel = `${WEEKDAYS_SHORT[dateObj.getDay()]}, ${d} de ${MONTHS[mo - 1]} de ${y}`;
  const ordered = [...appts].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const [newTask, setNewTask] = useState('');
  const [newTime, setNewTime] = useState('');
  const [saving, setSaving] = useState(false);

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
      <div className="absolute inset-0 bg-[#1a0e12]/45 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative w-full max-w-md h-full bg-paper shadow-glow flex flex-col animate-slide-right">
        <div className="surface-wine text-white p-6 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">Detalhes do dia</p>
            <h3 className="text-lg font-black mt-1 capitalize">{longLabel}</h3>
            {holiday && <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold bg-white/12 rounded-full px-2.5 py-1"><PartyPopper className="h-3 w-3" /> {holiday.name}</span>}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Tarefas / notas do dia */}
          <div>
            <p className="text-xs font-bold text-gray-450 uppercase tracking-wider mb-2 flex items-center gap-1.5"><NotebookPen className="h-3.5 w-3.5" /> Tarefas & notas</p>
            <form onSubmit={submitTask} className="flex gap-2 mb-2">
              <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Nova tarefa neste dia..." className="flex-1 min-w-0 px-3 py-2 bg-cream/60 border border-gray-150 rounded-xl text-sm placeholder-gray-450/60 focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700" />
              <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} title="Horário (opcional)" className="w-24 shrink-0 px-2 py-2 bg-cream/60 border border-gray-150 rounded-xl text-xs text-ink focus:outline-none focus:ring-2 focus:ring-wine-700/15" />
              <button type="submit" disabled={saving} className="shrink-0 px-3 surface-wine text-white rounded-xl hover:opacity-95 disabled:opacity-60" aria-label="Adicionar"><Plus className="h-4 w-4" /></button>
            </form>
            <div className="space-y-1.5">
              {tasks.length === 0 ? (
                <p className="text-[11px] text-gray-450/70 py-1">Nenhuma tarefa para este dia.</p>
              ) : tasks.map((t) => (
                <div key={t.id} className="group flex items-center gap-2.5 rounded-xl border border-gray-150 px-2.5 py-2">
                  <button type="button" onClick={() => onToggleTask(t)} className={`h-5 w-5 shrink-0 rounded-md border flex items-center justify-center transition-all ${t.done ? 'bg-wine-700 border-wine-700 text-white' : 'border-gray-250 hover:border-wine-700'}`}>{t.done && <Check className="h-3.5 w-3.5" />}</button>
                  <span className={`flex-1 text-sm ${t.done ? 'line-through text-gray-450' : 'text-ink'}`}>{t.due_time ? <b className="text-wine-700">{t.due_time.substring(0, 5)} </b> : ''}{t.content}</span>
                  <button type="button" onClick={() => onRemoveTask(t)} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-450 hover:text-[#b23a48] transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Agendamentos do dia */}
          <div>
            <p className="text-xs font-bold text-gray-450 uppercase tracking-wider mb-2 flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Agendamentos</p>
            {blocks.length > 0 && (
              <div className="rounded-2xl border border-gray-150 bg-cream/60 p-3 text-xs text-gray-450 mb-2">
                <p className="font-bold text-ink mb-1">Bloqueios</p>
                {blocks.map((b) => <p key={b.id}>• {b.block_type === 'full_day' ? 'Dia inteiro' : `${b.start_time?.substring(0, 5)}–${b.end_time?.substring(0, 5)}`}{b.reason ? ` — ${b.reason}` : ''}</p>)}
              </div>
            )}
            {ordered.length === 0 ? (
              <div className="text-center py-8"><Sparkles className="h-7 w-7 text-wine-200 mx-auto" /><p className="text-xs text-gray-450 mt-2">Nenhum agendamento.</p></div>
            ) : ordered.map((a) => {
              const m = statusMeta(a.status);
              return (
                <div key={a.id} className="rounded-2xl border border-gray-150 bg-paper p-4 shadow-soft mb-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-forest"><Clock className="h-3.5 w-3.5" />{a.start_time.substring(0, 5)}–{a.end_time.substring(0, 5)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.badge}`}>{m.label}</span>
                  </div>
                  <h4 className="font-bold text-sm text-ink mt-2">{a.client_name}</h4>
                  <p className="text-xs text-gray-450">{a.service?.name}</p>
                  {a.status !== 'cancelled' && (
                    <a href={buildReminderLink(a, reminderTemplate)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#226045] bg-[#2e7d5b]/10 hover:bg-[#2e7d5b]/16 border border-[#2e7d5b]/20 rounded-xl px-3 py-1.5 transition-colors"><MessageCircle className="h-3.5 w-3.5" /> Enviar lembrete</a>
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

export default AgendaCalendar;

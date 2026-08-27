'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Task } from '@/types/database';
import { Plus, Check, Trash2, NotebookPen, CalendarClock } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { QuickAddFab } from '../ui/QuickAddFab';
import { createTaskAction, toggleTaskAction, deleteTaskAction } from '@/app/actions/crm';
import { formatDateBR } from '@/lib/whatsapp';

interface TasksWidgetProps {
  professionalId: string;
  initialTasks: Task[];
  /** Exibe o botão flutuante (+) padrão. Só na página de Tarefas (evita duplicar na Início). */
  showFab?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const isoFromNow = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const TasksWidget: React.FC<TasksWidgetProps> = ({ professionalId, initialTasks, showFab = false }) => {
  const router = useRouter();
  const { error } = useToast();
  const contentRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // Mantém a lista em sincronia com o servidor (corrige o check não persistir)
  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    setBusy(true);
    try {
      const res = await createTaskAction(professionalId, { content: text, dueDate: dueDate || null, dueTime: dueTime || null });
      if (!res.success) { error('Falha', res.error || 'Não foi possível salvar.'); }
      else { setContent(''); setDueDate(''); setDueTime(''); setShowCustom(false); router.refresh(); }
    } finally { setBusy(false); }
  };

  const toggle = async (task: Task) => {
    // feedback instantâneo
    setTasks((t) => t.map(x => x.id === task.id ? { ...x, done: !x.done } : x));
    const res = await toggleTaskAction(professionalId, task.id, !task.done);
    if (!res.success) {
      setTasks((t) => t.map(x => x.id === task.id ? { ...x, done: task.done } : x));
      error('Falha', res.error || 'Erro ao atualizar.');
    } else {
      router.refresh();
    }
  };

  const remove = async (task: Task) => {
    setTasks((t) => t.filter(x => x.id !== task.id));
    const res = await deleteTaskAction(professionalId, task.id);
    if (!res.success) { setTasks(initialTasks); error('Falha', res.error || 'Erro.'); }
    else router.refresh();
  };

  const pending = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-wine-700/8 text-wine-700"><NotebookPen className="h-4 w-4" /></div>
        <div>
          <h3 className="text-body font-semibold text-ink tracking-tight leading-none">Bloco de notas & tarefas</h3>
          <p className="text-caption text-n-600 mt-1">Anote o que é importante. Com data, a tarefa aparece na sua Agenda.</p>
        </div>
      </div>

      <form onSubmit={add} className="space-y-3 bg-n-50 border border-n-200 rounded-2xl p-3.5">
        {/* Passo 1: o que anotar */}
        <div>
          <label className="block text-caption font-bold text-n-600 mb-1.5">
            <span className="text-wine-700">1.</span> O que você precisa lembrar?
          </label>
          <input
            ref={contentRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ex: comprar algodão, retornar p/ Marina, pagar fornecedor…"
            className="w-full px-3.5 py-3 bg-surface border border-n-200 rounded-xl text-label placeholder-n-600/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
          />
        </div>

        {/* Passo 2: quando (chips didáticos) */}
        <div>
          <label className="block text-caption font-bold text-n-600 mb-1.5">
            <span className="text-wine-700">2.</span> Quando? <span className="font-normal text-n-600/80">— com data, aparece na sua Agenda</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'Sem data', val: '' },
              { label: 'Hoje', val: isoFromNow(0) },
              { label: 'Amanhã', val: isoFromNow(1) },
              { label: 'Em 7 dias', val: isoFromNow(7) },
            ].map((chip) => {
              const active = !showCustom && dueDate === chip.val;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => { setShowCustom(false); setDueDate(chip.val); if (!chip.val) setDueTime(''); }}
                  className={`tap text-caption font-bold px-3 py-1.5 rounded-full border transition-ui ${
                    active ? 'surface-wine text-white border-transparent shadow-soft' : 'bg-surface text-n-600 border-n-200 hover:text-ink'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className={`tap inline-flex items-center gap-1 text-caption font-bold px-3 py-1.5 rounded-full border transition-ui ${
                showCustom ? 'surface-wine text-white border-transparent shadow-soft' : 'bg-surface text-n-600 border-n-200 hover:text-ink'
              }`}
            >
              <CalendarClock className="h-3.5 w-3.5" /> Escolher data
            </button>
          </div>

          {showCustom && (
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-2 px-3 py-2 bg-surface border border-n-200 rounded-xl text-label text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
            />
          )}

          {/* Horário opcional — só quando há data */}
          {dueDate && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-caption font-semibold text-n-600">Horário (opcional):</span>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="px-2.5 py-1.5 bg-surface border border-n-200 rounded-lg text-caption text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={busy || !content.trim()}
          className="tap w-full inline-flex items-center justify-center gap-2 py-3 surface-wine text-white text-label font-bold rounded-xl shadow-soft hover:opacity-95 transition-ui disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {busy ? 'Salvando…' : 'Adicionar tarefa'}
        </button>
      </form>

      <div className="space-y-1.5 max-h-80 overflow-y-auto -mx-1 px-1">
        {tasks.length === 0 && (
          <p className="text-caption text-n-600 text-center py-6">Nada anotado ainda. Comece pela primeira tarefa acima.</p>
        )}
        {pending.map((t) => <TaskRow key={t.id} task={t} onToggle={toggle} onRemove={remove} />)}
        {done.length > 0 && (
          <>
            <p className="text-caption font-bold text-n-600 uppercase tracking-wider pt-2 pl-1">Concluídas ({done.length})</p>
            {done.map((t) => <TaskRow key={t.id} task={t} onToggle={toggle} onRemove={remove} />)}
          </>
        )}
      </div>

      {showFab && (
        <QuickAddFab actions={[{
          label: 'Nova tarefa',
          icon: Plus,
          onClick: () => { contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); contentRef.current?.focus(); },
        }]} />
      )}
    </div>
  );
};

const TaskRow: React.FC<{ task: Task; onToggle: (t: Task) => void; onRemove: (t: Task) => void; }> = ({ task, onToggle, onRemove }) => (
  <div className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-n-50/60 transition-colors">
    <button
      type="button"
      onClick={() => onToggle(task)}
      className={`h-5 w-5 shrink-0 rounded-md border flex items-center justify-center transition-ui ${
        task.done ? 'bg-wine-700 border-wine-700 text-white' : 'border-n-300 hover:border-wine-700'
      }`}
      aria-label={task.done ? 'Desmarcar' : 'Concluir'}
    >
      {task.done && <Check className="h-3.5 w-3.5" />}
    </button>
    <div className="flex-1 min-w-0">
      <span className={`text-label block ${task.done ? 'line-through text-n-600' : 'text-ink'}`}>{task.content}</span>
      {task.due_date && (
        <span className="inline-flex items-center gap-1 text-caption font-bold text-wine-600 bg-wine-700/8 rounded-md px-1.5 py-0.5 mt-0.5">
          <CalendarClock className="h-2.5 w-2.5" />
          {formatDateBR(task.due_date)}{task.due_time ? ` · ${task.due_time.substring(0, 5)}` : ''}
        </span>
      )}
    </div>
    <button type="button" onClick={() => onRemove(task)} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-n-600 hover:text-danger transition-ui" aria-label="Excluir">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  </div>
);

export default TasksWidget;

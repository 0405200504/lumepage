'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Task } from '@/types/database';
import { Plus, Check, Trash2, NotebookPen } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { createTaskAction, toggleTaskAction, deleteTaskAction } from '@/app/actions/crm';

interface TasksWidgetProps {
  professionalId: string;
  initialTasks: Task[];
}

export const TasksWidget: React.FC<TasksWidgetProps> = ({ professionalId, initialTasks }) => {
  const router = useRouter();
  const { error } = useToast();
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  // Estado otimista local para resposta instantânea
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    setBusy(true);
    const optimistic: Task = { id: `tmp-${Date.now()}`, professional_id: professionalId, content: text, done: false, created_at: new Date().toISOString() };
    setTasks((t) => [optimistic, ...t]);
    setContent('');
    try {
      const res = await createTaskAction(professionalId, text);
      if (!res.success) { setTasks((t) => t.filter(x => x.id !== optimistic.id)); error('Falha', res.error || 'Não foi possível salvar.'); }
      else router.refresh();
    } finally { setBusy(false); }
  };

  const toggle = async (task: Task) => {
    setTasks((t) => t.map(x => x.id === task.id ? { ...x, done: !x.done } : x));
    const res = await toggleTaskAction(professionalId, task.id, !task.done);
    if (!res.success) { setTasks((t) => t.map(x => x.id === task.id ? { ...x, done: task.done } : x)); error('Falha', res.error || 'Erro.'); }
    else router.refresh();
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
          <h3 className="text-base font-black text-ink tracking-tight leading-none">Bloco de notas & tarefas</h3>
          <p className="text-[11px] text-gray-450 mt-1">Anote o que é importante e não esqueça nada do dia.</p>
        </div>
      </div>

      <form onSubmit={add} className="flex gap-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ex: comprar algodão, retornar p/ Marina, pagar fornecedor..."
          className="flex-1 min-w-0 px-3 py-2.5 bg-cream/60 border border-gray-150 rounded-xl text-sm placeholder-gray-450/60 focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700"
        />
        <button type="submit" disabled={busy} className="shrink-0 px-3.5 surface-wine text-white rounded-xl shadow-soft hover:opacity-95 transition-all-custom disabled:opacity-60" aria-label="Adicionar">
          <Plus className="h-5 w-5" />
        </button>
      </form>

      <div className="space-y-1.5 max-h-72 overflow-y-auto -mx-1 px-1">
        {tasks.length === 0 && (
          <p className="text-xs text-gray-450 text-center py-6">Nada anotado ainda. Comece pela primeira tarefa acima ☝️</p>
        )}
        {pending.map((t) => (
          <TaskRow key={t.id} task={t} onToggle={toggle} onRemove={remove} />
        ))}
        {done.length > 0 && (
          <>
            <p className="text-[10px] font-bold text-gray-450 uppercase tracking-wider pt-2 pl-1">Concluídas ({done.length})</p>
            {done.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={toggle} onRemove={remove} />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

const TaskRow: React.FC<{ task: Task; onToggle: (t: Task) => void; onRemove: (t: Task) => void; }> = ({ task, onToggle, onRemove }) => (
  <div className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-cream/60 transition-colors">
    <button
      onClick={() => onToggle(task)}
      className={`h-5 w-5 shrink-0 rounded-md border flex items-center justify-center transition-all ${
        task.done ? 'surface-wine border-transparent text-white' : 'border-gray-250 hover:border-wine-700'
      }`}
      aria-label={task.done ? 'Desmarcar' : 'Concluir'}
    >
      {task.done && <Check className="h-3.5 w-3.5" />}
    </button>
    <span className={`flex-1 text-sm ${task.done ? 'line-through text-gray-450' : 'text-ink'}`}>{task.content}</span>
    <button onClick={() => onRemove(task)} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-450 hover:text-[#b23a48] transition-all" aria-label="Excluir">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  </div>
);

export default TasksWidget;

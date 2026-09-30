'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Plus, Trash2, CalendarDays, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { createTaskAction, setTaskDoneAction, deleteTaskAction } from '@/app/actions/admin-crm';
import type { AdminTask } from '@/lib/admin/crm';
import { button, fieldSm, cx } from './ui';
import { formatDateBR } from '@/lib/format';

/**
 * Tarefas do admin: a lista de "o que eu preciso fazer", com prazo e conta.
 * Concluir é um clique; criar é uma linha. Vive na Início e em /admin/tasks.
 */

const today = () => new Date().toISOString().slice(0, 10);

export function TaskList({ tasks, showAccount = true, compact = false }: { tasks: AdminTask[]; showAccount?: boolean; compact?: boolean }) {
  const router = useRouter();
  const { error } = useToast();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = (id: string, fn: () => Promise<{ success: boolean; error?: string }>) => {
    setBusyId(id);
    start(async () => {
      const res = await fn();
      setBusyId(null);
      if (!res.success) error('Não deu', res.error ?? 'Tente de novo.');
      else router.refresh();
    });
  };

  if (tasks.length === 0) return null;

  return (
    <ul className="divide-y divide-line">
      {tasks.map(t => {
        const done = !!t.done_at;
        const overdue = !done && !!t.due_date && t.due_date < today();
        const isToday = !done && t.due_date === today();
        return (
          <li key={t.id} className={cx('flex items-center gap-3 px-5', compact ? 'py-2.5' : 'py-3')}>
            <button
              type="button"
              disabled={pending && busyId === t.id}
              onClick={() => run(t.id, () => setTaskDoneAction(t.id, !done))}
              aria-label={done ? 'Reabrir tarefa' : 'Concluir tarefa'}
              className={cx(
                'h-5 w-5 rounded-full shrink-0 inline-flex items-center justify-center transition-ui',
                done ? 'bg-success text-white' : 'ring-1 ring-inset ring-line-strong hover:ring-wine-700 hover:bg-wine-50',
              )}
            >
              {busyId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : done ? <Check className="h-3 w-3" /> : null}
            </button>
            <span className="min-w-0 flex-1">
              <span className={cx('block text-body-sm', done ? 'text-n-500 line-through' : 'text-heading font-medium')}>{t.title}</span>
              <span className="block text-caption text-n-500 truncate">
                {showAccount && t.professional_id && t.professional_name && (
                  <Link href={`/admin/professionals/${t.professional_id}`} className="hover:underline underline-offset-2">{t.professional_name}</Link>
                )}
                {showAccount && t.professional_id && t.professional_name && t.due_date && ' · '}
                {t.due_date && (
                  <span className={cx('num', overdue ? 'text-danger font-semibold' : isToday ? 'text-warning font-semibold' : '')}>
                    {overdue ? 'venceu ' : isToday ? 'hoje' : ''}{!isToday && formatDateBR(t.due_date)}
                  </span>
                )}
                {t.source?.startsWith('alert:') && <span className="ml-1.5 text-n-400">· de um alerta</span>}
              </span>
            </span>
            <button type="button" onClick={() => run(t.id, () => deleteTaskAction(t.id))} aria-label="Apagar tarefa" className="icon-chip h-8 w-8 hover:!bg-danger-bg hover:!text-danger">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function NewTaskForm({ professionalId, accounts, defaultTitle = '', className = '' }: {
  professionalId?: string | null;
  /** Para escolher a conta (quando a tarefa não nasce dentro de uma). */
  accounts?: { value: string; label: string }[];
  defaultTitle?: string;
  className?: string;
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [title, setTitle] = useState(defaultTitle);
  const [due, setDue] = useState('');
  const [account, setAccount] = useState(professionalId ?? '');
  const [pending, start] = useTransition();

  const submit = () => start(async () => {
    const res = await createTaskAction({ title, dueDate: due || null, professionalId: account || null });
    if (!res.success) { error('Não deu', res.error ?? 'Tente de novo.'); return; }
    success('Tarefa criada', title);
    setTitle(''); setDue('');
    router.refresh();
  });

  return (
    <form onSubmit={e => { e.preventDefault(); submit(); }} className={cx('flex flex-wrap items-center gap-2', className)}>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nova tarefa…" aria-label="Título da tarefa"
        className={cx(fieldSm, 'flex-1 min-w-[12rem]')} />
      <span className="relative inline-flex">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-n-400" aria-hidden />
        <input type="date" value={due} onChange={e => setDue(e.target.value)} aria-label="Prazo" className={cx(fieldSm, 'w-auto !pl-9')} />
      </span>
      {accounts && !professionalId && (
        <select value={account} onChange={e => setAccount(e.target.value)} aria-label="Conta" className={cx(fieldSm, 'w-auto max-w-[14rem]')}>
          <option value="">Sem conta</option>
          {accounts.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      )}
      <button type="submit" disabled={pending || !title.trim()} className={button('primary', 'sm')}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Adicionar
      </button>
    </form>
  );
}

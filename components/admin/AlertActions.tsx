'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ListPlus } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { snoozeAlertAction, createTaskAction } from '@/app/actions/admin-crm';

/** Adiar por 7 dias ou transformar o alerta numa tarefa com prazo para hoje. */
export function AlertActions({ alertId, title }: { alertId: string; title: string }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [pending, start] = useTransition();

  const cls = 'icon-chip h-8 w-8 bg-transparent disabled:opacity-40';

  return (
    <span className="inline-flex items-center gap-0.5 shrink-0" onClick={e => e.preventDefault()}>
      <button
        type="button" disabled={pending} className={cls} title="Virar tarefa para hoje" aria-label="Criar tarefa a partir deste alerta"
        onClick={e => { e.stopPropagation(); start(async () => {
          const res = await createTaskAction({ title, dueDate: new Date().toISOString().slice(0, 10), source: `alert:${alertId}` });
          if (!res.success) error('Não deu', res.error ?? 'Tente de novo.');
          else { success('Tarefa criada', title); router.refresh(); }
        }); }}
      >
        <ListPlus className="h-4 w-4" />
      </button>
      <button
        type="button" disabled={pending} className={cls} title="Adiar por 7 dias" aria-label="Adiar este alerta por 7 dias"
        onClick={e => { e.stopPropagation(); start(async () => {
          const res = await snoozeAlertAction(alertId, 7);
          if (!res.success) error('Não deu', res.error ?? 'Tente de novo.');
          else { success('Alerta adiado', 'Volta em 7 dias.'); router.refresh(); }
        }); }}
      >
        <Clock className="h-4 w-4" />
      </button>
    </span>
  );
}

export default AlertActions;

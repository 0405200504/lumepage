import React from 'react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { SubNav, INICIO_NAV } from '@/components/admin/SubNav';
import { StatStrip, Panel, Notice, EmptyState } from '@/components/admin/primitives';
import { TaskList, NewTaskForm } from '@/components/admin/TaskList';
import { listTasks, MIGRATION_CRM } from '@/lib/admin/crm';
import { professionalOptions } from '@/lib/admin/queries';

export const metadata = { title: 'Tarefas | Lume Admin' };

export default async function AdminTasksPage() {
  const session = await requireAdmin();
  const [{ tasks, available }, options] = await Promise.all([listTasks({ includeDone: true, limit: 500 }), professionalOptions()]);

  // eslint-disable-next-line react-hooks/purity -- Server Component: relógio por request.
  const nowMs = Date.now();
  const today = new Date(nowMs).toISOString().slice(0, 10);
  const open = tasks.filter(t => !t.done_at);
  const done = tasks.filter(t => !!t.done_at).sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? '')).slice(0, 50);
  const overdue = open.filter(t => t.due_date && t.due_date < today);
  const dueToday = open.filter(t => t.due_date === today);
  const done30 = tasks.filter(t => t.done_at && nowMs - new Date(t.done_at).getTime() <= 30 * 86_400_000).length;

  return (
    <LayoutAdmin
      session={session}
      title="Tarefas"
      subtitle="O que você combinou de fazer, com prazo e conta. Concluir é um clique."
    >
      <div className="space-y-4">
        <SubNav items={INICIO_NAV} />

        {!available && (
          <Notice tone="warn">Rode <code className="font-mono">{MIGRATION_CRM}</code> no Supabase para ativar as tarefas.</Notice>
        )}

        <StatStrip items={[
          { label: 'Abertas', value: String(open.length) },
          { label: 'Vencidas', value: String(overdue.length), tone: overdue.length ? 'bad' : 'default' },
          { label: 'Para hoje', value: String(dueToday.length), tone: dueToday.length ? 'warn' : 'default' },
          { label: 'Concluídas (30 dias)', value: String(done30) },
        ]} />

        <Panel title="Nova tarefa">
          <NewTaskForm accounts={options} />
        </Panel>

        <Panel flush title="Abertas" note="Vencidas primeiro, depois por prazo">
          <div className="border-t border-line">
            {open.length === 0 ? <EmptyState title="Nada pendente" className="py-8" /> : <TaskList tasks={open} />}
          </div>
        </Panel>

        {done.length > 0 && (
          <Panel flush title="Concluídas" note="As 50 mais recentes">
            <div className="border-t border-line">
              <TaskList tasks={done} />
            </div>
          </Panel>
        )}
      </div>
    </LayoutAdmin>
  );
}

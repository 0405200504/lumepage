import React from 'react';
import Link from 'next/link';
import { Bell, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { getAdminAlerts } from '@/lib/admin/alerts';

export const metadata = { title: 'Alertas | Lume Admin' };

const ICON = { bad: AlertTriangle, warn: Bell, info: Info } as const;
const TONE = {
  bad: 'text-[color:var(--color-bad)] bg-[color:var(--color-bad)]/10',
  warn: 'text-[color:var(--color-warn)] bg-[color:var(--color-warn)]/10',
  info: 'text-muted bg-surface-2',
} as const;

export default async function AdminAlertsPage() {
  const session = await requireAdmin();
  const alerts = await getAdminAlerts();

  return (
    <LayoutAdmin
      session={session}
      title="Alertas"
      subtitle="O que precisa da sua atenção agora. As regras são avaliadas a cada carregamento — sem job, sem atraso."
    >
      {alerts.length === 0 ? (
        <div className="card py-16 flex flex-col items-center text-center">
          <CheckCircle2 className="h-8 w-8 text-[color:var(--color-ok)] mb-3" aria-hidden />
          <h2 className="text-sm font-bold text-ink">Nada pegando fogo</h2>
          <p className="mt-1 text-xs text-muted">Nenhum trial vencendo, nenhuma conta parada, nenhuma conversa esperando.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {alerts.map(a => {
            const Icon = ICON[a.level];
            return (
              <li key={a.id}>
                <Link href={a.href} className="card px-4 py-3.5 flex items-start gap-3 hover:bg-surface-2 transition-colors">
                  <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${TONE[a.level]}`}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-ink">{a.title}</span>
                    <span className="block text-xs text-muted mt-0.5">{a.detail}</span>
                  </span>
                  <span className="text-xs font-bold text-accent-link shrink-0 self-center">Ver →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </LayoutAdmin>
  );
}

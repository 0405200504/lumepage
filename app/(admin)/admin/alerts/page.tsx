import React from 'react';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { getAdminAlerts } from '@/lib/admin/alerts';

export const metadata = { title: 'Alertas | Lume Admin' };

/**
 * O nível do alerta é marcado por um filete de 2px na borda esquerda e por um rótulo
 * em caixa-alta — não por um ícone dentro de um quadradinho colorido. A cor entra
 * uma vez, na menor área possível, e o que carrega a hierarquia é o tamanho do texto.
 */
const LEVEL = {
  bad: { edge: 'var(--bad-ink)', label: 'crítico' },
  warn: { edge: 'var(--warn-ink)', label: 'atenção' },
  info: { edge: 'var(--rule-strong)', label: 'informação' },
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
        <p className="text-[13px] text-[color:var(--ink-muted)] max-w-xl">
          Nada pegando fogo: nenhum acesso vencendo, nenhuma conta parada há 30 dias e nenhuma
          conversa esperando atendimento humano.
        </p>
      ) : (
        <ul className="border-t border-[color:var(--rule-subtle)]">
          {alerts.map(a => {
            const level = LEVEL[a.level];
            return (
              <li key={a.id}>
                <Link
                  href={a.href}
                  style={{ borderLeftColor: level.edge }}
                  className="group flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-[color:var(--rule-subtle)] border-l-2 pl-3.5 pr-2 py-3 hover:bg-[color:var(--surface-raised)] transition-colors"
                >
                  <span className="admin-eyebrow w-20 shrink-0">{level.label}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-[color:var(--ink)] leading-snug">{a.title}</span>
                    <span className="block text-[12px] text-[color:var(--ink-muted)] mt-0.5">{a.detail}</span>
                  </span>
                  <span className="text-[11px] font-semibold text-[color:var(--color-accent-link)] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    Ver →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </LayoutAdmin>
  );
}

import React from 'react';
import { notFound } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { ResolveConversationButton } from '@/components/admin/ConversationActions';
import { Badge } from '@/components/admin/badges';
import { EmptyState } from '@/components/admin/primitives';
import { button } from '@/components/admin/ui';
import { getConversation } from '@/lib/admin/queries';
import { formatDateTimeBR, formatDurationBR } from '@/lib/format';
import { buildWhatsappLink } from '@/lib/whatsapp';

export const metadata = { title: 'Conversa | Lume Admin' };

export default async function ConversationThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id } = await params;
  const data = await getConversation(id);
  if (!data) notFound();
  const { row, messages } = data;

  return (
    <LayoutAdmin
      session={session}
      title={row.clientPhone}
      subtitle={`Conversa com ${row.professionalName} · ${messages.length} mensagem(ns) · última em ${formatDateTimeBR(row.lastMessageAt)}`}
      backHref="/admin/conversations"
      backLabel="Conversas"
      actions={
        <>
          <a href={buildWhatsappLink(row.clientPhone, '')} target="_blank" rel="noopener noreferrer" className={button('secondary', 'md')}>
            <MessageCircle className="h-4 w-4" /> Abrir no WhatsApp
          </a>
          <ResolveConversationButton id={row.id} paused={row.botPaused} />
        </>
      }
    >
      <div className="space-y-4 max-w-3xl">
        <div>
          {row.botPaused
            ? <Badge tone="warn">esperando humano há {formatDurationBR(row.waitingHours * 3_600_000)}</Badge>
            : <Badge tone="ok">bot respondendo</Badge>}
        </div>

        {/* Leitura apenas: responder pela cliente é papel da profissional, no painel dela. */}
        <ul className="space-y-2">
          {messages.map((m, i) => (
            <li key={i} className={`flex ${m.role === 'assistant' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-surface px-4 py-3 text-body-sm ${m.role === 'assistant' ? 'bg-accent-soft text-heading' : 'card'}`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className="mt-1.5 text-caption text-n-500">{m.role === 'assistant' ? 'bot' : 'cliente'} · {formatDateTimeBR(new Date(m.at))}</p>
              </div>
            </li>
          ))}
          {messages.length === 0 && <li className="card"><EmptyState title="Sem mensagens registradas" /></li>}
        </ul>
      </div>
    </LayoutAdmin>
  );
}

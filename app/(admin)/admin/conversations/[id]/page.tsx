import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { ResolveConversationButton } from '@/components/admin/ConversationActions';
import { Badge } from '@/components/admin/badges';
import { getConversation } from '@/lib/admin/queries';
import { formatDateTimeBR } from '@/lib/format';
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
      subtitle={`Conversa com ${row.professionalName} · ${messages.length} mensagem(ns)`}
      actions={
        <>
          <ResolveConversationButton id={row.id} paused={row.botPaused} />
          <a href={buildWhatsappLink(row.clientPhone, '')} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-line bg-surface text-xs font-bold text-[#226045] hover:bg-surface-2">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
          <Link href="/admin/conversations" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-line bg-surface text-xs font-bold text-ink hover:bg-surface-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <div className="card px-4 py-3 flex flex-wrap items-center gap-2.5 text-xs">
          {row.botPaused ? <Badge tone="warn">esperando humano há {row.waitingHours}h</Badge> : <Badge tone="ok">bot respondendo</Badge>}
          <span className="text-muted">Última mensagem em {formatDateTimeBR(row.lastMessageAt)}</span>
        </div>

        {/* Leitura apenas: responder pela cliente é papel da profissional, no painel dela. */}
        <ul className="space-y-2 max-w-3xl">
          {messages.map((m, i) => (
            <li key={i} className={`flex ${m.role === 'assistant' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs ${
                m.role === 'assistant' ? 'bg-accent-soft text-ink' : 'card'
              }`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className="mt-1 text-[10px] text-muted">{m.role === 'assistant' ? 'bot' : 'cliente'} · {formatDateTimeBR(new Date(m.at))}</p>
              </div>
            </li>
          ))}
          {messages.length === 0 && <li className="card py-10 text-center text-xs text-muted">Sem mensagens registradas.</li>}
        </ul>
      </div>
    </LayoutAdmin>
  );
}

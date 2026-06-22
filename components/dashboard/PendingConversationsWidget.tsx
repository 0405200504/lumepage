'use client';

import React, { useState, useTransition } from 'react';
import { MessageCircle, Bot, Phone } from 'lucide-react';
import { toggleBotPauseAction } from '@/app/actions/whatsapp';
import { WhatsAppConversation } from '@/types/database';

type PendingConv = WhatsAppConversation & { client_name?: string };

interface Props {
  initialConversations: PendingConv[];
  /** Quando true, exibe um estado vazio amigável em vez de não renderizar nada.
      Usado na aba dedicada "Conversas"; na Início o widget some quando vazio. */
  showEmptyState?: boolean;
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '').replace(/^55/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function lastClientMessage(messages: WhatsAppConversation['messages']): string {
  const clientMsgs = (messages || []).filter(m => m.role === 'user');
  return clientMsgs.length > 0 ? clientMsgs[clientMsgs.length - 1].content : '';
}

export function PendingConversationsWidget({ initialConversations, showEmptyState = false }: Props) {
  const [conversations, setConversations] = useState(initialConversations);
  const [isPending, startTransition] = useTransition();
  const [resuming, setResuming] = useState<string | null>(null);

  if (conversations.length === 0) {
    if (!showEmptyState) return null;
    return (
      <div className="bg-white rounded-3xl border border-[#efe9e6] shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center text-center px-6 py-14">
          <div className="w-12 h-12 rounded-2xl bg-[#f7f3ee] flex items-center justify-center mb-4">
            <MessageCircle className="h-5 w-5 text-gray-400" />
          </div>
          <h2 className="text-sm font-bold text-gray-900">Nenhuma conversa pendente</h2>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            Quando o bot pausar um atendimento e a cliente precisar de você, a conversa aparece aqui.
          </p>
        </div>
      </div>
    );
  }

  const handleResume = (phone: string) => {
    setResuming(phone);
    startTransition(async () => {
      await toggleBotPauseAction(phone, false);
      setConversations(prev => prev.filter(c => c.client_phone !== phone));
      setResuming(null);
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-[#efe9e6] shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#efe9e6]">
        <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
          <MessageCircle className="h-4 w-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-gray-900">Conversas Pendentes</h2>
          <p className="text-xs text-gray-400">A cliente aguarda seu atendimento direto</p>
        </div>
        <span className="text-xs font-bold text-white bg-amber-500 rounded-full px-2 py-0.5 min-w-[20px] text-center">
          {conversations.length}
        </span>
      </div>

      <div className="divide-y divide-[#f5f0ed]">
        {conversations.map(conv => {
          const lastMsg = lastClientMessage(conv.messages);
          const displayName = conv.client_name || formatPhone(conv.client_phone);
          const isResuming = resuming === conv.client_phone;

          return (
            <div key={conv.client_phone} className="flex items-start gap-3 px-5 py-4">
              <div className="w-9 h-9 rounded-2xl bg-[#f7f3ee] flex items-center justify-center shrink-0 mt-0.5">
                <Phone className="h-4 w-4 text-gray-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-gray-900 truncate">{displayName}</span>
                  <span className="text-xs text-gray-400 shrink-0">{timeAgo(conv.last_message_at)}</span>
                </div>
                {conv.client_name && (
                  <p className="text-xs text-gray-400 mb-0.5">{formatPhone(conv.client_phone)}</p>
                )}
                {lastMsg && (
                  <p className="text-xs text-gray-500 truncate mb-2">"{lastMsg}"</p>
                )}
                <button
                  onClick={() => handleResume(conv.client_phone)}
                  disabled={isResuming || isPending}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#500b18] bg-[#f7f0f0] hover:bg-[#f0e5e5] rounded-xl px-3 py-1.5 transition-colors disabled:opacity-50"
                >
                  <Bot className="h-3 w-3" />
                  {isResuming ? 'Retomando...' : 'Retomar Bot'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

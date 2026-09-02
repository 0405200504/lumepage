'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Search, Send, Paperclip, ArrowLeft, Check, CheckCheck, Clock, Loader2,
  MessageCircle, Users, FileText, Mic, RefreshCw, AlertCircle,
} from 'lucide-react';
import {
  listChatsAction, listMessagesAction, sendChatMessageAction, sendChatMediaAction, markChatReadAction,
} from '@/app/actions/inbox';
import type { InboxChat, InboxMessage } from '@/lib/uazapi';
import { useToast } from '@/components/ui/Toast';

// Ritmo do "tempo real": a lista respira devagar, a conversa aberta é mais
// rápida. Só roda com a aba visível — ninguém precisa de polling minimizado.
const CHATS_POLL_MS = 8000;
const MESSAGES_POLL_MS = 4000;

export function WhatsAppInbox({ connected }: { connected: boolean }) {
  const { error } = useToast();

  const [chats, setChats] = useState<InboxChat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(connected);
  const [chatsError, setChatsError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [activeChat, setActiveChat] = useState<InboxChat | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const activeChatId = activeChat?.chatid ?? null;
  const loadedOnce = useRef(false);
  // Só cola o scroll no fim quando já estamos no fim — senão a gente arranca a
  // pessoa do meio da leitura do histórico a cada polling.
  const stickToBottom = useRef(true);

  // ── Carregamento ──────────────────────────────────────────────────────────
  // Sem setState antes do await: o spinner inicial vem do estado inicial e os
  // refreshes silenciosos não devem piscar a lista.
  const loadChats = useCallback(async (term: string, quiet = false) => {
    try {
      const res = await listChatsAction({ search: term || undefined });
      if (res.success) {
        setChats(res.chats);
        setChatsError(null);
      } else if (!quiet) {
        setChatsError(res.error ?? 'Não foi possível carregar as conversas.');
      }
    } catch (e) {
      // Server action que rejeita (rede, timeout, erro no servidor) não pode
      // deixar o spinner girando para sempre — mostra o motivo e libera a tela.
      console.error('[inbox] listChats falhou:', e);
      if (!quiet) setChatsError(e instanceof Error ? e.message : 'Falha ao falar com o servidor.');
    } finally {
      setChatsLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (chatid: string, quiet = false) => {
    if (!quiet) setMessagesLoading(true);
    try {
      const res = await listMessagesAction(chatid);
      if (res.success) setMessages(res.messages);
      else if (!quiet) setMessagesError(res.error ?? 'Não foi possível carregar as mensagens.');
    } catch (e) {
      console.error('[inbox] listMessages falhou:', e);
      if (!quiet) setMessagesError(e instanceof Error ? e.message : 'Falha ao falar com o servidor.');
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // Primeira carga e busca no mesmo efeito: a busca espera 350ms para não
  // disparar uma chamada por tecla, a carga inicial vai direto.
  useEffect(() => {
    if (!connected) return;
    const first = !loadedOnce.current;
    const t = setTimeout(() => {
      loadedOnce.current = true;
      void loadChats(search, !first);
    }, first ? 0 : 350);
    return () => clearTimeout(t);
  }, [search, connected, loadChats]);

  // Polling da lista
  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void loadChats(search, true);
    }, CHATS_POLL_MS);
    return () => clearInterval(t);
  }, [connected, search, loadChats]);

  // Polling da conversa aberta
  useEffect(() => {
    if (!activeChatId) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void loadMessages(activeChatId, true);
    }, MESSAGES_POLL_MS);
    return () => clearInterval(t);
  }, [activeChatId, loadMessages]);

  // Rola para a última mensagem quando chega algo novo
  useEffect(() => {
    if (!stickToBottom.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  async function openChat(chat: InboxChat) {
    setActiveChat(chat);
    setMessages([]);
    setMessagesError(null);
    stickToBottom.current = true;
    void loadMessages(chat.chatid);
    if (chat.unread > 0) {
      // Zera na hora e confirma no WhatsApp da profissional.
      setChats(prev => prev.map(c => (c.chatid === chat.chatid ? { ...c, unread: 0 } : c)));
      void markChatReadAction(chat.chatid);
    }
  }

  // ── Envio ─────────────────────────────────────────────────────────────────
  async function handleSend() {
    const text = draft.trim();
    if (!text || !activeChat || sending) return;

    setSending(true);
    setDraft('');
    // Bolha otimista: aparece na hora, com relógio, e some no próximo refresh.
    const optimistic: InboxMessage = {
      id: `local-${Date.now()}`, messageid: '', fromMe: true, type: 'text',
      text, timestamp: Date.now(), status: 'Pending', senderName: null,
      hasMedia: false, mimetype: null,
    };
    stickToBottom.current = true;
    setMessages(prev => [...prev, optimistic]);

    const res = await sendChatMessageAction(activeChat.chatid, text);
    setSending(false);

    if (!res.success) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setDraft(text);
      error('Não enviou', res.error ?? 'Tente novamente.');
      return;
    }
    void loadMessages(activeChat.chatid, true);
    void loadChats(search, true);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeChat) return;

    // A uazapi aceita base64 direto, então o arquivo nem toca no nosso storage.
    if (file.size > 16 * 1024 * 1024) {
      error('Arquivo muito grande', 'O WhatsApp aceita até 16 MB.');
      return;
    }
    const kind: 'image' | 'video' | 'audio' | 'document' =
      file.type.startsWith('image/') ? 'image'
      : file.type.startsWith('video/') ? 'video'
      : file.type.startsWith('audio/') ? 'audio'
      : 'document';

    setSending(true);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('falha ao ler o arquivo'));
      reader.readAsDataURL(file);
    }).catch(() => null);

    if (!dataUrl) { setSending(false); error('Não deu', 'Não foi possível ler o arquivo.'); return; }

    const res = await sendChatMediaAction(activeChat.chatid, dataUrl, kind, { fileName: file.name });
    setSending(false);
    if (!res.success) { error('Não enviou', res.error ?? 'Tente novamente.'); return; }
    stickToBottom.current = true;
    void loadMessages(activeChat.chatid, true);
  }

  // ── Estados sem conversa ──────────────────────────────────────────────────
  if (!connected) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3 p-10 text-center">
        <MessageCircle className="h-8 w-8 text-faint" />
        <div>
          <p className="text-body-sm font-semibold text-heading">WhatsApp desconectado</p>
          <p className="mt-1 text-caption text-n-600">Conecte seu número na aba Mensagens automáticas para ver as conversas aqui.</p>
        </div>
      </div>
    );
  }

  return (
    <div data-tour="module-action" className="card flex h-[calc(100vh-11rem)] min-h-[30rem] overflow-hidden p-0">
      {/* ── Coluna: conversas ─────────────────────────────────────────────── */}
      <aside className={`flex w-full flex-col border-line md:w-[22rem] md:border-r lg:w-[24rem] ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="border-b border-line p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conversa"
              className="w-full rounded-xl border border-line bg-surface-2 py-2.5 pl-9 pr-3 text-label text-heading outline-none placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chatsLoading && chats.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-10 text-caption text-n-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando conversas…
            </div>
          )}

          {chatsError && (
            <div className="m-3 flex items-start gap-2 rounded-xl border border-line bg-surface-2 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
              <div className="min-w-0">
                <p className="text-caption text-n-600">{chatsError}</p>
                <button
                  onClick={() => { setChatsLoading(true); void loadChats(search); }}
                  className="mt-1 inline-flex items-center gap-1 text-caption font-bold text-wine-700"
                >
                  <RefreshCw className="h-3 w-3" /> Tentar de novo
                </button>
              </div>
            </div>
          )}

          {!chatsLoading && !chatsError && chats.length === 0 && (
            <p className="px-4 py-10 text-center text-caption text-n-600">
              {search ? 'Nenhuma conversa com esse nome.' : 'Nenhuma conversa ainda.'}
            </p>
          )}

          {chats.map(chat => (
            <button
              key={chat.chatid}
              onClick={() => void openChat(chat)}
              className={`flex w-full items-center gap-3 border-b border-line px-3 py-3 text-left transition-colors hover:bg-surface-2 ${
                activeChatId === chat.chatid ? 'bg-surface-2' : ''
              }`}
            >
              <Avatar chat={chat} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-body-sm font-semibold text-heading">{chat.name}</p>
                  {chat.lastMessageAt && (
                    <span className="shrink-0 mono-micro text-n-400">{shortTime(chat.lastMessageAt)}</span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-caption text-n-600">
                    {previewText(chat.lastPreview, chat.lastMessageType)}
                  </p>
                  {chat.unread > 0 && (
                    <span className="shrink-0 rounded-badge bg-[color:var(--color-signal)] px-1.5 py-0.5 mono-micro !text-white">
                      {chat.unread > 99 ? '99+' : chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Coluna: conversa ──────────────────────────────────────────────── */}
      <section className={`flex min-w-0 flex-1 flex-col ${activeChat ? 'flex' : 'hidden md:flex'}`}>
        {!activeChat ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-surface-2 text-center">
            <MessageCircle className="h-10 w-10 text-faint" />
            <p className="text-body-sm font-semibold text-heading">Suas conversas do WhatsApp</p>
            <p className="max-w-xs text-caption text-n-600">
              Escolha uma conversa à esquerda para ler e responder sem sair do Lume.
            </p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-line px-4 py-3">
              <button onClick={() => setActiveChat(null)} className="md:hidden" aria-label="Voltar">
                <ArrowLeft className="h-5 w-5 text-n-600" />
              </button>
              <Avatar chat={activeChat} />
              <div className="min-w-0">
                <p className="truncate text-label font-bold text-heading">{activeChat.name}</p>
                <p className="truncate text-caption text-n-600">
                  {activeChat.isGroup ? 'Grupo' : formatPhone(activeChat.phone)}
                </p>
              </div>
            </header>

            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 space-y-1 overflow-y-auto bg-surface-2 px-4 py-4"
            >
              {messagesLoading && messages.length === 0 && (
                <div className="flex items-center justify-center gap-2 py-10 text-caption text-n-600">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando mensagens…
                </div>
              )}
              {messagesError && messages.length === 0 && !messagesLoading && (
                <div className="mx-auto flex max-w-sm items-start gap-2 rounded-xl border border-line bg-surface p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                  <div className="min-w-0">
                    <p className="text-caption text-n-600">{messagesError}</p>
                    <button
                      onClick={() => { setMessagesError(null); void loadMessages(activeChat.chatid); }}
                      className="mt-1 inline-flex items-center gap-1 text-caption font-bold text-wine-700"
                    >
                      <RefreshCw className="h-3 w-3" /> Tentar de novo
                    </button>
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <React.Fragment key={msg.id || `${msg.timestamp}-${i}`}>
                  {showDaySeparator(messages, i) && (
                    <div className="flex justify-center py-3">
                      <span className="rounded-full bg-surface px-3 py-1 text-caption font-semibold text-n-600 shadow-xs">
                        {dayLabel(msg.timestamp)}
                      </span>
                    </div>
                  )}
                  <Bubble msg={msg} isGroup={activeChat.isGroup} />
                </React.Fragment>
              ))}
            </div>

            <footer className="flex items-end gap-2 border-t border-line px-3 py-3">
              <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={sending}
                className="shrink-0 rounded-full p-2 text-n-600 transition-colors hover:bg-surface-2 disabled:opacity-50"
                aria-label="Anexar arquivo"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <textarea
                rows={1}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); }
                }}
                placeholder="Escreva uma mensagem"
                className="field-input max-h-32 min-h-[2.75rem] flex-1 resize-none py-2.5"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending || !draft.trim()}
                className="shrink-0 rounded-full bg-wine-700 p-3 text-white shadow-soft transition-colors hover:bg-wine-800 disabled:opacity-50"
                aria-label="Enviar"
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}

// ── Peças ───────────────────────────────────────────────────────────────────

function Avatar({ chat }: { chat: InboxChat }) {
  const initials = chat.name.replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/).slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '').join('') || '?';
  return chat.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={chat.image} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-3 text-caption font-bold text-n-600">
      {chat.isGroup ? <Users className="h-5 w-5" /> : initials}
    </span>
  );
}

function Bubble({ msg, isGroup }: { msg: InboxMessage; isGroup: boolean }) {
  const mine = msg.fromMe;
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      {/* Raio 10 em três cantos e 90° do lado do autor — a mesma gramática do
          chanfro: um canto quebrado dá direção e autoria sem setinha, sem cor
          extra e sem repetir avatar em cada linha.
          As minhas mensagens saem do verde translúcido (que era a única
          aparição do --success como SUPERFÍCIE no produto) e vão para o vinho
          da marca, com branco por cima: 11.9:1, legível em qualquer tamanho. */}
      <div
        className={`max-w-[78%] rounded-surface px-3 py-2 ${
          mine
            ? 'rounded-br-none bg-wine-700 text-white'
            : 'rounded-bl-none bg-surface border border-line text-ink'
        }`}
      >
        {isGroup && !mine && msg.senderName && (
          <p className="mb-1 mono-micro text-wine-700">{msg.senderName}</p>
        )}

        {msg.hasMedia && <Media msg={msg} />}

        {msg.text && (
          <p className="whitespace-pre-wrap break-words text-body-sm">{msg.text}</p>
        )}

        <div className="mt-0.5 flex items-center justify-end gap-1">
          <span className={`mono-micro ${mine ? 'text-wine-200' : 'text-n-400'}`}>{clock(msg.timestamp)}</span>
          {mine && <Status status={msg.status} />}
        </div>
      </div>
    </div>
  );
}

/** Mídia servida pelo proxy do Lume — a URL da uazapi exige token. */
function Media({ msg }: { msg: InboxMessage }) {
  const src = `/api/whatsapp/media/${encodeURIComponent(msg.id)}`;
  const t = msg.type;

  if (t.includes('image') || t.includes('sticker')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={msg.text || 'Imagem'} loading="lazy" className="mb-1 max-h-80 w-full rounded-xl object-cover" />
    );
  }
  if (t.includes('video') || t.includes('ptv')) {
    return <video src={src} controls className="mb-1 max-h-80 w-full rounded-xl" />;
  }
  if (t.includes('audio') || t.includes('ptt')) {
    return (
      <div className="mb-1 flex items-center gap-2">
        <Mic className="h-4 w-4 shrink-0 text-n-600" />
        <audio src={src} controls className="h-9 max-w-[15rem]" />
      </div>
    );
  }
  return (
    <a href={src} target="_blank" rel="noreferrer"
       className="mb-1 flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-caption font-semibold text-heading hover:bg-surface-3">
      <FileText className="h-4 w-4 shrink-0 text-n-600" />
      Abrir arquivo
    </a>
  );
}

function Status({ status }: { status: string | null }) {
  const s = (status ?? '').toLowerCase();
  if (s.includes('read')) return <CheckCheck className="h-3.5 w-3.5 text-[color:var(--color-accent-link)]" />;
  if (s.includes('deliver')) return <CheckCheck className="h-3.5 w-3.5 text-faint" />;
  if (s.includes('sent') || s.includes('server')) return <Check className="h-3.5 w-3.5 text-faint" />;
  return <Clock className="h-3 w-3 text-faint" />;
}

// ── Formatação ──────────────────────────────────────────────────────────────

/** Prévia da última mensagem quando ela não tem texto.
 *  Os emojis que abriam cada rótulo saíram: em lista densa eles roubavam a
 *  largura do nome da cliente e desenhavam diferente em cada aparelho. */
function previewText(text: string, type: string | null): string {
  if (text) return text;
  const t = (type ?? '').toLowerCase();
  if (t.includes('image')) return 'Foto';
  if (t.includes('video')) return 'Vídeo';
  if (t.includes('audio') || t.includes('ptt')) return 'Áudio';
  if (t.includes('document')) return 'Documento';
  if (t.includes('sticker')) return 'Figurinha';
  if (t.includes('location')) return 'Localização';
  if (t.includes('contact')) return 'Contato';
  return 'Mensagem';
}

const isSameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

function showDaySeparator(list: InboxMessage[], i: number): boolean {
  if (i === 0) return true;
  return !isSameDay(list[i - 1].timestamp, list[i].timestamp);
}

function dayLabel(ts: number): string {
  const now = Date.now();
  if (isSameDay(ts, now)) return 'Hoje';
  if (isSameDay(ts, now - 86400000)) return 'Ontem';
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

const clock = (ts: number) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function shortTime(ts: number): string {
  const d = new Date(ts);
  if (isSameDay(ts, Date.now())) return clock(ts);
  if (isSameDay(ts, Date.now() - 86400000)) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  return phone;
}

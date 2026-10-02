'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Send, Paperclip, ArrowLeft, Check, CheckCheck, Clock, Loader2, MessageCircle, Users,
  FileText, Mic, RefreshCw, AlertCircle, AlertTriangle, Camera, Video, MapPin, Contact, BarChart3,
  Phone, Image as ImageIcon, X, MoreVertical, ExternalLink, UserRound, MailOpen, ChevronDown, History, Smartphone,
} from 'lucide-react';
import {
  listChatsAction, listMessagesAction, sendChatMessageAction, sendChatMediaAction, markChatReadAction,
  requestHistoryAction, getChatAvatarsAction,
} from '@/app/actions/inbox';
import type { InboxChat, InboxMessage } from '@/lib/uazapi';
import { formatPhoneBR, type InboxKind } from '@/lib/whatsapp/inbox-shared';
import { useToast } from '@/components/ui/Toast';

// Ritmo do "tempo real": a lista respira devagar, a conversa aberta é mais
// rápida. Só roda com a aba visível — ninguém precisa de polling minimizado.
const CHATS_POLL_MS = 8000;
const MESSAGES_POLL_MS = 4000;
// Depois de pedir histórico ao celular, confere por 90 s se chegou algo.
const HISTORY_WAIT_MS = 90_000;
const HISTORY_CHECK_MS = 10_000;

type Filter = 'all' | 'unread' | 'groups';
type HistoryState = 'idle' | 'asking' | 'waiting' | 'arrived' | 'nothing';

export function WhatsAppInbox({ connected }: { connected: boolean }) {
  const { error, info } = useToast();

  // ── Lista ─────────────────────────────────────────────────────────────────
  const [chats, setChats] = useState<InboxChat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(connected);
  const [chatsError, setChatsError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});
  const avatarsAsked = useRef(new Set<string>());

  // ── Conversa ──────────────────────────────────────────────────────────────
  const [activeChat, setActiveChat] = useState<InboxChat | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [storeReady, setStoreReady] = useState(true);
  const [history, setHistory] = useState<HistoryState>('idle');
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);
  const [chatSearch, setChatSearch] = useState('');
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeChatId = activeChat?.chatid ?? null;
  const loadedOnce = useRef(false);
  // Só cola o scroll no fim quando já estamos no fim — senão a gente arranca a
  // pessoa do meio da leitura do histórico a cada polling.
  const stickToBottom = useRef(true);
  const historyAskedAt = useRef(0);

  const newestTs = messages.length ? messages[messages.length - 1].timestamp : 0;
  const oldest = messages.find(m => !m.id.startsWith('local-')) ?? null;

  // ── Carregamento da lista ─────────────────────────────────────────────────
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
      console.error('[inbox] listChats falhou:', e);
      if (!quiet) setChatsError(e instanceof Error ? e.message : 'Falha ao falar com o servidor.');
    } finally {
      setChatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!connected) return;
    const first = !loadedOnce.current;
    const t = setTimeout(() => {
      loadedOnce.current = true;
      void loadChats(search, !first);
    }, first ? 0 : 350);
    return () => clearTimeout(t);
  }, [search, connected, loadChats]);

  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void loadChats(search, true);
    }, CHATS_POLL_MS);
    return () => clearInterval(t);
  }, [connected, search, loadChats]);

  // Fotos que a lista da uazapi não trouxe: pede em lote, uma vez por chat.
  useEffect(() => {
    const missing = chats.filter(c => !c.image && !avatarsAsked.current.has(c.chatid)).slice(0, 30).map(c => c.chatid);
    if (!missing.length) return;
    missing.forEach(id => avatarsAsked.current.add(id));
    void getChatAvatarsAction(missing).then(res => {
      setAvatars(prev => ({ ...prev, ...res.avatars }));
    }).catch(() => {});
  }, [chats]);

  // ── Carregamento da conversa ──────────────────────────────────────────────
  const loadInitial = useCallback(async (chatid: string, unread: number) => {
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      const res = await listMessagesAction(chatid);
      if (!res.success) { setMessagesError(res.error ?? 'Não foi possível carregar as mensagens.'); return; }
      setMessages(res.messages);
      setHasOlder(res.hasMore);
      setStoreReady(res.storeReady);
      // Divisória "N mensagens não lidas" antes da primeira que ela não viu.
      if (unread > 0) {
        const incoming = res.messages.filter(m => !m.fromMe);
        const first = incoming[Math.max(0, incoming.length - unread)];
        setFirstUnreadId(first?.id ?? null);
      }
    } catch (e) {
      console.error('[inbox] listMessages falhou:', e);
      setMessagesError(e instanceof Error ? e.message : 'Falha ao falar com o servidor.');
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const pollNew = useCallback(async (chatid: string, since: number) => {
    try {
      const res = await listMessagesAction(chatid, { since: since || undefined });
      if (res.success && res.messages.length) setMessages(prev => mergeMessages(prev, res.messages));
    } catch { /* silencioso: é polling */ }
  }, []);

  const loadOlder = useCallback(async () => {
    if (!activeChatId || !oldest || loadingOlder) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const beforeHeight = el?.scrollHeight ?? 0;
    try {
      const res = await listMessagesAction(activeChatId, { before: oldest.timestamp });
      if (res.success) {
        if (res.messages.length) setMessages(prev => mergeMessages(prev, res.messages));
        setHasOlder(res.hasMore && res.messages.length > 0);
        setStoreReady(res.storeReady);
        // Mantém a leitura no mesmo lugar depois de prender mensagens em cima.
        requestAnimationFrame(() => {
          const node = scrollRef.current;
          if (node) node.scrollTop += node.scrollHeight - beforeHeight;
        });
      }
    } finally {
      setLoadingOlder(false);
    }
  }, [activeChatId, oldest, loadingOlder]);

  // Polling da conversa aberta
  useEffect(() => {
    if (!activeChatId) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void pollNew(activeChatId, newestTs);
    }, MESSAGES_POLL_MS);
    return () => clearInterval(t);
  }, [activeChatId, newestTs, pollNew]);

  // Depois de pedir histórico: espera chegar pelo webhook e puxa para cima.
  useEffect(() => {
    if (history !== 'waiting' || !activeChatId) return;
    const t = setInterval(async () => {
      if (Date.now() - historyAskedAt.current > HISTORY_WAIT_MS) { setHistory('nothing'); return; }
      const anchor = oldest?.timestamp;
      if (!anchor) return;
      const res = await listMessagesAction(activeChatId, { before: anchor }).catch(() => null);
      if (res?.success && res.messages.length) {
        setMessages(prev => mergeMessages(prev, res.messages));
        setHasOlder(res.hasMore);
        setHistory('arrived');
      }
    }, HISTORY_CHECK_MS);
    return () => clearInterval(t);
  }, [history, activeChatId, oldest]);

  // Rola para a última mensagem quando chega algo novo
  useEffect(() => {
    if (!stickToBottom.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, messagesLoading]);

  // Esc fecha o que estiver aberto
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (lightbox) setLightbox(null);
      else if (menuOpen) setMenuOpen(false);
      else if (chatSearchOpen) { setChatSearchOpen(false); setChatSearch(''); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, menuOpen, chatSearchOpen]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (el.scrollTop < 80 && hasOlder && !loadingOlder && !messagesLoading) void loadOlder();
  }

  function openChat(chat: InboxChat) {
    setActiveChat(chat);
    setMessages([]);
    setMessagesError(null);
    setHasOlder(false);
    setHistory('idle');
    setFirstUnreadId(null);
    setChatSearch('');
    setChatSearchOpen(false);
    setMenuOpen(false);
    stickToBottom.current = true;
    void loadInitial(chat.chatid, chat.unread);
    if (chat.unread > 0) {
      // Zera na hora e confirma no WhatsApp da profissional.
      setChats(prev => prev.map(c => (c.chatid === chat.chatid ? { ...c, unread: 0 } : c)));
      void markChatReadAction(chat.chatid);
    }
  }

  function closeChat() {
    setActiveChat(null);
    setMessages([]);
  }

  async function askHistory() {
    if (!activeChat) return;
    setHistory('asking');
    historyAskedAt.current = Date.now();
    const res = await requestHistoryAction(activeChat.chatid, oldest?.id ?? null);
    if (!res.success) {
      setHistory('idle');
      error('Não deu para pedir', res.error ?? 'Tente de novo em instantes.');
      return;
    }
    setHistory('waiting');
  }

  async function markUnread() {
    if (!activeChat) return;
    setMenuOpen(false);
    const res = await markChatReadAction(activeChat.chatid, false);
    if (res.success) {
      setChats(prev => prev.map(c => (c.chatid === activeChat.chatid ? { ...c, unread: Math.max(1, c.unread) } : c)));
      info('Marcada como não lida', 'A conversa volta a aparecer como pendente.');
    } else {
      error('Não deu', 'A uazapi não aceitou marcar como não lida.');
    }
  }

  // ── Envio ─────────────────────────────────────────────────────────────────
  async function handleSend() {
    const text = draft.trim();
    if (!text || !activeChat || sending) return;

    setSending(true);
    setDraft('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setFirstUnreadId(null);
    // Bolha otimista: aparece na hora, com relógio, e some quando a real chega.
    const optimistic: InboxMessage = {
      id: `local-${Date.now()}`, uazapiId: '', chatid: activeChat.chatid, fromMe: true, kind: 'text', rawType: 'text',
      text, timestamp: Date.now(), status: 'pending', senderName: null,
      hasMedia: false, mimetype: null, mediaCached: false, mediaError: null, quotedId: null,
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
    setChats(prev => prev.map(c => (c.chatid === activeChat.chatid
      ? { ...c, lastPreview: text, lastMessageType: 'text', lastMessageAt: Date.now(), lastFromMe: true, unread: 0 }
      : c)));
    void pollNew(activeChat.chatid, newestTs);
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
    void pollNew(activeChat.chatid, newestTs);
  }

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  // ── Derivados ─────────────────────────────────────────────────────────────
  const visibleChats = useMemo(() => chats.filter(c => {
    if (c.archived) return false;
    if (filter === 'unread') return c.unread > 0;
    if (filter === 'groups') return c.isGroup;
    return true;
  }), [chats, filter]);

  const visibleMessages = useMemo(() => {
    const q = chatSearch.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(m => m.text.toLowerCase().includes(q));
  }, [messages, chatSearch]);

  const unreadTotal = useMemo(() => chats.reduce((n, c) => n + (c.unread > 0 ? 1 : 0), 0), [chats]);

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
    <div data-tour="module-action" className="wa-shell card flex overflow-hidden p-0">
      {/* ── Coluna: conversas ─────────────────────────────────────────────── */}
      <aside className={`wa-side flex w-full flex-col md:w-[340px] lg:w-[400px] xl:w-[420px] ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <header className="flex h-[59px] shrink-0 items-center justify-between px-4">
          <h2 className="text-h3 text-heading">Conversas</h2>
          {unreadTotal > 0 && (
            <span className="wa-badge" title={`${unreadTotal} conversa(s) com mensagem nova`}>{unreadTotal}</span>
          )}
        </header>

        <div className="px-3 pb-2">
          <label className="wa-search">
            <Search className="h-4 w-4 shrink-0 text-faint" aria-hidden />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar conversa"
              aria-label="Pesquisar conversa"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Limpar busca" className="text-faint hover:text-heading">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
          <div className="mt-2 flex gap-1.5" role="tablist" aria-label="Filtro">
            {([['all', 'Todas'], ['unread', 'Não lidas'], ['groups', 'Grupos']] as Array<[Filter, string]>).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className="wa-chip"
                data-active={filter === key}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="wa-list flex-1 overflow-y-auto">
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

          {!chatsLoading && !chatsError && visibleChats.length === 0 && (
            <p className="px-4 py-10 text-center text-caption text-n-600">
              {search ? 'Nenhuma conversa com esse nome.'
                : filter === 'unread' ? 'Nada por ler. 🎉'
                : filter === 'groups' ? 'Nenhum grupo.'
                : 'Nenhuma conversa ainda.'}
            </p>
          )}

          {visibleChats.map(chat => (
            <ChatRow
              key={chat.chatid}
              chat={chat}
              image={chat.image || avatars[chat.chatid] || null}
              active={activeChatId === chat.chatid}
              onClick={() => openChat(chat)}
            />
          ))}
        </div>
      </aside>

      {/* ── Coluna: conversa ──────────────────────────────────────────────── */}
      <section className={`wa-main flex min-w-0 flex-1 flex-col ${activeChat ? 'flex' : 'hidden md:flex'}`}>
        {!activeChat ? (
          <div className="wa-empty flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-2">
              <MessageCircle className="h-8 w-8 text-faint" />
            </span>
            <p className="text-h3 text-heading">WhatsApp no Lume</p>
            <p className="max-w-sm text-body-sm text-n-600">
              Escolha uma conversa à esquerda para ler e responder sem sair do painel.
              As mensagens ficam guardadas aqui por 90 dias, com fotos e áudios.
            </p>
          </div>
        ) : (
          <>
            <header className="wa-header flex h-[59px] shrink-0 items-center gap-2 px-3 md:px-4">
              <button onClick={closeChat} className="icon-chip h-10 w-10 md:hidden" aria-label="Voltar">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Avatar name={activeChat.name} image={activeChat.image || avatars[activeChat.chatid] || null} isGroup={activeChat.isGroup} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold leading-tight text-heading">{activeChat.name}</p>
                <p className="truncate text-caption text-n-600">
                  {activeChat.isGroup ? 'Grupo' : formatPhoneBR(activeChat.phone)}
                </p>
              </div>
              <div className="relative flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => { setChatSearchOpen(v => !v); if (chatSearchOpen) setChatSearch(''); }}
                  className="icon-chip h-10 w-10"
                  aria-label="Pesquisar na conversa"
                  data-accent={chatSearchOpen ? 'true' : undefined}
                >
                  <Search className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => setMenuOpen(v => !v)} className="icon-chip h-10 w-10" aria-label="Mais opções" aria-expanded={menuOpen}>
                  <MoreVertical className="h-5 w-5" />
                </button>
                {menuOpen && (
                  <div className="wa-menu" role="menu">
                    <button type="button" role="menuitem" onClick={markUnread}>
                      <MailOpen className="h-4 w-4" /> Marcar como não lida
                    </button>
                    {!activeChat.isGroup && (
                      <a role="menuitem" href={`/dashboard/clients?q=${encodeURIComponent(activeChat.phone)}`} onClick={() => setMenuOpen(false)}>
                        <UserRound className="h-4 w-4" /> Ver ficha da cliente
                      </a>
                    )}
                    {!activeChat.isGroup && (
                      <a role="menuitem" href={`https://wa.me/${activeChat.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)}>
                        <ExternalLink className="h-4 w-4" /> Abrir no WhatsApp
                      </a>
                    )}
                  </div>
                )}
              </div>
            </header>

            {chatSearchOpen && (
              <div className="wa-chatsearch flex items-center gap-2 px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-faint" />
                <input
                  autoFocus
                  value={chatSearch}
                  onChange={e => setChatSearch(e.target.value)}
                  placeholder="Pesquisar nesta conversa"
                  aria-label="Pesquisar nesta conversa"
                  className="min-w-0 flex-1 bg-transparent text-body-sm text-heading outline-none placeholder:text-faint"
                />
                {chatSearch && <span className="mono-micro text-n-500">{visibleMessages.length}</span>}
                <button type="button" onClick={() => { setChatSearchOpen(false); setChatSearch(''); }} className="icon-chip h-8 w-8" aria-label="Fechar busca">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div ref={scrollRef} onScroll={handleScroll} className="wa-wall flex-1 overflow-y-auto px-3 py-3 md:px-[8%] lg:px-[6%]">
              {/* Topo da conversa: carregar mais / pedir ao celular */}
              {!messagesLoading && messages.length > 0 && (
                <div className="mb-3 flex flex-col items-center gap-2">
                  {loadingOlder && (
                    <span className="wa-pill inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando anteriores…</span>
                  )}
                  {!loadingOlder && hasOlder && (
                    <button type="button" onClick={() => void loadOlder()} className="wa-pill inline-flex items-center gap-1.5 hover:bg-surface-2">
                      <ChevronDown className="h-3.5 w-3.5 rotate-180" /> Mensagens anteriores
                    </button>
                  )}
                  {!loadingOlder && !hasOlder && (
                    <HistoryPrompt state={history} storeReady={storeReady} oldestTs={oldest?.timestamp ?? null} onAsk={() => void askHistory()} />
                  )}
                </div>
              )}

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
                      onClick={() => void loadInitial(activeChat.chatid, 0)}
                      className="mt-1 inline-flex items-center gap-1 text-caption font-bold text-wine-700"
                    >
                      <RefreshCw className="h-3 w-3" /> Tentar de novo
                    </button>
                  </div>
                </div>
              )}
              {!messagesLoading && !messagesError && messages.length === 0 && (
                <p className="py-10 text-center text-caption text-n-600">Nenhuma mensagem nesta conversa.</p>
              )}
              {chatSearch && visibleMessages.length === 0 && messages.length > 0 && (
                <p className="py-10 text-center text-caption text-n-600">Nada encontrado com “{chatSearch}”.</p>
              )}

              {visibleMessages.map((msg, i) => {
                const prev = visibleMessages[i - 1];
                const newDay = !prev || !isSameDay(prev.timestamp, msg.timestamp);
                const first = newDay || !prev || prev.fromMe !== msg.fromMe || prev.senderName !== msg.senderName
                  || msg.timestamp - prev.timestamp > 10 * 60_000;
                return (
                  <React.Fragment key={msg.id}>
                    {newDay && (
                      <div className="flex justify-center py-2.5">
                        <span className="wa-pill">{dayLabel(msg.timestamp)}</span>
                      </div>
                    )}
                    {firstUnreadId === msg.id && (
                      <div className="my-2 flex justify-center">
                        <span className="wa-pill wa-pill-unread">{unreadLabel(activeChat, messages, msg.id)}</span>
                      </div>
                    )}
                    <Bubble
                      msg={msg}
                      first={first}
                      isGroup={activeChat.isGroup}
                      onOpenImage={(src, alt) => setLightbox({ src, alt })}
                    />
                  </React.Fragment>
                );
              })}
            </div>

            <footer className="wa-composer flex items-end gap-1.5 px-2 py-2 md:px-4">
              <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={sending}
                className="icon-chip h-11 w-11 shrink-0 disabled:opacity-50"
                aria-label="Anexar arquivo"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <div className="wa-input flex min-w-0 flex-1 items-end">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={draft}
                  onChange={e => { setDraft(e.target.value); autoGrow(e.currentTarget); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); }
                  }}
                  placeholder="Digite uma mensagem"
                  aria-label="Mensagem"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending || !draft.trim()}
                className="wa-send shrink-0"
                aria-label="Enviar"
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </footer>
          </>
        )}
      </section>

      {lightbox && (
        <div className="wa-lightbox" role="dialog" aria-modal="true" aria-label="Imagem" onClick={() => setLightbox(null)}>
          <button type="button" className="wa-lightbox-close" aria-label="Fechar" onClick={() => setLightbox(null)}>
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox.src} alt={lightbox.alt} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

// ── Peças ───────────────────────────────────────────────────────────────────

function ChatRow({ chat, image, active, onClick }: { chat: InboxChat; image: string | null; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="wa-row" data-active={active} aria-current={active ? 'true' : undefined}>
      <Avatar name={chat.name} image={image} isGroup={chat.isGroup} size={49} />
      <div className="wa-row-body">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-body text-heading">{chat.name}</p>
          {chat.lastMessageAt && (
            <span className={`shrink-0 text-caption ${chat.unread > 0 ? 'wa-time-unread font-semibold' : 'text-n-500'}`}>{shortTime(chat.lastMessageAt)}</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1 text-body-sm text-n-600">
            {chat.lastFromMe && <CheckCheck className="h-4 w-4 shrink-0 text-faint" aria-label="Você respondeu" />}
            <PreviewIcon type={chat.lastMessageType} />
            <span className="truncate">{previewText(chat.lastPreview, chat.lastMessageType)}</span>
          </p>
          {chat.unread > 0 && (
            <span className="wa-badge" aria-label={`${chat.unread} não lidas`}>{chat.unread > 99 ? '99+' : chat.unread}</span>
          )}
        </div>
      </div>
    </button>
  );
}

function Avatar({ name, image, isGroup, size }: { name: string; image: string | null; isGroup: boolean; size: number }) {
  // Guarda QUAL url quebrou: se a foto trocar, tenta de novo sem efeito.
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const broken = !!image && brokenSrc === image;
  const initials = name.replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/).slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '').join('') || '?';
  const style = { width: size, height: size, fontSize: Math.round(size * 0.34) };
  if (image && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt="" style={style} className="shrink-0 rounded-full object-cover" onError={() => setBrokenSrc(image)} loading="lazy" />
    );
  }
  return (
    <span style={style} className="wa-avatar shrink-0">
      {isGroup ? <Users style={{ width: size * 0.45, height: size * 0.45 }} /> : initials}
    </span>
  );
}

function Bubble({ msg, first, isGroup, onOpenImage }: {
  msg: InboxMessage; first: boolean; isGroup: boolean; onOpenImage: (src: string, alt: string) => void;
}) {
  const mine = msg.fromMe;
  const sticker = msg.kind === 'sticker';
  return (
    <div className={`wa-line ${mine ? 'wa-line-out' : 'wa-line-in'} ${first ? 'wa-line-first' : ''}`}>
      <div className={`wa-bubble ${mine ? 'wa-out' : 'wa-in'} ${sticker ? 'wa-sticker' : ''} ${msg.hasMedia && msg.kind !== 'audio' && msg.kind !== 'document' ? 'wa-has-media' : ''}`}>
        {first && !sticker && <Tail mine={mine} />}
        {isGroup && !mine && msg.senderName && first && (
          <p className="wa-sender">{msg.senderName}</p>
        )}

        {msg.hasMedia && <Media msg={msg} onOpenImage={onOpenImage} />}
        {!msg.hasMedia && msg.kind !== 'text' && <NonTextLabel kind={msg.kind} />}

        {/* No documento o texto é o nome do arquivo, que já aparece no cartão. */}
        {msg.text && msg.kind !== 'document' && (
          <span className="wa-text">{linkify(msg.text)}</span>
        )}

        <span className={`wa-meta ${msg.hasMedia && !msg.text && msg.kind !== 'audio' && msg.kind !== 'document' ? 'wa-meta-overlay' : ''}`}>
          <span>{clock(msg.timestamp)}</span>
          {mine && <Status status={msg.status} />}
        </span>
      </div>
    </div>
  );
}

/** Rabinho da bolha, como no WhatsApp: só na primeira mensagem de uma sequência. */
function Tail({ mine }: { mine: boolean }) {
  return (
    <svg viewBox="0 0 8 13" width="8" height="13" className={`wa-tail ${mine ? 'wa-tail-out' : 'wa-tail-in'}`} aria-hidden>
      {mine
        ? <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" />
        : <path d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z" />}
    </svg>
  );
}

function NonTextLabel({ kind }: { kind: InboxKind }) {
  const map: Partial<Record<InboxKind, [React.ElementType, string]>> = {
    location: [MapPin, 'Localização'],
    contact: [Contact, 'Contato'],
    poll: [BarChart3, 'Enquete'],
    call: [Phone, 'Chamada'],
    other: [MessageCircle, 'Mensagem'],
  };
  const [Icon, label] = map[kind] ?? [MessageCircle, 'Mensagem'];
  return (
    <span className="mb-0.5 inline-flex items-center gap-1.5 text-body-sm text-n-600">
      <Icon className="h-4 w-4" /> {label}
    </span>
  );
}

/** Mídia servida pelo proxy do Lume — a URL da uazapi exige token. */
function Media({ msg, onOpenImage }: { msg: InboxMessage; onOpenImage: (src: string, alt: string) => void }) {
  // Momento em que o download falhou — define se vale tentar de novo (até
  // 7 dias a uazapi ainda tem o arquivo) ou se já era.
  const [failedAt, setFailedAt] = useState<number | null>(null);
  const failed = failedAt !== null;
  const [retry, setRetry] = useState(0);
  const params = new URLSearchParams();
  if (msg.uazapiId) params.set('u', msg.uazapiId);
  if (msg.chatid) params.set('c', msg.chatid);
  params.set('k', msg.kind);
  if (retry) params.set('r', String(retry));
  const src = `/api/whatsapp/media/${encodeURIComponent(msg.id)}?${params.toString()}`;
  const expired = failedAt !== null && failedAt - msg.timestamp > 7 * 86_400_000 && !msg.mediaCached;

  if (failed) {
    return (
      <div className="wa-media-missing">
        <ImageIcon className="h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <p className="text-caption font-semibold">{mediaLabel(msg.kind)} indisponível</p>
          <p className="text-caption text-n-600">
            {expired ? 'Tem mais de 7 dias e o WhatsApp não guarda mais o arquivo. Abra no celular.' : 'Não foi possível baixar agora.'}
          </p>
        </div>
        {!expired && (
          <button type="button" onClick={() => { setFailedAt(null); setRetry(r => r + 1); }} className="icon-chip h-8 w-8 shrink-0" aria-label="Tentar de novo">
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  const k = msg.kind;
  if (k === 'image' || k === 'sticker') {
    return (
      <button type="button" className="wa-media-img" onClick={() => onOpenImage(src, msg.text || 'Imagem')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={msg.text || 'Imagem'} loading="lazy" onError={() => setFailedAt(Date.now())} />
      </button>
    );
  }
  if (k === 'video') {
    return <video src={src} controls preload="metadata" className="wa-media-video" onError={() => setFailedAt(Date.now())} />;
  }
  if (k === 'audio') {
    return (
      <div className="wa-media-audio">
        <span className="wa-media-audio-icon"><Mic className="h-4 w-4" /></span>
        <audio src={src} controls preload="metadata" onError={() => setFailedAt(Date.now())} />
      </div>
    );
  }
  return (
    <a href={src} target="_blank" rel="noreferrer" className="wa-media-doc">
      <FileText className="h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{msg.text || 'Documento'}</span>
      <ExternalLink className="h-4 w-4 shrink-0 text-faint" />
    </a>
  );
}

function Status({ status }: { status: InboxMessage['status'] }) {
  switch (status) {
    case 'read':
    case 'played':
      return <CheckCheck className="wa-tick wa-tick-read" aria-label="Lida" />;
    case 'delivered':
      return <CheckCheck className="wa-tick" aria-label="Entregue" />;
    case 'pending':
      return <Clock className="wa-tick wa-tick-clock" aria-label="Enviando" />;
    case 'failed':
      return <AlertTriangle className="wa-tick wa-tick-failed" aria-label="Não enviada" />;
    case 'sent':
    default:
      // Mensagem enviada pelo celular chega sem status — já saiu, então um tique.
      return <Check className="wa-tick" aria-label="Enviada" />;
  }
}

function HistoryPrompt({ state, storeReady, oldestTs, onAsk }: { state: HistoryState; storeReady: boolean; oldestTs: number | null; onAsk: () => void }) {
  if (state === 'asking' || state === 'waiting') {
    return (
      <span className="wa-pill inline-flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pedindo ao celular… deixe o WhatsApp aberto no aparelho
      </span>
    );
  }
  if (state === 'arrived') {
    return <span className="wa-pill">Histórico recebido do celular</span>;
  }
  const since = oldestTs ? ` desde ${new Date(oldestTs).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}` : '';
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="wa-pill inline-flex items-center gap-1.5">
        <History className="h-3.5 w-3.5" /> Início do histórico guardado{since}
      </span>
      {state === 'nothing' && (
        <span className="text-caption text-n-600">O celular não respondeu. Abra o WhatsApp no aparelho e tente de novo.</span>
      )}
      <button type="button" onClick={onAsk} className="wa-pill inline-flex items-center gap-1.5 hover:bg-surface-2">
        <Smartphone className="h-3.5 w-3.5" /> Buscar mensagens mais antigas no celular
      </button>
      {!storeReady && (
        <span className="text-caption text-n-500">Histórico limitado aos últimos 7 dias.</span>
      )}
    </div>
  );
}

// ── Formatação e utilidades ─────────────────────────────────────────────────

/** Junta mensagens novas às atuais, trocando as repetidas e tirando as otimistas já confirmadas. */
function mergeMessages(prev: InboxMessage[], incoming: InboxMessage[]): InboxMessage[] {
  const map = new Map<string, InboxMessage>();
  for (const m of prev) map.set(m.id, m);
  for (const m of incoming) {
    const cur = map.get(m.id);
    // Um recibo nunca rebaixa: lida continua lida mesmo se a uazapi devolver "entregue".
    if (cur && rank(cur.status) > rank(m.status)) map.set(m.id, { ...m, status: cur.status });
    else map.set(m.id, m);
  }
  const real = [...map.values()].filter(m => !m.id.startsWith('local-'));
  const optimistic = [...map.values()].filter(m => m.id.startsWith('local-')).filter(o =>
    !real.some(r => r.fromMe && r.text === o.text && Math.abs(r.timestamp - o.timestamp) < 120_000)
    && Date.now() - o.timestamp < 60_000);
  return [...real, ...optimistic].sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
}

const rank = (s: InboxMessage['status']): number =>
  s === 'played' ? 4 : s === 'read' ? 3 : s === 'delivered' ? 2 : s === 'sent' ? 1 : s === 'pending' ? 0 : -1;

function unreadLabel(chat: InboxChat, messages: InboxMessage[], firstId: string): string {
  const idx = messages.findIndex(m => m.id === firstId);
  const n = idx >= 0 ? messages.slice(idx).filter(m => !m.fromMe).length : chat.unread;
  return n === 1 ? '1 MENSAGEM NÃO LIDA' : `${n} MENSAGENS NÃO LIDAS`;
}

function PreviewIcon({ type }: { type: string | null }) {
  const t = (type ?? '').toLowerCase();
  const cls = 'h-4 w-4 shrink-0 text-faint';
  if (t.includes('image')) return <Camera className={cls} aria-hidden />;
  if (t.includes('video') || t.includes('ptv')) return <Video className={cls} aria-hidden />;
  if (t.includes('audio') || t.includes('ptt')) return <Mic className={cls} aria-hidden />;
  if (t.includes('document')) return <FileText className={cls} aria-hidden />;
  if (t.includes('location')) return <MapPin className={cls} aria-hidden />;
  if (t.includes('contact')) return <Contact className={cls} aria-hidden />;
  return null;
}

function mediaLabel(kind: InboxKind): string {
  return kind === 'image' ? 'Foto' : kind === 'video' ? 'Vídeo' : kind === 'audio' ? 'Áudio' : kind === 'sticker' ? 'Figurinha' : 'Arquivo';
}

/** Prévia da última mensagem quando ela não tem texto. */
function previewText(text: string, type: string | null): string {
  if (text) return text;
  const t = (type ?? '').toLowerCase();
  if (t.includes('image')) return 'Foto';
  if (t.includes('video') || t.includes('ptv')) return 'Vídeo';
  if (t.includes('audio') || t.includes('ptt')) return 'Áudio';
  if (t.includes('document')) return 'Documento';
  if (t.includes('sticker')) return 'Figurinha';
  if (t.includes('location')) return 'Localização';
  if (t.includes('contact')) return 'Contato';
  return 'Mensagem';
}

const isSameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

function dayLabel(ts: number): string {
  const now = Date.now();
  if (isSameDay(ts, now)) return 'HOJE';
  if (isSameDay(ts, now - 86400000)) return 'ONTEM';
  if (now - ts < 6 * 86400000) {
    return new Date(ts).toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase();
  }
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const clock = (ts: number) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function shortTime(ts: number): string {
  const now = Date.now();
  if (isSameDay(ts, now)) return clock(ts);
  if (isSameDay(ts, now - 86400000)) return 'Ontem';
  if (now - ts < 6 * 86400000) return new Date(ts).toLocaleDateString('pt-BR', { weekday: 'long' });
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** Links clicáveis dentro da bolha, sem quebrar o texto em volta. */
function linkify(text: string): React.ReactNode {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  if (parts.length === 1) return text;
  return parts.map((p, i) => /^https?:\/\//.test(p)
    ? <a key={i} href={p} target="_blank" rel="noreferrer" className="underline break-all">{p}</a>
    : <React.Fragment key={i}>{p}</React.Fragment>);
}

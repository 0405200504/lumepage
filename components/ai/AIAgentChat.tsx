'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import type { Message } from 'ai';
import { Sparkles, X, ArrowUp, Mic, Loader2, Plus, History, Trash2, MessageSquare, ChevronLeft, Square, AudioLines } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { VoiceMode } from './VoiceMode';

/** O botão flutuante do celular e a gaveta disparam este evento para abrir o
 *  assistente. Mesmo padrão do OPEN_NAV_EVENT — sem contexto novo só para
 *  ligar componentes que já são irmãos na casca. */
export const OPEN_AI_EVENT = 'lume:open-ai';
/** Abre direto a conversa por voz. */
export const OPEN_VOICE_EVENT = 'lume:open-voice';

// Remove marcações de Markdown que apareceriam como texto cru na resposta
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')   // **negrito**
    .replace(/__(.*?)__/g, '$1')        // __negrito__
    .replace(/\*(.*?)\*/g, '$1')        // *itálico*
    .replace(/`([^`]+)`/g, '$1')        // `código`
    .replace(/^\s*[*+]\s+/gm, '- ')     // listas "* item" -> "- item"
    .replace(/^#{1,6}\s+/gm, '');       // títulos "# "
}

// ----- Histórico de conversas (persistido localmente; o chat não tem backend de histórico) -----
const HISTORY_KEY = 'lume_chat_history';
const MAX_SESSIONS = 10;

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const deriveTitle = (msgs: Message[]): string => {
  const firstUser = msgs.find((m) => m.role === 'user');
  const txt = (firstUser?.content || '').trim().replace(/\s+/g, ' ');
  return txt ? (txt.length > 42 ? `${txt.slice(0, 42)}…` : txt) : 'Nova conversa';
};

const loadSessions = (): ChatSession[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
};

const saveSessions = (sessions: ChatSession[]) => {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS))); } catch {}
};

const relativeTime = (ts: number): string => {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ontem' : `há ${d} dias`;
};

// Sugestões da tela vazia
const QUICK_PROMPTS = [
  'Quais agendamentos eu tenho hoje?',
  'Marcar um horário para amanhã',
  'Cadastrar uma cliente nova',
  'Anotar uma tarefa',
];

const TOOL_LABEL: Record<string, string> = {
  createAppointment: 'Agendamento marcado',
  createClient: 'Cliente cadastrada',
  createTask: 'Tarefa anotada',
  getAppointments: 'Agenda consultada',
};

/**
 * Assistente de IA.
 *
 * O desenho é o de um chat de IA de referência (ChatGPT, Claude): a
 * conversa é o conteúdo. A resposta da assistente é texto corrido, sem
 * balão nem avatar — balão é para o que a PESSOA disse, à direita, num
 * cinza claro. A caixa de digitar é um campo arredondado com enviar e
 * microfone dentro. No celular ocupa a tela inteira, como um app; no
 * computador é a janela ancorada no canto.
 */
export function AIAgentChat() {
  const [isOpen, setIsOpen] = useState(false);
  // Conversa por voz: vive aqui (na casca do painel) para continuar
  // ouvindo quando a assistente troca de tela.
  const [voiceOpen, setVoiceOpen] = useState(false);
  const startVoice = () => { setIsOpen(false); setShowHistory(false); setVoiceOpen(true); };
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentId, setCurrentId] = useState<string>(newId);

  const { messages, input, handleInputChange, handleSubmit, append, isLoading, setMessages, stop } = useChat({
    api: '/api/chat',
    onError: (error) => {
      console.error('Chat error:', error);
      toast.error('Erro na IA', 'Não foi possível conectar ao agente.');
    }
  });

  // Salva/atualiza a conversa atual no histórico sempre que as mensagens
  // mudam. Só grava no storage: a lista em memória é lida na hora em que a
  // tela de conversas abre (openHistory), então nenhum estado muda aqui.
  useEffect(() => {
    if (messages.length === 0) return;
    const updated: ChatSession = { id: currentId, title: deriveTitle(messages), messages, updatedAt: Date.now() };
    const rest = loadSessions().filter((s) => s.id !== currentId);
    saveSessions([updated, ...rest].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_SESSIONS));
  }, [messages, currentId]);

  const openHistory = () => {
    setSessions(loadSessions());
    setShowHistory(true);
  };

  // Inicia uma conversa nova (a atual já fica salva no histórico).
  const startNewChat = () => {
    setMessages([]);
    setCurrentId(newId());
    setShowHistory(false);
  };

  // Abre uma conversa do histórico.
  const openSession = (s: ChatSession) => {
    setCurrentId(s.id);
    setMessages(s.messages);
    setShowHistory(false);
  };

  // Remove uma conversa do histórico.
  const deleteSession = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveSessions(next);
      return next;
    });
    if (id === currentId) startNewChat();
  };

  // Envia uma sugestão da tela vazia.
  const sendPrompt = (text: string) => append({ role: 'user', content: text });

  const toast = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll para a última mensagem (instantâneo — sem animação que engasga no mobile)
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  }, [messages, isTranscribing, isLoading]);

  // A caixa cresce com o texto, até 6 linhas; depois rola por dentro.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input, isOpen]);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Microfone indisponível', 'O navegador não suporta áudio ou a página precisa estar em HTTPS.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioUpload(audioBlob);
        // Libera o microfone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error: unknown) {
      console.error('Error accessing microphone:', error);
      const name = error instanceof Error ? error.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        toast.error('Microfone bloqueado', 'Por favor, clique no ícone de cadeado na barra de endereços e permita o uso do microfone.');
      } else {
        toast.error('Erro no microfone', 'Não foi possível acessar o seu microfone.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioUpload = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Falha na transcrição');
      }

      const data = await res.json();
      if (data.text) {
        // Envia automaticamente o texto transcrito como mensagem do usuário
        append({
          role: 'user',
          content: data.text,
        });
      }
    } catch (error) {
      console.error('Erro ao transcrever:', error);
      toast.error('Erro', 'Não foi possível entender o áudio.');
    } finally {
      setIsTranscribing(false);
    }
  };

  useEffect(() => {
    const abrir = () => setIsOpen(true);
    const abrirVoz = () => { setIsOpen(false); setVoiceOpen(true); };
    window.addEventListener(OPEN_AI_EVENT, abrir);
    window.addEventListener(OPEN_VOICE_EVENT, abrirVoz);
    return () => {
      window.removeEventListener(OPEN_AI_EVENT, abrir);
      window.removeEventListener(OPEN_VOICE_EVENT, abrirVoz);
    };
  }, []);

  // Enter envia; Shift+Enter quebra a linha (o padrão dos chats de IA).
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (input.trim() && !isLoading) handleSubmit();
    }
  };

  const busy = isLoading || isTranscribing;
  const canSend = input.trim().length > 0 && !busy && !isRecording;

  const iconBtn = 'inline-flex items-center justify-center h-10 w-10 rounded-full text-n-600 hover:bg-n-100 hover:text-heading transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700';

  return (
    <>
      {/* Gatilho no desktop: botão discreto ancorado no canto. No celular quem
          abre é o botão flutuante da Início e a gaveta do menu. */}
      {!isOpen && (
        <button
          data-tour="ai-chat"
          onClick={() => setIsOpen(true)}
          className="hidden lg:flex fixed bottom-6 right-6 h-11 items-center gap-2 px-5 bg-surface shadow-[var(--shadow-md)] rounded-full text-body-sm font-semibold text-wine-700 hover:bg-wine-50 transition-ui z-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
          aria-label="Abrir Assistente IA"
        >
          <Sparkles className="h-[18px] w-[18px]" aria-hidden />
          Assistente
        </button>
      )}

      {voiceOpen && (
        <VoiceMode
          onClose={() => setVoiceOpen(false)}
          onSwitchToText={() => { setVoiceOpen(false); setIsOpen(true); }}
        />
      )}

      {/* Janela de Chat */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Assistente IA"
          className="fixed inset-0 lg:inset-auto lg:bottom-6 lg:right-6 lg:w-[420px] lg:h-[680px] lg:max-h-[calc(100vh-3rem)] bg-surface lg:border lg:border-line z-50 flex flex-col lg:rounded-hero lg:shadow-[var(--shadow-lg)] overflow-hidden animate-slide-up"
        >
          {/* Topo: fino e neutro — a conversa é o conteúdo. */}
          <div className="shrink-0 pt-safe border-b border-line">
          {/* A faixa da barra de status (pt-safe) fica fora da linha de 56px:
              somadas no mesmo elemento, o iPhone com o app instalado espremia
              a linha e o fio de baixo cortava os botões. */}
          <div className="flex items-center gap-1 h-14 px-2">
            {showHistory ? (
              <button type="button" onClick={() => setShowHistory(false)} aria-label="Voltar para a conversa" className={iconBtn}>
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : (
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Fechar o assistente" className={iconBtn}>
                <X className="h-5 w-5" />
              </button>
            )}
            <p className="flex-1 text-center text-label font-semibold text-heading truncate">
              {showHistory ? 'Conversas' : 'Assistente'}
            </p>
            <button type="button" onClick={startNewChat} aria-label="Nova conversa" title="Nova conversa" className={iconBtn}>
              <Plus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => (showHistory ? setShowHistory(false) : openHistory())}
              aria-label="Conversas anteriores"
              title="Conversas anteriores"
              aria-pressed={showHistory}
              className={`${iconBtn} ${showHistory ? 'bg-n-100 text-heading' : ''}`}
            >
              <History className="h-5 w-5" />
            </button>
          </div>
          </div>

          {showHistory ? (
            /* ================ CONVERSAS ANTERIORES ================ */
            <div className="flex-1 overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <MessageSquare className="h-8 w-8 text-n-300 mb-3" aria-hidden />
                  <p className="text-label font-semibold text-heading">Nenhuma conversa ainda</p>
                  <p className="text-caption text-n-500 mt-1">As conversas ficam guardadas aqui, neste aparelho.</p>
                </div>
              ) : (
                <ul className="py-2">
                  {sessions.map((session) => {
                    const isActive = session.id === currentId;
                    return (
                      <li key={session.id} className="group flex items-center gap-2 px-3">
                        <button
                          type="button"
                          onClick={() => openSession(session)}
                          className={`flex-1 min-w-0 text-left px-3 py-3 rounded-2xl transition-ui tap ${isActive ? 'bg-n-100' : 'hover:bg-n-50'}`}
                        >
                          <p className="text-label text-heading truncate">{session.title}</p>
                          <p className="text-caption text-n-500 mt-0.5">{relativeTime(session.updatedAt)}</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSession(session.id)}
                          aria-label={`Excluir conversa: ${session.title}`}
                          title="Excluir conversa"
                          className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-full text-n-400 hover:bg-danger-bg hover:text-danger transition-ui lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            /* ================ CONVERSA ================ */
            <div className="flex-1 overflow-y-auto">
              {messages.length === 0 ? (
                /* Tela vazia: um cumprimento e sugestões, nada mais. */
                <div className="min-h-full flex flex-col items-center justify-center px-6 py-10 text-center animate-fade-up">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-wine-50 text-wine-700 mb-5">
                    <Sparkles className="h-6 w-6" aria-hidden />
                  </span>
                  <h2 className="text-h3 text-heading">Como posso ajudar hoje?</h2>
                  <p className="text-body-sm text-n-500 mt-1.5 max-w-xs">
                    Marco horários, cadastro clientes, anoto tarefas e respondo sobre a sua agenda.
                  </p>
                  <button
                    type="button"
                    onClick={startVoice}
                    className="tap mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-wine-700 text-white text-body-sm font-semibold hover:bg-wine-800 transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
                  >
                    <AudioLines className="h-[18px] w-[18px]" aria-hidden /> Conversar por voz
                  </button>
                  <div className="flex flex-wrap justify-center gap-2 mt-5 max-w-sm">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => sendPrompt(prompt)}
                        className="tap px-4 py-2 rounded-full border border-line bg-surface text-body-sm text-n-700 hover:bg-n-50 hover:text-heading transition-ui"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="px-4 lg:px-5 py-5 space-y-5">
                  {messages.map((m) => (
                    m.role === 'user' ? (
                      <div key={m.id} className="flex justify-end">
                        <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-n-100 text-heading px-4 py-2.5 text-body whitespace-pre-wrap break-words">
                          {m.content}
                        </div>
                      </div>
                    ) : (
                      <div key={m.id} className="text-body text-heading leading-relaxed whitespace-pre-wrap break-words">
                        {stripMarkdown(m.content)}

                        {/* Ações que a IA executou no sistema */}
                        {m.toolInvocations?.map((toolInvocation) => {
                          const { toolName, toolCallId, state } = toolInvocation;
                          return state === 'result' ? (
                            <div key={toolCallId} className="mt-2 flex items-center gap-1.5 text-caption font-medium text-success">
                              <span aria-hidden>✓</span> {TOOL_LABEL[toolName] ?? 'Concluído'}
                            </div>
                          ) : (
                            <div key={toolCallId} className="mt-2 flex items-center gap-1.5 text-caption text-n-500">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Fazendo isso no sistema…
                            </div>
                          );
                        })}
                      </div>
                    )
                  ))}

                  {/* Pensando / ouvindo */}
                  {busy && (
                    <div className="flex items-center gap-1.5 h-6" aria-live="polite">
                      {isTranscribing ? (
                        <span className="text-body-sm text-n-500">Ouvindo o áudio…</span>
                      ) : (
                        <>
                          <span className="w-2 h-2 bg-n-400 rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-n-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                          <span className="w-2 h-2 bg-n-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                        </>
                      )}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          )}

          {/* Caixa de digitar (some com a lista de conversas aberta) */}
          {!showHistory && (
            <div className="shrink-0 px-3 pb-3 pt-2 safe-sheet bg-surface">
              <form
                onSubmit={(e) => { e.preventDefault(); if (canSend) handleSubmit(); }}
                className="flex items-end gap-1.5 rounded-[26px] border border-line bg-surface shadow-[var(--shadow-sm)] px-2 py-1.5 focus-within:border-n-400 transition-ui"
              >
                {/* Microfone: segura para falar, solta para enviar */}
                <button
                  type="button"
                  onPointerDown={startRecording}
                  onPointerUp={stopRecording}
                  onPointerLeave={stopRecording}
                  disabled={busy}
                  aria-label={isRecording ? 'Gravando — solte para enviar' : 'Segure para falar'}
                  title="Segure para falar"
                  className={`shrink-0 h-10 w-10 rounded-full inline-flex items-center justify-center transition-ui disabled:opacity-40 ${
                    isRecording ? 'bg-danger text-white animate-pulse' : 'text-n-600 hover:bg-n-100 hover:text-heading'
                  }`}
                >
                  <Mic className="h-5 w-5" />
                </button>

                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={onKeyDown}
                  placeholder={isRecording ? 'Gravando… solte para enviar' : 'Pergunte ou peça algo'}
                  disabled={busy || isRecording}
                  className="flex-1 min-w-0 resize-none bg-transparent py-2.5 text-body text-heading placeholder:text-n-400 focus:outline-none disabled:opacity-60 max-h-40"
                />

                {isLoading ? (
                  <button type="button" onClick={() => stop()} aria-label="Parar a resposta" className="shrink-0 h-10 w-10 rounded-full inline-flex items-center justify-center bg-heading text-surface">
                    <Square className="h-4 w-4 fill-current" />
                  </button>
                ) : input.trim() ? (
                  <button
                    type="submit"
                    disabled={!canSend}
                    aria-label="Enviar"
                    className="shrink-0 h-10 w-10 rounded-full inline-flex items-center justify-center bg-wine-700 text-white transition-ui disabled:bg-n-200 disabled:text-n-400"
                  >
                    <ArrowUp className="h-5 w-5" />
                  </button>
                ) : (
                  /* Sem texto: o botão vira a conversa por voz, como no ChatGPT. */
                  <button
                    type="button"
                    onClick={startVoice}
                    aria-label="Conversar por voz"
                    title="Conversar por voz"
                    className="shrink-0 h-10 w-10 rounded-full inline-flex items-center justify-center bg-wine-700 text-white hover:bg-wine-800 transition-ui"
                  >
                    <AudioLines className="h-5 w-5" />
                  </button>
                )}
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import type { Message } from 'ai';
import { Sparkles, X, Send, Mic, Loader2, User, Plus, History, Trash2, MessageSquare, CheckCircle2, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

/** A barra de abas do celular (item "Mais") dispara este evento para abrir o
 *  assistente. Mesmo padrão do OPEN_NAV_EVENT — sem contexto novo só para
 *  ligar dois componentes que já são irmãos na casca. */
export const OPEN_AI_EVENT = 'lume:open-ai';

// Remove marcações de Markdown que apareceriam como texto cru no balão do chat
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

// Atalhos sugeridos no cartão de boas-vindas
const QUICK_PROMPTS = [
  'Quais agendamentos eu tenho hoje?',
  'Cadastrar um novo cliente',
  'Marcar um horário para amanhã',
  'Anotar uma tarefa',
];

// Funcionalidades listadas na mensagem fixada
const CAPABILITIES = [
  'Tirar dúvidas sobre qualquer área do sistema',
  'Criar clientes em segundos',
  'Agendar horários com linguagem natural',
  'Consultar sua agenda do dia',
  'Anotar tarefas e lembretes',
  'Verificar disponibilidade de horários',
];

export function AIAgentChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentId, setCurrentId] = useState<string>(newId);

  const { messages, input, handleInputChange, handleSubmit, append, isLoading, setMessages } = useChat({
    api: '/api/chat',
    onError: (error) => {
      console.error('Chat error:', error);
      toast.error('Erro na IA', 'Não foi possível conectar ao agente.');
    }
  });

  // Carrega o histórico salvo ao montar.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessions(loadSessions());
  }, []);

  // Salva/atualiza a conversa atual no histórico sempre que as mensagens mudam.
  useEffect(() => {
    if (messages.length === 0) return;
    setSessions((prev) => {
      const updated: ChatSession = { id: currentId, title: deriveTitle(messages), messages, updatedAt: Date.now() };
      const rest = prev.filter((s) => s.id !== currentId);
      const next = [updated, ...rest]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_SESSIONS);
      saveSessions(next);
      return next;
    });
  }, [messages, currentId]);

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

  // Envia um atalho sugerido do cartão de boas-vindas.
  const sendPrompt = (text: string) => append({ role: 'user', content: text });

  const toast = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para a última mensagem (instantâneo — sem animação que engasga no mobile)
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  }, [messages, isTranscribing, isLoading]);

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
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
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
    window.addEventListener(OPEN_AI_EVENT, abrir);
    return () => window.removeEventListener(OPEN_AI_EVENT, abrir);
  }, []);

  return (
    <>
      {/* Gatilho do assistente.
          UM flutuante por tela, e ele é "Novo agendamento" (na Agenda). O
          assistente e o FAB dividiam o mesmo canto inferior direito e, em
          /agenda, /finance e /services, os dois cobriam conteúdo em qualquer
          posição de rolagem — dois círculos de 56px empilhados sobre a coluna
          de valores.
          No desktop ele vira um botão discreto e ancorado no canto; no
          celular ele SAI da tela e é alcançado pelo menu "Mais" da barra de
          abas, junto com o resto da navegação. */}
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

      {/* Janela de Chat */}
      {isOpen && (
        <div className="fixed inset-0 lg:inset-auto lg:bottom-20 lg:right-6 lg:w-[400px] lg:h-[600px] bg-surface border border-line z-50 flex flex-col lg:rounded-hero shadow-lg overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="px-4 py-4 surface-wine text-white flex items-center justify-between shrink-0 shadow-soft">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-label truncate">{showHistory ? 'Suas conversas' : 'Assistente Lume'}</h3>
                <p className="text-caption text-white/70 truncate">{showHistory ? `${sessions.length}/${MAX_SESSIONS} conversas salvas` : 'Online e pronta para ajudar'}</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={startNewChat}
                title="Novo chat"
                aria-label="Novo chat"
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowHistory((v) => !v)}
                title="Histórico de conversas"
                aria-label="Histórico de conversas"
                className={`p-2 rounded-full transition-colors ${showHistory ? 'bg-white/20' : 'hover:bg-white/10'}`}
              >
                <History className="h-5 w-5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Fechar"
                aria-label="Fechar"
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* ================ PAINEL DE HISTÓRICO ================ */}
          {showHistory ? (
            <div className="flex-1 overflow-y-auto bg-n-50">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="h-14 w-14 rounded-full bg-wine-50 flex items-center justify-center mb-4">
                    <MessageSquare className="h-7 w-7 text-wine-300" />
                  </div>
                  <p className="text-label font-semibold text-ink mb-1">Nenhuma conversa ainda</p>
                  <p className="text-caption text-n-600">Suas conversas aparecerão aqui. Inicie um novo chat para começar!</p>
                  <button
                    onClick={startNewChat}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-wine-700 text-white text-label font-semibold rounded-full shadow-soft hover:bg-wine-800 transition-colors tap"
                  >
                    <Plus className="h-4 w-4" />
                    Novo chat
                  </button>
                </div>
              ) : (
                <div className="p-3 space-y-1.5">
                  {/* Botão de novo chat no topo */}
                  <button
                    onClick={startNewChat}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed border-wine-200 text-wine-700 hover:bg-wine-50 transition-colors tap text-label font-semibold"
                  >
                    <Plus className="h-4 w-4" />
                    Iniciar nova conversa
                  </button>

                  {sessions.map((session) => {
                    const isActive = session.id === currentId;
                    const msgCount = session.messages.filter((m) => m.role === 'user').length;
                    return (
                      <div
                        key={session.id}
                        className={`group flex items-center gap-3 px-4 py-3 rounded-2xl transition-ui cursor-pointer tap ${
                          isActive
                            ? 'bg-wine-700 text-white shadow-soft'
                            : 'bg-white border border-n-200 hover:border-wine-200 hover:shadow-xs'
                        }`}
                        onClick={() => openSession(session)}
                      >
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-white/20' : 'bg-wine-50'
                        }`}>
                          <MessageSquare className={`h-4 w-4 ${isActive ? 'text-white' : 'text-wine-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-label font-medium truncate ${isActive ? 'text-white' : 'text-ink'}`}>
                            {session.title}
                          </p>
                          <p className={`text-caption mt-0.5 ${isActive ? 'text-white/60' : 'text-n-600'}`}>
                            {msgCount} msg · {relativeTime(session.updatedAt)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                          title="Excluir conversa"
                          aria-label={`Excluir conversa: ${session.title}`}
                          className={`p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${
                            isActive
                              ? 'hover:bg-white/20 text-white/70 hover:text-white'
                              : 'hover:bg-danger-bg text-n-400 hover:text-danger'
                          }`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ================ ÁREA DE MENSAGENS ================ */
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-n-50">
              {/* Mensagem fixada de boas-vindas (sempre visível quando não há mensagens) */}
              {messages.length === 0 && (
                <div className="animate-fade-up">
                  {/* Cartão principal de boas-vindas */}
                  <div className="bg-white border border-n-200 rounded-2xl shadow-soft overflow-hidden">
                    {/* Topo do cartão com gradiente */}
                    <div className="surface-wine px-5 py-4 text-white">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 bg-white/15 rounded-full flex items-center justify-center backdrop-blur-sm">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-label">Olá! Sou a Lume ✨</h4>
                          <p className="text-caption text-white/70">Sua assistente virtual inteligente</p>
                        </div>
                      </div>
                      <p className="text-caption text-white/90 leading-relaxed">
                        Como sua assistente virtual, estou aqui para facilitar seu uso da plataforma desde o primeiro acesso.
                      </p>
                    </div>

                    {/* Lista de funcionalidades */}
                    <div className="px-5 py-4">
                      <p className="text-caption font-bold text-wine-700 mb-3 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Comigo, você pode:
                      </p>
                      <ul className="space-y-2">
                        {CAPABILITIES.map((cap, i) => (
                          <li key={i} className="flex items-start gap-2 text-caption text-ink/80 leading-snug">
                            <span className="text-wine-400 mt-0.5 shrink-0">•</span>
                            {cap}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Rodapé do cartão */}
                    <div className="px-5 py-3 bg-n-50 border-t border-n-200">
                      <p className="text-caption text-n-600 leading-relaxed">
                        Pode me pedir qualquer coisa em <span className="font-semibold text-ink">linguagem natural</span> — simples como conversar.
                      </p>
                    </div>
                  </div>

                  {/* Atalhos rápidos */}
                  <div className="mt-4">
                    <p className="text-caption font-bold text-n-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 px-1">
                      <Zap className="h-3 w-3" />
                      Comece por aqui
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {QUICK_PROMPTS.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => sendPrompt(prompt)}
                          className="text-left px-3.5 py-2.5 bg-white border border-n-200 rounded-xl text-caption text-ink/80 hover:border-wine-300 hover:bg-wine-50/50 hover:text-wine-700 transition-ui tap shadow-xs"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CTA final */}
                  <p className="text-center text-caption text-n-400 mt-4 font-medium">
                    ✨ Me envie um comando ou me pergunte algo!
                  </p>
                </div>
              )}
              
              {messages.map(m => (
                <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role !== 'user' && (
                    <div className="h-8 w-8 rounded-full surface-wine text-white flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  )}
                  
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-label whitespace-pre-wrap break-words ${
                    m.role === 'user'
                      ? 'bg-wine-700 text-white rounded-br-sm' 
                      : 'bg-white border border-n-200 text-ink rounded-bl-sm shadow-sm'
                  }`}>
                    {m.role === 'user' ? m.content : stripMarkdown(m.content)}

                    {/* Renderização de Tools (quando a IA chama uma função) */}
                    {m.toolInvocations?.map((toolInvocation) => {
                      const { toolName, toolCallId, state } = toolInvocation;
                      if (state === 'result') {
                        return (
                          <div key={toolCallId} className="mt-2 p-2 bg-ok/10 text-ok text-caption font-medium rounded-lg border border-ok/20">
                            ✓ Ação executada: {
                              toolName === 'createAppointment' ? 'Agendamento marcado.' :
                              toolName === 'createClient' ? 'Cliente cadastrada.' :
                              toolName === 'createTask' ? 'Tarefa anotada.' :
                              toolName === 'getAppointments' ? 'Agenda verificada.' : 'Concluído.'
                            }
                          </div>
                        );
                      } else {
                        return (
                          <div key={toolCallId} className="mt-2 p-2 bg-n-100 text-n-500 text-caption font-medium rounded-lg flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Executando ação no sistema...
                          </div>
                        );
                      }
                    })}
                  </div>

                  {m.role === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-n-100 border border-n-200 text-n-500 flex items-center justify-center shrink-0 mt-1">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              
              {/* Status de digitando/transcrevendo */}
              {(isLoading || isTranscribing) && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-full surface-wine text-white flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="bg-white border border-n-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
                    {isTranscribing ? (
                      <span className="text-caption text-n-500 animate-pulse">Ouvindo áudio...</span>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 bg-n-400 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-n-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <div className="w-1.5 h-1.5 bg-n-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </>
                    )}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Área de Input (oculta quando o histórico está aberto) */}
          {!showHistory && (
            <div className="p-4 bg-white border-t border-n-200 shrink-0">
              <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
                <input
                  className="flex-1 bg-n-50 border border-n-200 rounded-full pl-4 pr-12 py-3 text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 transition-ui placeholder:text-n-400 disabled:opacity-50"
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Digite ou mande um áudio..."
                  disabled={isLoading || isTranscribing || isRecording}
                />
                
                {/* Botão de Enviar Texto (aparece se houver texto) */}
                {input.trim() ? (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="absolute right-12 h-10 w-10 rounded-full flex items-center justify-center text-wine-700 hover:bg-wine-50 transition-colors disabled:opacity-50"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                ) : null}

                {/* Botão de Microfone (Pressione para falar) */}
                <button
                  type="button"
                  onPointerDown={startRecording}
                  onPointerUp={stopRecording}
                  onPointerLeave={stopRecording}
                  disabled={isLoading || isTranscribing}
                  className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 transition-ui ${
                    isRecording 
                      ? 'bg-alert text-white scale-110 shadow-glow animate-pulse' 
                      : 'bg-wine-700 text-white hover:scale-105 shadow-soft'
                  } disabled:opacity-50 disabled:hover:scale-100`}
                  title="Pressione e segure para falar"
                >
                  <Mic className="h-5 w-5" />
                </button>
              </form>
              <p className="text-caption text-n-400 text-center mt-2 font-medium">
                {isRecording ? 'Solte para enviar o áudio' : 'Pressione e segure o microfone para falar'}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

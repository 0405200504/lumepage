'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { Sparkles, X, Send, Mic, Loader2, Bot, User } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

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

export function AIAgentChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const { messages, input, handleInputChange, handleSubmit, append, isLoading } = useChat({
    api: '/api/chat',
    onError: (error) => {
      console.error('Chat error:', error);
      toast.error('Erro na IA', 'Não foi possível conectar ao agente.');
    }
  });

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

  return (
    <>
      {/* Botão Flutuante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 lg:bottom-6 lg:right-6 h-14 w-14 bg-wine-700 text-white rounded-full shadow-glow flex items-center justify-center hover:scale-105 transition-transform z-50 tap"
          aria-label="Abrir Assistente IA"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* Janela de Chat */}
      {isOpen && (
        <div className="fixed inset-0 lg:inset-auto lg:bottom-24 lg:right-6 lg:w-[400px] lg:h-[600px] bg-paper z-50 flex flex-col lg:rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="px-5 py-4 surface-wine text-white flex items-center justify-between shrink-0 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Assistente Lume</h3>
                <p className="text-[10px] text-white/70">Online e pronta para ajudar</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Área de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-cream/30">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-xs mt-10">
                <Bot className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>Olá! Sou a sua assistente virtual.</p>
                <p className="mt-1">Posso marcar agendamentos, criar clientes e anotar tarefas pra você.</p>
              </div>
            )}
            
            {messages.map(m => (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role !== 'user' && (
                  <div className="h-8 w-8 rounded-full surface-wine text-white flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="h-4 w-4" />
                  </div>
                )}
                
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                  m.role === 'user'
                    ? 'bg-wine-700 text-white rounded-br-sm' 
                    : 'bg-white border border-gray-150 text-ink rounded-bl-sm shadow-sm'
                }`}>
                  {m.role === 'user' ? m.content : stripMarkdown(m.content)}

                  {/* Renderização de Tools (quando a IA chama uma função) */}
                  {m.toolInvocations?.map((toolInvocation) => {
                    const { toolName, toolCallId, state } = toolInvocation;
                    if (state === 'result') {
                      return (
                        <div key={toolCallId} className="mt-2 p-2 bg-ok/10 text-ok text-[11px] font-medium rounded-lg border border-ok/20">
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
                        <div key={toolCallId} className="mt-2 p-2 bg-gray-100 text-gray-500 text-[11px] font-medium rounded-lg flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Executando ação no sistema...
                        </div>
                      );
                    }
                  })}
                </div>

                {m.role === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-sand border border-gray-150 text-gray-500 flex items-center justify-center shrink-0 mt-1">
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
                <div className="bg-white border border-gray-150 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
                  {isTranscribing ? (
                    <span className="text-xs text-gray-500 animate-pulse">Ouvindo áudio...</span>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Área de Input */}
          <div className="p-4 bg-white border-t border-gray-150 shrink-0">
            <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
              <input
                className="flex-1 bg-cream/50 border border-gray-150 rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-wine-700/20 focus:border-wine-700 transition-all placeholder:text-gray-400 disabled:opacity-50"
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
                className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  isRecording 
                    ? 'bg-alert text-white scale-110 shadow-glow animate-pulse' 
                    : 'bg-wine-700 text-white hover:scale-105 shadow-soft'
                } disabled:opacity-50 disabled:hover:scale-100`}
                title="Pressione e segure para falar"
              >
                <Mic className="h-5 w-5" />
              </button>
            </form>
            <p className="text-[9px] text-gray-400 text-center mt-2 font-medium">
              {isRecording ? 'Solte para enviar o áudio' : 'Pressione e segure o microfone para falar'}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

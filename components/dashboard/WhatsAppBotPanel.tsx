'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  Bot, Wifi, WifiOff, Copy, Check, Settings2, RefreshCw, Zap, ChevronDown, ChevronUp,
  XCircle, CheckCircle2, Loader2, AlertCircle, QrCode as QrCodeIcon, Plus, Trash2,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { WhatsAppSettings, WhatsAppConversation } from '@/types/database';
import {
  saveWhatsAppSettingsAction,
  setupWebhookAction,
  checkWhatsAppStatusAction,
  getWebhookUrlAction,
  diagnoseWhatsAppAction,
  sendTestMessageAction,
  getLastWebhookCallAction,
  simulateIncomingMessageAction,
  getQRCodeAction,
  getConversationsAction,
  toggleBotPauseAction,
} from '@/app/actions/whatsapp';

interface WhatsAppBotPanelProps {
  initialSettings: WhatsAppSettings | null;
}

type ConnectionStatus = 'open' | 'connecting' | 'close' | 'qr' | 'error' | 'not_configured' | 'loading';
type Tab = 'conexao' | 'bot' | 'automacoes' | 'ferramentas';

const statusLabel: Record<ConnectionStatus, { text: string; color: string }> = {
  open:           { text: 'Conectado',         color: 'text-green-600' },
  connecting:     { text: 'Conectando...',      color: 'text-yellow-600' },
  close:          { text: 'Desconectado',       color: 'text-red-500' },
  qr:             { text: 'Aguardando QR Code', color: 'text-yellow-600' },
  error:          { text: 'Erro de conexão',    color: 'text-red-500' },
  not_configured: { text: 'Não configurado',    color: 'text-gray-400' },
  loading:        { text: 'Verificando...',     color: 'text-gray-400' },
};

export function WhatsAppBotPanel({ initialSettings }: WhatsAppBotPanelProps) {
  const { success, error } = useToast();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Tab>('conexao');

  // ── Form state ────────────────────────────────────────────────────────────
  const [uazapiUrl, setUazapiUrl] = useState(initialSettings?.uazapi_url || '');
  const [uazapiToken, setUazapiToken] = useState(initialSettings?.uazapi_token || '');
  const [botEnabled, setBotEnabled] = useState(initialSettings?.bot_enabled ?? false);
  const [confirmationEnabled, setConfirmationEnabled] = useState(initialSettings?.confirmation_enabled ?? true);
  const [botPersona, setBotPersona] = useState(initialSettings?.bot_persona || '');
  const [stopKeyword, setStopKeyword] = useState(initialSettings?.stop_keyword || '#humano');
  const [bookingUrl, setBookingUrl] = useState(initialSettings?.booking_url || '');

  // Automações
  const [autoBookingEnabled, setAutoBookingEnabled] = useState(initialSettings?.automation_booking_enabled ?? false);
  const [autoBookingMessage, setAutoBookingMessage] = useState(
    initialSettings?.automation_booking_message || 'Oi, {nome}! 😊 Seu agendamento de {servico} foi confirmado para {data} às {horario}. Te esperamos!'
  );
  const [autoBookingDelay, setAutoBookingDelay] = useState(initialSettings?.automation_booking_delay_minutes ?? 30);
  const [autoDayBeforeEnabled, setAutoDayBeforeEnabled] = useState(initialSettings?.automation_day_before_enabled ?? false);
  const [autoDayBeforeMessage, setAutoDayBeforeMessage] = useState(
    initialSettings?.automation_day_before_message || 'Olá, {nome}! Lembrete: amanhã você tem {servico} às {horario} com {profissional}. Até lá! 💛'
  );
  const [autoDayBeforeTime, setAutoDayBeforeTime] = useState((initialSettings?.automation_day_before_time || '10:00').substring(0, 5));
  const [autoDayOfEnabled, setAutoDayOfEnabled] = useState(initialSettings?.automation_day_of_enabled ?? false);
  const [autoDayOfMessage, setAutoDayOfMessage] = useState(
    initialSettings?.automation_day_of_message || 'Bom dia, {nome}! 🌸 Hoje é o dia do seu {servico} às {horario}. Te esperamos!'
  );
  const [autoDayOfTime, setAutoDayOfTime] = useState((initialSettings?.automation_day_of_time || '08:00').substring(0, 5));

  // Variáveis personalizadas
  const [varRows, setVarRows] = useState<{ key: string; value: string }[]>(
    Object.entries((initialSettings?.custom_variables as Record<string, string> | null) ?? {})
      .map(([key, value]) => ({ key, value }))
  );

  // ── Connection state ──────────────────────────────────────────────────────
  const [status, setStatus] = useState<ConnectionStatus>('loading');
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ── Tools state ───────────────────────────────────────────────────────────
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagResult, setDiagResult] = useState<Awaited<ReturnType<typeof diagnoseWhatsAppAction>> | null>(null);
  const [lastWebhookAt, setLastWebhookAt] = useState<number | null>(null);
  const [lastWebhookPayload, setLastWebhookPayload] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [simPhone, setSimPhone] = useState('');
  const [simResult, setSimResult] = useState<string | null>(null);

  // ── Conversations ─────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(false);
  const [convsOpen, setConvsOpen] = useState(false);

  // ── QR Modal ──────────────────────────────────────────────────────────────
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrRaw, setQrRaw] = useState<string | null>(null);
  const [qrPaircode, setQrPaircode] = useState<string | null>(null);
  const [qrAsyncImgSrc, setQrAsyncImgSrc] = useState<string | null>(null);
  const [qrConnected, setQrConnected] = useState(false);

  useEffect(() => {
    checkWhatsAppStatusAction()
      .then(r => {
        const val = r.status as string;
        setStatus((val in statusLabel ? val : 'error') as ConnectionStatus);
      })
      .catch(() => setStatus('error'));
    getWebhookUrlAction()
      .then(r => setWebhookUrl(r.webhookUrl || null))
      .catch(() => {});
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function handleCopy() {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function buildPayload() {
    const customVars = Object.fromEntries(
      varRows.filter(r => r.key.trim()).map(r => [r.key.trim(), r.value])
    );
    return {
      uazapi_url: uazapiUrl,
      uazapi_token: uazapiToken,
      bot_enabled: botEnabled,
      confirmation_enabled: confirmationEnabled,
      bot_persona: botPersona,
      stop_keyword: stopKeyword,
      booking_url: bookingUrl,
      automation_booking_enabled: autoBookingEnabled,
      automation_booking_message: autoBookingMessage,
      automation_booking_delay_minutes: autoBookingDelay,
      automation_day_before_enabled: autoDayBeforeEnabled,
      automation_day_before_message: autoDayBeforeMessage,
      automation_day_before_time: autoDayBeforeTime,
      automation_day_of_enabled: autoDayOfEnabled,
      automation_day_of_message: autoDayOfMessage,
      automation_day_of_time: autoDayOfTime,
      custom_variables: customVars,
    };
  }

  function handleSave(e?: React.FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    startTransition(async () => {
      const res = await saveWhatsAppSettingsAction(buildPayload());
      if (res.success) {
        success('Salvo!', 'Configurações atualizadas.');
        getWebhookUrlAction().then(r => setWebhookUrl(r.webhookUrl || null)).catch(() => {});
      } else {
        error('Erro ao salvar', res.error || 'Tente novamente.');
      }
    });
  }

  function handleSetupWebhook() {
    startTransition(async () => {
      const saveRes = await saveWhatsAppSettingsAction(buildPayload());
      if (!saveRes.success) {
        error('Erro ao salvar credenciais', saveRes.error || 'Tente novamente.');
        return;
      }
      const res = await setupWebhookAction();
      if (res.success) {
        success('Webhook ativado!', res.debug ?? 'A uazapi vai enviar mensagens para o Lume automaticamente.');
        if (res.webhookUrl) setWebhookUrl(res.webhookUrl);
        checkWhatsAppStatusAction().then(r => {
          const val = r.status as string;
          setStatus((val in statusLabel ? val : 'error') as ConnectionStatus);
        }).catch(() => {});
      } else {
        error('Erro ao ativar webhook', res.error || 'Verifique a URL e o token.');
      }
    });
  }

  function handleRefreshStatus() {
    setStatus('loading');
    checkWhatsAppStatusAction()
      .then(r => {
        const val = r.status as string;
        setStatus((val in statusLabel ? val : 'error') as ConnectionStatus);
      })
      .catch(() => setStatus('error'));
  }

  const handleOpenQrModal = useCallback(async () => {
    setQrModalOpen(true);
    setQrLoading(true);
    setQrError(null);
    setQrRaw(null);
    setQrPaircode(null);
    setQrAsyncImgSrc(null);
    setQrConnected(false);

    const res = await getQRCodeAction();
    setQrLoading(false);

    if (!res.success) { setQrError(res.error || 'Erro ao gerar QR Code.'); return; }
    if (res.alreadyConnected) { setQrConnected(true); setStatus('open'); return; }
    if (res.qrcode) { setQrRaw(res.qrcode); return; }
    if (res.paircode) { setQrPaircode(res.paircode); return; }
    setQrError('A uazapi não retornou QR Code nem código de pareamento.');
  }, []);

  const qrDirectImgSrc = !qrRaw ? null
    : qrRaw.startsWith('data:image') ? qrRaw
    : /^(iVBORw0KG|\/9j\/)/.test(qrRaw) ? `data:image/png;base64,${qrRaw}`
    : null;

  useEffect(() => {
    if (!qrRaw || qrDirectImgSrc) return;
    QRCode.toDataURL(qrRaw, { width: 280, margin: 1 })
      .then(setQrAsyncImgSrc)
      .catch(() => setQrError('Não foi possível renderizar o QR Code recebido.'));
  }, [qrRaw, qrDirectImgSrc]);

  const qrImgSrc = qrDirectImgSrc ?? qrAsyncImgSrc;

  useEffect(() => {
    if (!qrModalOpen || qrConnected || qrLoading) return;
    const interval = setInterval(async () => {
      const r = await checkWhatsAppStatusAction().catch(() => null);
      if (r?.status === 'open') {
        setQrConnected(true);
        setStatus('open');
        success('Conectado!', 'O WhatsApp foi conectado com sucesso.');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [qrModalOpen, qrConnected, qrLoading, success]);

  async function handleTestMessage() {
    setTestResult(null);
    startTransition(async () => {
      const res = await sendTestMessageAction(testPhone);
      if (res.success) {
        setTestResult('✅ Mensagem enviada! Se chegou no WhatsApp, o envio está funcionando.');
      } else {
        setTestResult(`❌ Falha: ${res.error}`);
      }
    });
  }

  async function handleSimulate() {
    setSimResult('Simulando... (pode demorar até 15s)');
    startTransition(async () => {
      const res = await simulateIncomingMessageAction(simPhone);
      if (res.success) {
        setSimResult('✅ Bot processou! Se o número recebeu resposta, o bot está funcionando.');
      } else {
        setSimResult(`❌ Falha: ${'error' in res ? res.error : `HTTP ${res.status}`}`);
      }
    });
  }

  async function handleLoadConversations() {
    setConvsOpen(v => {
      if (!v) {
        setConvsLoading(true);
        getConversationsAction().then(data => {
          setConversations(data);
          setConvsLoading(false);
        }).catch(() => setConvsLoading(false));
      }
      return !v;
    });
  }

  async function handleTogglePause(clientPhone: string, paused: boolean) {
    await toggleBotPauseAction(clientPhone, paused);
    setConversations(prev => prev.map(c =>
      c.client_phone === clientPhone ? { ...c, bot_paused: paused } : c
    ));
  }

  async function handleDiagnose() {
    setDiagnosing(true);
    setDiagResult(null);
    const [result, lastCall] = await Promise.all([
      diagnoseWhatsAppAction().catch(() => ({ ok: false, steps: [], error: 'Erro ao verificar' })),
      getLastWebhookCallAction().catch(() => ({ receivedAt: null, payload: null })),
    ]);
    setDiagResult(result);
    setLastWebhookAt(lastCall.receivedAt ?? null);
    setLastWebhookPayload(lastCall.payload ?? null);
    setDiagnosing(false);
  }

  function addVarRow() {
    setVarRows(prev => [...prev, { key: '', value: '' }]);
  }

  function updateVarRow(index: number, field: 'key' | 'value', val: string) {
    setVarRows(prev => prev.map((r, i) =>
      i === index ? { ...r, [field]: field === 'key' ? val.replace(/[^a-z0-9_]/g, '').toLowerCase() : val } : r
    ));
  }

  function removeVarRow(index: number) {
    setVarRows(prev => prev.filter((_, i) => i !== index));
  }

  const s = statusLabel[status] ?? statusLabel['error'];
  const isConfigured = !!(uazapiUrl && uazapiToken);
  const activeAutomations = [autoBookingEnabled, autoDayBeforeEnabled, autoDayOfEnabled].filter(Boolean).length;
  const builtinVars = ['nome', 'servico', 'data', 'horario', 'profissional', 'preco', 'forma_pagamento'];
  const customVarNames = varRows.filter(r => r.key.trim()).map(r => r.key.trim());

  return (
    <div className="bg-white border border-[#efe9e6] rounded-3xl p-6 md:p-8 space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
            <Bot className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-800 tracking-tight">Bot WhatsApp com IA</h2>
            <p className="text-xs text-gray-500">Responde clientes e envia confirmações automaticamente</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefreshStatus}
          className="flex items-center gap-1.5 text-xs font-medium hover:opacity-70 transition-opacity"
        >
          {status === 'open'
            ? <Wifi className="w-4 h-4 text-green-600" />
            : <WifiOff className="w-4 h-4 text-gray-400" />
          }
          <span className={s.color}>{s.text}</span>
          <RefreshCw className="w-3 h-3 text-gray-400" />
        </button>
      </div>

      {/* Banner de desconexão */}
      {isConfigured && (status === 'close' || status === 'qr' || status === 'error') && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs font-medium text-red-700">WhatsApp desconectado — clientes não recebem respostas do bot.</p>
          </div>
          <button
            type="button"
            onClick={handleOpenQrModal}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
          >
            Reconectar
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#faf8f7] rounded-2xl p-1">
        {(
          [
            { id: 'conexao' as Tab, label: 'Conexão', badge: null },
            { id: 'bot' as Tab, label: 'Bot IA', badge: null },
            { id: 'automacoes' as Tab, label: 'Automações', badge: activeAutomations > 0 ? activeAutomations : null },
            { id: 'ferramentas' as Tab, label: 'Ferramentas', badge: null },
          ]
        ).map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-semibold rounded-xl transition-colors ${
              activeTab === tab.id ? 'bg-white text-[#500b18] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.badge !== null && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: Conexão ──────────────────────────────────────────────────── */}
      {activeTab === 'conexao' && (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Credenciais uazapi
            </label>
            <input
              type="url"
              placeholder="URL da instância (ex: https://meubot.uazapi.com)"
              value={uazapiUrl}
              onChange={e => setUazapiUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#efe9e6] text-sm focus:outline-none focus:ring-2 focus:ring-[#500b18]/20 bg-[#faf8f7]"
            />
            <input
              type="password"
              placeholder="Token da instância"
              value={uazapiToken}
              onChange={e => setUazapiToken(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#efe9e6] text-sm focus:outline-none focus:ring-2 focus:ring-[#500b18]/20 bg-[#faf8f7]"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 rounded-xl bg-[#500b18] text-white text-sm font-semibold hover:bg-[#3d0812] transition-colors disabled:opacity-50"
          >
            {isPending ? 'Salvando...' : 'Salvar credenciais'}
          </button>

          {isConfigured && (
            <div className="space-y-3 pt-2 border-t border-[#efe9e6]">
              <p className="text-xs font-semibold text-gray-700">Conectar ao WhatsApp</p>
              <p className="text-xs text-gray-500">
                Use o botão automático primeiro. Se não funcionar, copie a URL e cole manualmente no painel da uazapi em &ldquo;Webhook&rdquo;.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleOpenQrModal}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-[#500b18] text-[#500b18] text-sm font-semibold hover:bg-[#500b18]/5 transition-colors"
                >
                  <QrCodeIcon className="w-4 h-4" />
                  QR Code
                </button>
                <button
                  type="button"
                  onClick={handleSetupWebhook}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  Ativar webhook
                </button>
              </div>

              {webhookUrl && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-600">URL do webhook (cole no painel da uazapi):</p>
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <p className="text-xs text-gray-700 font-mono truncate flex-1">{webhookUrl}</p>
                    <button type="button" onClick={handleCopy} className="shrink-0 text-gray-400 hover:text-gray-700 transition-colors">
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-amber-700">
                    No painel uazapi: <strong>Webhook</strong> → cole a URL → marque eventos <strong>message</strong> → salve e ative.
                  </p>
                </div>
              )}
            </div>
          )}
        </form>
      )}

      {/* ── TAB: Bot IA ───────────────────────────────────────────────────── */}
      {activeTab === 'bot' && (
        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Funções ativas
            </label>
            <Toggle
              label="Responder clientes automaticamente (bot com IA)"
              description="O Gemini responde mensagens das clientes com o link de agendamento e informações dos serviços"
              checked={botEnabled}
              onChange={setBotEnabled}
            />
            <Toggle
              label="Enviar confirmação após agendamento"
              description="A cliente recebe uma mensagem assim que o agendamento é criado"
              checked={confirmationEnabled}
              onChange={setConfirmationEnabled}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Treinar a IA
            </label>
            <p className="text-xs text-gray-500">
              Explique como a IA deve se comportar: tom de voz, o que pode ou não pode prometer, como tratar dúvidas sobre preço, dor, prazos etc. Quanto mais detalhado, melhor a resposta.
            </p>
            <textarea
              rows={6}
              placeholder={`Ex: Fale sempre num tom acolhedor e descontraído, como uma amiga.\nNunca invente preço ou prazo — se não souber, diga que vai confirmar.\nSe perguntarem sobre dor, tranquilize e diga que a profissional explica tudo no dia.`}
              value={botPersona}
              onChange={e => setBotPersona(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#efe9e6] text-sm focus:outline-none focus:ring-2 focus:ring-[#500b18]/20 bg-[#faf8f7] resize-none"
            />
            <p className="text-xs text-gray-400 text-right">{botPersona.length} caracteres</p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Link de agendamento
            </label>
            <input
              type="url"
              placeholder="https://seusite.vercel.app/"
              value={bookingUrl}
              onChange={e => setBookingUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#efe9e6] text-sm focus:outline-none focus:ring-2 focus:ring-[#500b18]/20 bg-[#faf8f7]"
            />
            <p className="text-xs text-gray-400">O bot envia este link quando a cliente quer agendar.</p>
          </div>

          <div className="border border-[#efe9e6] rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-[#faf8f7] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-gray-400" />
                Configurações avançadas
              </div>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAdvanced && (
              <div className="px-4 pb-4 space-y-3 border-t border-[#efe9e6] pt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Palavra-chave para chamar atendimento humano
                  </label>
                  <input
                    type="text"
                    placeholder="#humano"
                    value={stopKeyword}
                    onChange={e => setStopKeyword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#efe9e6] text-sm focus:outline-none focus:ring-2 focus:ring-[#500b18]/20 bg-[#faf8f7]"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Quando a cliente digitar essa palavra, o bot para e você assume a conversa.
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 rounded-xl bg-[#500b18] text-white text-sm font-semibold hover:bg-[#3d0812] transition-colors disabled:opacity-50"
          >
            {isPending ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </form>
      )}

      {/* ── TAB: Automações ───────────────────────────────────────────────── */}
      {activeTab === 'automacoes' && (
        <div className="space-y-6">
          {/* Variáveis personalizadas */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Variáveis personalizadas
              </label>
              <p className="text-xs text-gray-500">
                Crie variáveis com informações do seu estúdio para usar em qualquer mensagem abaixo, como{' '}
                <code className="bg-gray-100 px-1 rounded text-gray-700">{'{endereco}'}</code> ou{' '}
                <code className="bg-gray-100 px-1 rounded text-gray-700">{'{instagram}'}</code>.
              </p>
            </div>

            {varRows.length > 0 && (
              <div className="space-y-2">
                {varRows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="relative w-36 shrink-0">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono select-none">{'{'}</span>
                      <input
                        type="text"
                        placeholder="nome_var"
                        value={row.key}
                        onChange={e => updateVarRow(i, 'key', e.target.value)}
                        className="w-full pl-5 pr-5 py-2 rounded-xl border border-[#efe9e6] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#500b18]/20 bg-[#faf8f7]"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono select-none">{'}'}</span>
                    </div>
                    <span className="text-gray-400 text-xs shrink-0">→</span>
                    <input
                      type="text"
                      placeholder="Valor que aparece na mensagem"
                      value={row.value}
                      onChange={e => updateVarRow(i, 'value', e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-[#efe9e6] text-sm focus:outline-none focus:ring-2 focus:ring-[#500b18]/20 bg-[#faf8f7]"
                    />
                    <button
                      type="button"
                      onClick={() => removeVarRow(i)}
                      className="shrink-0 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addVarRow}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#500b18] hover:opacity-70 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar variável
            </button>

            {/* Chips de todas as variáveis disponíveis */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Variáveis disponíveis nas mensagens:</p>
              <div className="flex flex-wrap gap-1.5">
                {builtinVars.map(v => (
                  <span key={v} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {`{${v}}`}
                  </span>
                ))}
                {customVarNames.map(v => (
                  <span key={v} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#500b18]/10 text-[#500b18]">
                    {`{${v}}`}
                  </span>
                ))}
              </div>
              {customVarNames.length > 0 && (
                <p className="text-[10px] text-gray-400">Cinza = padrão do sistema · Vinho = suas variáveis</p>
              )}
            </div>
          </div>

          {/* Automações */}
          <div className="space-y-3 border-t border-[#efe9e6] pt-4">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Mensagens automáticas</p>

            <AutomationCard
              icon="✅"
              title="Confirmação de agendamento"
              description="Enviada logo após a cliente agendar"
              enabled={autoBookingEnabled}
              onToggle={setAutoBookingEnabled}
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mensagem</label>
                  <textarea rows={3} value={autoBookingMessage} onChange={e => setAutoBookingMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#efe9e6] text-sm focus:outline-none focus:ring-2 focus:ring-[#500b18]/20 bg-white resize-none" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-xs font-medium text-gray-600 shrink-0">Enviar após</label>
                  <input type="number" min={0} max={3600} value={autoBookingDelay}
                    onChange={e => setAutoBookingDelay(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 px-2 py-1.5 rounded-xl border border-[#efe9e6] text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#500b18]/20 bg-white" />
                  <span className="text-xs text-gray-400">
                    {autoBookingDelay === 0 ? 'segundos — envio instantâneo ⚡' : 'segundo(s) do agendamento'}
                  </span>
                </div>
              </div>
            </AutomationCard>

            <AutomationCard
              icon="🔔"
              title="Lembrete — dia anterior"
              description="Enviada no dia anterior ao agendamento"
              enabled={autoDayBeforeEnabled}
              onToggle={setAutoDayBeforeEnabled}
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mensagem</label>
                  <textarea rows={3} value={autoDayBeforeMessage} onChange={e => setAutoDayBeforeMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#efe9e6] text-sm focus:outline-none focus:ring-2 focus:ring-[#500b18]/20 bg-white resize-none" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 shrink-0">Horário de envio</label>
                  <input type="time" value={autoDayBeforeTime} onChange={e => setAutoDayBeforeTime(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-[#efe9e6] text-sm focus:outline-none focus:ring-2 focus:ring-[#500b18]/20 bg-white" />
                </div>
              </div>
            </AutomationCard>

            <AutomationCard
              icon="☀️"
              title="Lembrete — no dia"
              description="Enviada pela manhã no dia do agendamento"
              enabled={autoDayOfEnabled}
              onToggle={setAutoDayOfEnabled}
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mensagem</label>
                  <textarea rows={3} value={autoDayOfMessage} onChange={e => setAutoDayOfMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#efe9e6] text-sm focus:outline-none focus:ring-2 focus:ring-[#500b18]/20 bg-white resize-none" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 shrink-0">Horário de envio</label>
                  <input type="time" value={autoDayOfTime} onChange={e => setAutoDayOfTime(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-[#efe9e6] text-sm focus:outline-none focus:ring-2 focus:ring-[#500b18]/20 bg-white" />
                </div>
              </div>
            </AutomationCard>
          </div>

          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSave()}
            className="w-full py-2.5 rounded-xl bg-[#500b18] text-white text-sm font-semibold hover:bg-[#3d0812] transition-colors disabled:opacity-50"
          >
            {isPending ? 'Salvando...' : 'Salvar automações'}
          </button>
        </div>
      )}

      {/* ── TAB: Ferramentas ─────────────────────────────────────────────── */}
      {activeTab === 'ferramentas' && (
        <div className="space-y-5">
          {/* Testar envio */}
          {isConfigured && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-800">Testar envio de mensagem</p>
              <p className="text-xs text-gray-500">Confirma que as credenciais estão funcionando.</p>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="5511999999999"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-[#efe9e6] text-sm focus:outline-none focus:ring-2 focus:ring-[#500b18]/20 bg-[#faf8f7]"
                />
                <button
                  type="button"
                  onClick={handleTestMessage}
                  disabled={isPending || !testPhone}
                  className="shrink-0 px-4 py-2 rounded-xl bg-[#500b18] text-white text-sm font-semibold hover:bg-[#3d0812] transition-colors disabled:opacity-50"
                >
                  Enviar teste
                </button>
              </div>
              {testResult && (
                <p className={`text-xs font-medium ${testResult.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
                  {testResult}
                </p>
              )}
            </div>
          )}

          {/* Simular mensagem */}
          {isConfigured && (
            <div className="space-y-2 border-t border-[#efe9e6] pt-4">
              <p className="text-sm font-semibold text-gray-800">Simular mensagem recebida</p>
              <p className="text-xs text-gray-500">
                Testa o pipeline completo do bot sem precisar da uazapi. Se o número receber resposta, o bot está OK.
              </p>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="5511999999999 (recebe a resposta)"
                  value={simPhone}
                  onChange={e => setSimPhone(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-[#efe9e6] text-sm focus:outline-none focus:ring-2 focus:ring-[#500b18]/20 bg-[#faf8f7]"
                />
                <button
                  type="button"
                  onClick={handleSimulate}
                  disabled={isPending || !simPhone}
                  className="shrink-0 px-4 py-2 rounded-xl bg-[#500b18] text-white text-sm font-semibold hover:bg-[#3d0812] transition-colors disabled:opacity-50"
                >
                  Simular
                </button>
              </div>
              {simResult && (
                <p className={`text-xs font-medium ${simResult.startsWith('✅') ? 'text-green-600' : simResult.startsWith('❌') ? 'text-red-500' : 'text-gray-500'}`}>
                  {simResult}
                </p>
              )}
            </div>
          )}

          {/* Diagnóstico */}
          <div className="border-t border-[#efe9e6] pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800">Verificar configuração</p>
              <button
                type="button"
                onClick={handleDiagnose}
                disabled={diagnosing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#efe9e6] text-xs font-semibold text-gray-600 hover:bg-[#faf8f7] transition-colors disabled:opacity-50"
              >
                {diagnosing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {diagnosing ? 'Verificando...' : 'Verificar agora'}
              </button>
            </div>

            {diagResult && (
              <div className="space-y-1.5">
                {'error' in diagResult && diagResult.error && (
                  <p className="text-xs text-red-500">{diagResult.error}</p>
                )}
                {diagResult.steps?.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {step.ok && !step.warn
                      ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      : step.warn
                        ? <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                        : <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    }
                    <div>
                      <span className="font-medium text-gray-700">{step.label}: </span>
                      <span className={step.ok && !step.warn ? 'text-gray-500' : step.warn ? 'text-yellow-600' : 'text-red-500'}>
                        {step.detail}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-2 text-xs mt-1 pt-1.5 border-t border-[#efe9e6]">
                  {lastWebhookAt
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    : <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                  }
                  <div>
                    <span className="font-medium text-gray-700">uazapi chamou nosso bot: </span>
                    {lastWebhookAt ? (
                      <span className="text-gray-500">
                        Sim — {(() => {
                          const diff = Math.round((Date.now() - lastWebhookAt) / 1000);
                          if (diff < 60) return `${diff}s atrás`;
                          if (diff < 3600) return `${Math.round(diff / 60)}min atrás`;
                          return new Date(lastWebhookAt).toLocaleTimeString('pt-BR');
                        })()}
                        {lastWebhookPayload && (
                          <span className="text-gray-400 ml-1">({lastWebhookPayload.slice(0, 80)})</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-yellow-600">
                        Nenhum evento recebido — mande uma mensagem e clique em &quot;Verificar agora&quot;
                      </span>
                    )}
                  </div>
                </div>
                {diagResult.ok && (
                  <p className="text-xs text-green-600 font-medium mt-2">Tudo configurado! O bot está pronto para responder.</p>
                )}
              </div>
            )}
          </div>

          {/* Conversas */}
          {isConfigured && (
            <div className="border-t border-[#efe9e6] pt-4">
              <button
                type="button"
                onClick={handleLoadConversations}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-800 hover:opacity-70 transition-opacity"
              >
                Conversas
                {convsOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {convsOpen && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-500">
                    Assuma a conversa para atender manualmente. O bot para de responder aquela cliente.
                  </p>
                  {convsLoading && (
                    <div className="flex items-center gap-2 py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="text-xs text-gray-400">Carregando conversas...</span>
                    </div>
                  )}
                  {!convsLoading && conversations.length === 0 && (
                    <p className="text-xs text-gray-400 py-2">Nenhuma conversa ainda.</p>
                  )}
                  {!convsLoading && conversations.map(conv => {
                    const lastMsg = conv.messages.at(-1);
                    const label = conv.client_summary?.split('.')[0] || formatPhone(conv.client_phone);
                    return (
                      <div key={conv.client_phone} className="flex items-center justify-between gap-3 bg-[#faf8f7] rounded-2xl px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{label}</p>
                          {lastMsg && (
                            <p className="text-xs text-gray-400 truncate">{lastMsg.content.slice(0, 60)}</p>
                          )}
                        </div>
                        {conv.bot_paused ? (
                          <button
                            type="button"
                            onClick={() => handleTogglePause(conv.client_phone, false)}
                            className="shrink-0 px-3 py-1.5 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors"
                          >
                            Retomar bot
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTogglePause(conv.client_phone, true)}
                            className="shrink-0 px-3 py-1.5 rounded-xl border border-[#500b18] text-[#500b18] text-xs font-semibold hover:bg-[#500b18]/5 transition-colors"
                          >
                            Assumir conversa
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de QR Code */}
      {qrModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-800">Conectar WhatsApp</p>
              <button type="button" onClick={() => setQrModalOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {qrLoading && (
              <div className="flex flex-col items-center gap-2 py-10">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <p className="text-xs text-gray-500">Gerando QR Code...</p>
              </div>
            )}

            {qrError && !qrLoading && (
              <div className="space-y-3 py-2">
                <p className="text-xs text-red-500">{qrError}</p>
                <button type="button" onClick={handleOpenQrModal} className="text-xs font-semibold text-[#500b18] underline">
                  Tentar novamente
                </button>
              </div>
            )}

            {qrConnected && !qrLoading && (
              <div className="flex flex-col items-center gap-2 py-10">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
                <p className="text-sm font-semibold text-gray-800">WhatsApp conectado!</p>
              </div>
            )}

            {qrImgSrc && !qrConnected && !qrLoading && (
              <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImgSrc} alt="QR Code do WhatsApp" className="w-64 h-64 rounded-xl border border-[#efe9e6]" />
                <p className="text-xs text-gray-500 text-center">
                  No celular: WhatsApp → Mais opções (⋮) → Aparelhos conectados → Conectar um aparelho → aponte a câmera para este código.
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Aguardando leitura...
                </p>
              </div>
            )}

            {qrPaircode && !qrConnected && !qrLoading && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-2xl font-mono font-bold tracking-widest text-[#500b18] bg-[#faf8f7] border border-[#efe9e6] rounded-xl px-4 py-3">
                  {qrPaircode}
                </p>
                <p className="text-xs text-gray-500 text-center">
                  No celular: WhatsApp → Mais opções (⋮) → Aparelhos conectados → Conectar com número de telefone → digite este código.
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Aguardando confirmação...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  return phone;
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="relative mt-0.5 shrink-0">
        <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-[#500b18]' : 'bg-gray-200'}`} />
        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </label>
  );
}

function AutomationCard({
  icon,
  title,
  description,
  enabled,
  onToggle,
  children,
}: {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[#efe9e6] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-[#faf8f7]">
        <div>
          <p className="text-sm font-semibold text-gray-800">{icon} {title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input type="checkbox" className="sr-only" checked={enabled} onChange={e => onToggle(e.target.checked)} />
          <div className={`w-10 h-6 rounded-full transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-200'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
        </label>
      </div>
      {enabled && (
        <div className="px-4 py-3 space-y-3 border-t border-[#efe9e6]">
          {children}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  Bot, Wifi, WifiOff, Copy, Check, Settings2, RefreshCw, Zap, ChevronDown, ChevronUp,
  XCircle, CheckCircle2, Loader2, AlertCircle, QrCode as QrCodeIcon,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { WhatsAppSettings } from '@/types/database';
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
import { WhatsAppConversation } from '@/types/database';

interface WhatsAppBotPanelProps {
  initialSettings: WhatsAppSettings | null;
}

type ConnectionStatus = 'open' | 'connecting' | 'close' | 'qr' | 'error' | 'not_configured' | 'loading';

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

  const [uazapiUrl, setUazapiUrl] = useState(initialSettings?.uazapi_url || '');
  const [uazapiToken, setUazapiToken] = useState(initialSettings?.uazapi_token || '');
  const [botEnabled, setBotEnabled] = useState(initialSettings?.bot_enabled ?? false);
  const [confirmationEnabled, setConfirmationEnabled] = useState(initialSettings?.confirmation_enabled ?? true);
  const [botPersona, setBotPersona] = useState(initialSettings?.bot_persona || '');
  const [stopKeyword, setStopKeyword] = useState(initialSettings?.stop_keyword || '#humano');
  const [bookingUrl, setBookingUrl] = useState(initialSettings?.booking_url || '');

  const [status, setStatus] = useState<ConnectionStatus>('loading');
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagResult, setDiagResult] = useState<Awaited<ReturnType<typeof diagnoseWhatsAppAction>> | null>(null);
  const [lastWebhookAt, setLastWebhookAt] = useState<number | null>(null);
  const [lastWebhookPayload, setLastWebhookPayload] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [simPhone, setSimPhone] = useState('');
  const [simResult, setSimResult] = useState<string | null>(null);

  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(false);
  const [convsOpen, setConvsOpen] = useState(false);

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrRaw, setQrRaw] = useState<string | null>(null);
  const [qrPaircode, setQrPaircode] = useState<string | null>(null);
  const [qrAsyncImgSrc, setQrAsyncImgSrc] = useState<string | null>(null);
  const [qrConnected, setQrConnected] = useState(false);

  // Carrega status e URL do webhook ao montar
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

  function handleCopy() {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveWhatsAppSettingsAction({
        uazapi_url: uazapiUrl,
        uazapi_token: uazapiToken,
        bot_enabled: botEnabled,
        confirmation_enabled: confirmationEnabled,
        bot_persona: botPersona,
        stop_keyword: stopKeyword,
        booking_url: bookingUrl,
      });
      if (res.success) {
        success('Salvo!', 'Configurações do bot WhatsApp atualizadas.');
        // Atualiza webhook URL após salvar (pode ter sido criada pela primeira vez)
        getWebhookUrlAction().then(r => setWebhookUrl(r.webhookUrl || null)).catch(() => {});
      } else {
        error('Erro ao salvar', res.error || 'Tente novamente.');
      }
    });
  }

  function handleSetupWebhook() {
    startTransition(async () => {
      // Garante que as credenciais estão salvas no banco antes de configurar o webhook
      const saveRes = await saveWhatsAppSettingsAction({
        uazapi_url: uazapiUrl,
        uazapi_token: uazapiToken,
        bot_enabled: botEnabled,
        confirmation_enabled: confirmationEnabled,
        bot_persona: botPersona,
        stop_keyword: stopKeyword,
        booking_url: bookingUrl,
      });
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

    if (!res.success) {
      setQrError(res.error || 'Erro ao gerar QR Code.');
      return;
    }
    if (res.alreadyConnected) {
      setQrConnected(true);
      setStatus('open');
      return;
    }
    if (res.qrcode) { setQrRaw(res.qrcode); return; }
    if (res.paircode) { setQrPaircode(res.paircode); return; }
    setQrError('A uazapi não retornou QR Code nem código de pareamento.');
  }, []);

  function handleCloseQrModal() {
    setQrModalOpen(false);
  }

  // Valor crú retornado pela uazapi pode já vir como imagem base64 pronta
  // (com ou sem prefixo data:) — isso é derivável direto no render.
  const qrDirectImgSrc = !qrRaw ? null
    : qrRaw.startsWith('data:image') ? qrRaw
    : /^(iVBORw0KG|\/9j\/)/.test(qrRaw) ? `data:image/png;base64,${qrRaw}`
    : null;

  // Se não for nenhum dos formatos acima, é uma string de pareamento crua —
  // precisa gerar a imagem do QR code no navegador (única parte genuinamente assíncrona).
  useEffect(() => {
    if (!qrRaw || qrDirectImgSrc) return;
    QRCode.toDataURL(qrRaw, { width: 280, margin: 1 })
      .then(setQrAsyncImgSrc)
      .catch(() => setQrError('Não foi possível renderizar o QR Code recebido.'));
  }, [qrRaw, qrDirectImgSrc]);

  const qrImgSrc = qrDirectImgSrc ?? qrAsyncImgSrc;

  // Enquanto o modal estiver aberto e aguardando leitura, verifica a conexão periodicamente
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
        setSimResult('✅ Bot processou a mensagem! Se o número recebeu resposta no WhatsApp, o bot está funcionando. O problema é a uazapi não disparando o webhook.');
      } else {
        setSimResult(`❌ Falha ao processar: ${'error' in res ? res.error : `HTTP ${res.status}`}`);
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

  const s = statusLabel[status] ?? statusLabel['error'];
  const isConfigured = !!(uazapiUrl && uazapiToken);

  return (
    <div className="bg-white border border-[#efe9e6] rounded-3xl p-6 md:p-8 space-y-6">
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

        {/* Status da conexão */}
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

      {/* Banner de desconexão — visível sempre que a instância cair */}
      {isConfigured && (status === 'close' || status === 'qr' || status === 'error') && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs font-medium text-red-700">WhatsApp desconectado — clientes não estão recebendo respostas do bot.</p>
          </div>
          <button
            type="button"
            onClick={handleOpenQrModal}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
          >
            Reconectar agora
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Credenciais uazapi */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Credenciais uazapi
          </label>
          <div className="space-y-2">
            <input
              type="url"
              placeholder="URL da instância (ex: https://juliarobertabeauty.uazapi.com)"
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
        </div>

        {/* Link de agendamento */}
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
          <p className="text-xs text-gray-400">
            Sempre que uma cliente quiser agendar, o bot envia este link.
          </p>
        </div>

        {/* Ativar/desativar funções */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Funções ativas
          </label>
          <Toggle
            label="Responder clientes automaticamente (bot com IA)"
            description="O Gemini responde mensagens dos clientes com o link de agendamento e informações dos serviços"
            checked={botEnabled}
            onChange={setBotEnabled}
          />
          <Toggle
            label="Enviar confirmação após agendamento"
            description="A cliente recebe uma mensagem de confirmação assim que o agendamento é criado"
            checked={confirmationEnabled}
            onChange={setConfirmationEnabled}
          />
        </div>

        {/* Treinar a IA — campo prioritário e prominente */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Treinar a IA (personalidade e regras de resposta)
          </label>
          <p className="text-xs text-gray-500">
            Explique como a IA deve se comportar com as clientes: tom de voz, o que pode ou não pode prometer, como tratar dúvidas sobre preço, dor, prazos, etc. Quanto mais específico, mais coerente fica a resposta.
          </p>
          <textarea
            rows={6}
            placeholder={`Ex: Fale sempre num tom acolhedor e descontraído, como uma amiga.\nNunca invente preço ou prazo que não esteja na lista de serviços — se não souber, diga que vai confirmar.\nSe perguntarem sobre dor do procedimento, tranquilize e diga que a profissional explica tudo no dia.\nSe perguntarem sobre estacionamento, diga que há vagas na rua na frente do salão.`}
            value={botPersona}
            onChange={e => setBotPersona(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[#efe9e6] text-sm focus:outline-none focus:ring-2 focus:ring-[#500b18]/20 bg-[#faf8f7] resize-none"
          />
          <p className="text-xs text-gray-400 text-right">{botPersona.length} caracteres</p>
        </div>

        {/* Avançado (colapsável) */}
        <div className="border border-[#efe9e6] rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-[#faf8f7] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-gray-400" />
              Configurações avançadas do bot
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

        {/* Botão salvar */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 rounded-xl bg-[#500b18] text-white text-sm font-semibold hover:bg-[#3d0812] transition-colors disabled:opacity-50"
        >
          {isPending ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </form>

      {/* Configurar webhook */}
      {isConfigured && (
        <div className="border-t border-[#efe9e6] pt-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">Conectar ao WhatsApp</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Tente o botão automático primeiro. Se não funcionar, copie a URL abaixo e cole manualmente no painel da uazapi em &ldquo;Webhook&rdquo;.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenQrModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#500b18] text-[#500b18] text-sm font-semibold hover:bg-[#500b18]/5 transition-colors"
              >
                <QrCodeIcon className="w-4 h-4" />
                Conectar via QR Code
              </button>
              <button
                type="button"
                onClick={handleSetupWebhook}
                disabled={isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                Ativar webhook
              </button>
            </div>
          </div>

          {/* URL do webhook — destacada para cópia manual */}
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
                No painel uazapi: vá em <strong>Webhook</strong> → cole a URL acima → marque os eventos <strong>message</strong> → salve e ative.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Teste de envio */}
      {isConfigured && (
        <div className="border-t border-[#efe9e6] pt-5 space-y-2">
          <p className="text-sm font-semibold text-gray-800">Testar envio de mensagem</p>
          <p className="text-xs text-gray-500">Digite um número e envie uma mensagem de teste para confirmar que as credenciais funcionam.</p>
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

      {/* Simular mensagem recebida (testa o pipeline completo sem depender da uazapi) */}
      {isConfigured && (
        <div className="border-t border-[#efe9e6] pt-5 space-y-2">
          <p className="text-sm font-semibold text-gray-800">Simular mensagem recebida</p>
          <p className="text-xs text-gray-500">
            Dispara o bot como se a uazapi tivesse mandado uma mensagem. Se o número receber resposta, o bot está OK — o problema é só a uazapi não chamando o webhook.
          </p>
          <div className="flex gap-2">
            <input
              type="tel"
              placeholder="5511999999999 (número que vai receber a resposta)"
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
      <div className="border-t border-[#efe9e6] pt-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">Verificar configuração</p>
          <button
            type="button"
            onClick={handleDiagnose}
            disabled={diagnosing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#efe9e6] text-xs font-semibold text-gray-600 hover:bg-[#faf8f7] transition-colors disabled:opacity-50"
          >
            {diagnosing
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />
            }
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
                  <span className={step.ok && !step.warn ? 'text-gray-500' : step.warn ? 'text-yellow-600' : 'text-red-500'}>{step.detail}</span>
                </div>
              </div>
            ))}

            {/* Rastreador de último webhook recebido */}
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
                    Nenhum evento recebido ainda — mande uma mensagem para Julia e clique em "Verificar agora"
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

      {/* Conversas — controle manual de atendimento */}
      {isConfigured && (
        <div className="border-t border-[#efe9e6] pt-5">
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
                Quando você assumir uma conversa, o bot para de responder aquela cliente. Retome quando quiser devolver para o bot.
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

      {/* Modal de conexão via QR Code */}
      {qrModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseQrModal}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-800">Conectar WhatsApp</p>
              <button type="button" onClick={handleCloseQrModal} className="text-gray-400 hover:text-gray-700 transition-colors">
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
                <button
                  type="button"
                  onClick={handleOpenQrModal}
                  className="text-xs font-semibold text-[#500b18] underline"
                >
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
                  No celular: abra o WhatsApp → Mais opções (⋮) → Aparelhos conectados → Conectar um aparelho → aponte a câmera para este código.
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
                  No celular: abra o WhatsApp → Mais opções (⋮) → Aparelhos conectados → Conectar um aparelho → Conectar com número de telefone → digite este código.
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

// Componente auxiliar de toggle
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
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
        />
        <div
          className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-[#500b18]' : 'bg-gray-200'}`}
        />
        <div
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </label>
  );
}

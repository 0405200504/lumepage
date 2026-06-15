'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Bot, Wifi, WifiOff, Copy, Check, Settings2, RefreshCw, Zap, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { WhatsAppSettings } from '@/types/database';
import {
  saveWhatsAppSettingsAction,
  setupWebhookAction,
  checkWhatsAppStatusAction,
  getWebhookUrlAction,
} from '@/app/actions/whatsapp';

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

  const [status, setStatus] = useState<ConnectionStatus>('loading');
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Carrega status e URL do webhook ao montar
  useEffect(() => {
    checkWhatsAppStatusAction().then(r => setStatus((r.status as ConnectionStatus) || 'error'));
    getWebhookUrlAction().then(r => setWebhookUrl(r.webhookUrl || null));
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
      });
      if (res.success) {
        success('Salvo!', 'Configurações do bot WhatsApp atualizadas.');
        // Atualiza webhook URL após salvar (pode ter sido criada pela primeira vez)
        getWebhookUrlAction().then(r => setWebhookUrl(r.webhookUrl || null));
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
      });
      if (!saveRes.success) {
        error('Erro ao salvar credenciais', saveRes.error || 'Tente novamente.');
        return;
      }

      const res = await setupWebhookAction();
      if (res.success) {
        success('Webhook ativado!', 'A uazapi vai enviar mensagens para o Lume automaticamente.');
        if (res.webhookUrl) setWebhookUrl(res.webhookUrl);
        checkWhatsAppStatusAction().then(r => setStatus((r.status as ConnectionStatus) || 'error'));
      } else {
        error('Erro ao ativar webhook', res.error || 'Verifique a URL e o token.');
      }
    });
  }

  function handleRefreshStatus() {
    setStatus('loading');
    checkWhatsAppStatusAction().then(r => setStatus((r.status as ConnectionStatus) || 'error'));
  }

  const s = statusLabel[status];
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
                  Personalidade / tom de voz do bot (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Responda de forma super animada, use muito emoji e trate as clientes pelo primeiro nome."
                  value={botPersona}
                  onChange={e => setBotPersona(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#efe9e6] text-sm focus:outline-none focus:ring-2 focus:ring-[#500b18]/20 bg-[#faf8f7] resize-none"
                />
              </div>
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
                Clique no botão para registrar automaticamente o webhook na sua instância uazapi.
                Faça isso sempre que trocar a URL ou o token.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSetupWebhook}
              disabled={isPending}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              Ativar webhook
            </button>
          </div>

          {/* URL do webhook para referência */}
          {webhookUrl && (
            <div className="flex items-center gap-2 bg-[#faf8f7] border border-[#efe9e6] rounded-xl px-3 py-2">
              <p className="text-xs text-gray-500 font-mono truncate flex-1">{webhookUrl}</p>
              <button type="button" onClick={handleCopy} className="shrink-0 text-gray-400 hover:text-gray-700 transition-colors">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
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

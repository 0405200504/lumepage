'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  MessageCircle, Copy, Check, Settings2, RefreshCw, ChevronDown, ChevronUp, Smartphone,
  XCircle, CheckCircle2, Loader2, AlertCircle, Plus, Trash2, Zap,
  AlertTriangle, CalendarClock, BellRing, Sunrise, Mail,
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
  connectWhatsAppAction,
} from '@/app/actions/whatsapp';

interface WhatsAppPanelProps {
  initialSettings: WhatsAppSettings | null;
  /** true quando o servidor cria a instância sozinho (UAZAPI_ADMIN_TOKEN configurado). */
  canAutoProvision: boolean;
}

type ConnectionStatus = 'open' | 'connecting' | 'close' | 'qr' | 'error' | 'not_configured' | 'loading';

const statusLabel: Record<ConnectionStatus, string> = {
  open:           'Conectado',
  connecting:     'Conectando…',
  close:          'Desconectado',
  qr:             'Aguardando leitura do QR Code',
  error:          'Sem conexão',
  not_configured: 'Não configurado',
  loading:        'Verificando…',
};

/**
 * Painel do WhatsApp: conectar o número e configurar as mensagens automáticas.
 * O atendimento por IA está desligado nesta versão (ver lib/whatsapp/flags.ts) —
 * os campos da persona continuam no banco e são preservados a cada salvamento.
 */
export function WhatsAppPanel({ initialSettings, canAutoProvision }: WhatsAppPanelProps) {
  const { success, error } = useToast();
  const [isPending, startTransition] = useTransition();

  // ── Credenciais ───────────────────────────────────────────────────────────
  const [uazapiUrl, setUazapiUrl] = useState(initialSettings?.uazapi_url || '');
  const [uazapiToken, setUazapiToken] = useState(initialSettings?.uazapi_token || '');

  // ── Automações ────────────────────────────────────────────────────────────
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
  const [auto5daysEnabled, setAuto5daysEnabled] = useState(initialSettings?.automation_5days_enabled ?? false);
  const [auto5daysMessage, setAuto5daysMessage] = useState(
    initialSettings?.automation_5days_message || 'Oi, {nome}! 😊 Faltam 5 dias para o seu {servico} no dia {data} às {horario}. Já está reservado pra você! Qualquer imprevisto, é só me avisar. 💛'
  );
  const [auto5daysTime, setAuto5daysTime] = useState((initialSettings?.automation_5days_time || '10:00').substring(0, 5));
  const [autoFollowupEnabled, setAutoFollowupEnabled] = useState(initialSettings?.automation_followup_enabled ?? false);
  const [autoFollowupDays, setAutoFollowupDays] = useState(initialSettings?.automation_followup_days ?? 30);
  const [autoFollowupMessage, setAutoFollowupMessage] = useState(
    initialSettings?.automation_followup_message || 'Oi, {nome}! 💛 Senti sua falta por aqui. Já faz um tempinho desde o seu último {servico} — que tal agendar um horário pra se cuidar? Estou à disposição!'
  );
  const [autoFollowupTime, setAutoFollowupTime] = useState((initialSettings?.automation_followup_time || '10:00').substring(0, 5));

  // Variáveis personalizadas
  const [varRows, setVarRows] = useState<{ key: string; value: string }[]>(
    Object.entries((initialSettings?.custom_variables as Record<string, string> | null) ?? {})
      .map(([key, value]) => ({ key, value }))
  );
  const [varsOpen, setVarsOpen] = useState(false);

  // ── Conexão ───────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<ConnectionStatus>('loading');
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editingCredentials, setEditingCredentials] = useState(false);

  // ── Suporte (dentro de avançado) ──────────────────────────────────────────
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagResult, setDiagResult] = useState<Awaited<ReturnType<typeof diagnoseWhatsAppAction>> | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // ── QR ────────────────────────────────────────────────────────────────────
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrRaw, setQrRaw] = useState<string | null>(null);
  const [qrPaircode, setQrPaircode] = useState<string | null>(null);
  const [qrAsyncImgSrc, setQrAsyncImgSrc] = useState<string | null>(null);
  const [qrConnected, setQrConnected] = useState(false);

  const loadStatus = useCallback(() => {
    checkWhatsAppStatusAction()
      .then(r => {
        const val = r.status as string;
        setStatus((val in statusLabel ? val : 'error') as ConnectionStatus);
      })
      .catch(() => setStatus('error'));
  }, []);

  function refreshStatus() {
    setStatus('loading');
    loadStatus();
  }

  useEffect(() => {
    loadStatus();
    getWebhookUrlAction().then(r => setWebhookUrl(r.webhookUrl || null)).catch(() => {});
  }, [loadStatus]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function buildPayload() {
    const customVars = Object.fromEntries(
      varRows.filter(r => r.key.trim()).map(r => [r.key.trim(), r.value])
    );
    return {
      uazapi_url: uazapiUrl,
      uazapi_token: uazapiToken,
      // Atendimento por IA desligado nesta versão — os valores já gravados são
      // preservados para quando o recurso voltar.
      bot_enabled: false,
      confirmation_enabled: initialSettings?.confirmation_enabled ?? true,
      bot_persona: initialSettings?.bot_persona || '',
      stop_keyword: initialSettings?.stop_keyword || '#humano',
      booking_url: initialSettings?.booking_url || '',
      bot_blocked_numbers: initialSettings?.bot_blocked_numbers || [],
      automation_booking_enabled: autoBookingEnabled,
      automation_booking_message: autoBookingMessage,
      automation_booking_delay_minutes: autoBookingDelay,
      automation_day_before_enabled: autoDayBeforeEnabled,
      automation_day_before_message: autoDayBeforeMessage,
      automation_day_before_time: autoDayBeforeTime,
      automation_day_of_enabled: autoDayOfEnabled,
      automation_day_of_message: autoDayOfMessage,
      automation_day_of_time: autoDayOfTime,
      automation_5days_enabled: auto5daysEnabled,
      automation_5days_message: auto5daysMessage,
      automation_5days_time: auto5daysTime,
      automation_followup_enabled: autoFollowupEnabled,
      automation_followup_days: autoFollowupDays,
      automation_followup_message: autoFollowupMessage,
      automation_followup_time: autoFollowupTime,
      custom_variables: customVars,
    };
  }

  function handleSaveAutomations() {
    startTransition(async () => {
      const res = await saveWhatsAppSettingsAction(buildPayload());
      if (res.success) success('Salvo!', 'Suas mensagens automáticas foram atualizadas.');
      else error('Erro ao salvar', res.error || 'Tente novamente.');
    });
  }

  // Salva credenciais e já abre o QR Code — um passo só para a profissional.
  function handleSaveCredentials(connectAfter: boolean) {
    startTransition(async () => {
      const res = await saveWhatsAppSettingsAction(buildPayload());
      if (!res.success) {
        error('Erro ao salvar', res.error || 'Verifique a URL e o token.');
        return;
      }
      setEditingCredentials(false);
      getWebhookUrlAction().then(r => setWebhookUrl(r.webhookUrl || null)).catch(() => {});
      if (connectAfter) void handleOpenQrModal();
      else success('Salvo!', 'Credenciais atualizadas.');
    });
  }

  function handleCopy() {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSetupWebhook() {
    startTransition(async () => {
      const res = await setupWebhookAction();
      if (res.success) {
        success('Integração reativada', 'A uazapi voltou a falar com o Lume.');
        if (res.webhookUrl) setWebhookUrl(res.webhookUrl);
      } else {
        error('Erro ao reativar', res.error || 'Verifique a URL e o token.');
      }
    });
  }

  const handleOpenQrModal = useCallback(async () => {
    setQrModalOpen(true);
    setQrLoading(true);
    setQrError(null);
    setQrRaw(null);
    setQrPaircode(null);
    setQrAsyncImgSrc(null);
    setQrConnected(false);

    const res = await connectWhatsAppAction();
    setQrLoading(false);

    if (!res.success) {
      setQrError('limitReached' in res && res.limitReached
        ? 'Não conseguimos preparar seu WhatsApp agora. Já avisamos a equipe — tente de novo em alguns minutos.'
        : res.error || 'Erro ao gerar QR Code.');
      return;
    }
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

  // Ao conectar, registra o webhook sozinho: a profissional não precisa saber
  // que isso existe.
  useEffect(() => {
    if (!qrModalOpen || qrConnected || qrLoading) return;
    const interval = setInterval(async () => {
      const r = await checkWhatsAppStatusAction().catch(() => null);
      if (r?.status === 'open') {
        setQrConnected(true);
        setStatus('open');
        success('Conectado!', 'Seu WhatsApp está pronto para enviar as mensagens.');
        setupWebhookAction()
          .then(res => { if (res.success && res.webhookUrl) setWebhookUrl(res.webhookUrl); })
          .catch(() => {});
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [qrModalOpen, qrConnected, qrLoading, success]);

  async function handleTestMessage() {
    setTestResult(null);
    startTransition(async () => {
      const res = await sendTestMessageAction(testPhone);
      setTestResult(res.success
        ? { ok: true, msg: 'Mensagem enviada. Se chegou no WhatsApp, está tudo certo.' }
        : { ok: false, msg: `Falha: ${res.error}` });
    });
  }

  async function handleDiagnose() {
    setDiagnosing(true);
    setDiagResult(null);
    const result = await diagnoseWhatsAppAction().catch(() => ({ ok: false, steps: [], error: 'Erro ao verificar' }));
    setDiagResult(result);
    setDiagnosing(false);
  }

  function addVarRow() { setVarRows(prev => [...prev, { key: '', value: '' }]); }
  function updateVarRow(index: number, field: 'key' | 'value', val: string) {
    setVarRows(prev => prev.map((r, i) =>
      i === index ? { ...r, [field]: field === 'key' ? val.replace(/[^a-z0-9_]/g, '').toLowerCase() : val } : r
    ));
  }
  function removeVarRow(index: number) { setVarRows(prev => prev.filter((_, i) => i !== index)); }

  const isConfigured = !!(uazapiUrl && uazapiToken);
  const isConnected = status === 'open';
  // Com provisionamento automático a profissional nunca vê URL nem token.
  const showCredentialsForm = (!isConfigured && !canAutoProvision) || editingCredentials;
  const activeAutomations = [autoBookingEnabled, auto5daysEnabled, autoDayBeforeEnabled, autoDayOfEnabled, autoFollowupEnabled].filter(Boolean).length;
  const builtinVars = ['nome', 'servico', 'data', 'horario', 'profissional', 'preco', 'forma_pagamento'];
  const customVarNames = varRows.filter(r => r.key.trim()).map(r => r.key.trim());

  // Campo dentro de um bloco cinza (bg-surface-2) x campo direto no cartão branco.
  /* Um campo só. A distinção "campo sobre bloco cinza" × "campo sobre cartão
     branco" deixou de existir junto com os blocos cinzas aninhados. */
  const fieldOnTint = 'field-input';
  const fieldOnCard = 'field-input';

  return (
    <div className="space-y-5">
      {/* ═══ Conexão ═══════════════════════════════════════════════════════ */}
      <section className="card p-5 md:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-h3 text-heading">WhatsApp</h2>
            <p className="text-caption text-n-500 mt-1">
              Conecte seu número para o Lume enviar as mensagens automáticas por você.
            </p>
          </div>
          {/* Estado AO VIVO: ponto + rótulo mono, dentro de um botão
              retangular que também revalida. Conectado é a única condição em
              que --signal aparece nesta tela — é literalmente uma luz de
              "no ar", que é para o que ele existe. */}
          <button
            type="button"
            onClick={refreshStatus}
            title="Verificar conexão"
            className="shrink-0 inline-flex items-center gap-2 rounded-chip border border-line px-2.5 h-8 hover:border-line-strong transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
          >
            <span
              className="status-dot"
              data-live={isConnected ? 'true' : undefined}
              style={{
                color: isConnected
                  ? 'var(--color-signal)'
                  : status === 'loading'
                    ? 'var(--color-n-400)'
                    : status === 'not_configured'
                      ? 'var(--color-n-300)'
                      : 'var(--color-danger)',
              }}
            />
            <span className="mono-micro text-n-600">{statusLabel[status] ?? statusLabel.error}</span>
            <RefreshCw className={`h-3 w-3 text-n-500 ${status === 'loading' ? 'animate-spin' : ''}`} aria-hidden />
          </button>
        </div>

        {/* Passo 1 — credenciais (só quando falta configurar ou ao editar) */}
        {showCredentialsForm && (
          <div className="rounded-xl border border-line bg-surface-2 p-4 space-y-3">
            <div>
              <p className="text-label font-bold text-heading">Credenciais da sua instância</p>
              <p className="text-caption text-n-600 mt-0.5">
                Você recebe esses dados junto com o acesso. Em caso de dúvida, fale com o suporte.
              </p>
            </div>
            <input
              type="url"
              placeholder="URL da instância (ex.: https://meubot.uazapi.com)"
              value={uazapiUrl}
              onChange={e => setUazapiUrl(e.target.value)}
              className={fieldOnTint}
            />
            <input
              type="password"
              placeholder="Token da instância"
              value={uazapiToken}
              onChange={e => setUazapiToken(e.target.value)}
              className={fieldOnTint}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending || !uazapiUrl || !uazapiToken}
                onClick={() => handleSaveCredentials(true)}
                className="flex-1 py-3 bg-wine-700 hover:bg-wine-800 text-white text-body-sm font-semibold rounded-chip transition-colors disabled:opacity-60"
              >
                {isPending ? 'Salvando…' : 'Salvar e conectar'}
              </button>
              {editingCredentials && (
                <button
                  type="button"
                  onClick={() => {
                    setUazapiUrl(initialSettings?.uazapi_url || '');
                    setUazapiToken(initialSettings?.uazapi_token || '');
                    setEditingCredentials(false);
                  }}
                  className="px-4 py-3 rounded-chip border border-line text-caption font-semibold text-n-600 hover:bg-surface transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Estado da conexão */}
        {!showCredentialsForm && (
          isConnected ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-ok)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-ok)_8%,transparent)] px-4 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <CheckCircle2 className="h-5 w-5 text-ok shrink-0" />
                <div className="min-w-0">
                  <p className="text-label font-bold text-heading">WhatsApp conectado</p>
                  <p className="text-caption text-n-600">As mensagens ativas abaixo já estão sendo enviadas.</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href="/dashboard/whatsapp/conversas"
                  className="rounded-xl bg-wine-700 px-3 py-2 text-caption font-bold text-white shadow-soft transition-colors hover:bg-wine-800"
                >
                  Abrir conversas
                </Link>
                <button
                  type="button"
                  onClick={handleOpenQrModal}
                  className="rounded-chip border border-line bg-surface px-3 py-2 text-caption font-semibold text-n-600 hover:bg-surface-2 transition-colors"
                >
                  Trocar número
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-surface-2 p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <Smartphone className="h-5 w-5 text-n-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-label font-bold text-heading">
                    {isConfigured ? 'Seu WhatsApp está desconectado' : 'Conecte seu WhatsApp'}
                  </p>
                  <p className="text-caption text-n-600">
                    {isConfigured
                      ? 'Leia o QR Code com o celular para reconectar. Nenhuma mensagem é enviada enquanto isso.'
                      : 'Leia um QR Code com o celular, como no WhatsApp Web. Leva menos de um minuto.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenQrModal}
                className="shrink-0 px-5 py-3 bg-wine-700 hover:bg-wine-800 text-white text-body-sm font-semibold rounded-chip transition-colors"
              >
                Conectar WhatsApp
              </button>
            </div>
          )
        )}

        {/* Avançado — credenciais, integração e testes (uso pontual/suporte) */}
        {isConfigured && (
          <div className="border-t border-line pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              className="flex items-center gap-2 text-caption font-semibold text-n-600 hover:text-heading transition-colors"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Configurações avançadas
              {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-5">
                {!editingCredentials && (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-caption font-semibold text-heading">Credenciais</p>
                      <p className="text-caption text-n-600 truncate">{uazapiUrl} · token ••••{uazapiToken.slice(-4)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setEditingCredentials(true); setShowAdvanced(false); }}
                      className="shrink-0 rounded-chip border border-line px-3 py-2 text-caption font-semibold text-n-600 hover:bg-surface-2 transition-colors"
                    >
                      Editar
                    </button>
                  </div>
                )}

                {/* Testar envio */}
                <div className="space-y-2">
                  <p className="text-caption font-semibold text-heading">Testar envio</p>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      placeholder="5511999999999"
                      value={testPhone}
                      onChange={e => setTestPhone(e.target.value)}
                      className={fieldOnCard}
                    />
                    <button
                      type="button"
                      onClick={handleTestMessage}
                      disabled={isPending || !testPhone}
                      className="shrink-0 px-4 py-2.5 rounded-chip border border-line text-caption font-semibold text-n-600 hover:bg-surface-2 transition-colors disabled:opacity-60"
                    >
                      Enviar
                    </button>
                  </div>
                  {testResult && (
                    <p className={`flex items-center gap-1.5 text-caption font-medium ${testResult.ok ? 'text-success' : 'text-danger'}`}>
                      {testResult.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden /> : <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />}
                      {testResult.msg}
                    </p>
                  )}
                </div>

                {/* Diagnóstico */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-caption font-semibold text-heading">Verificar configuração</p>
                    <button
                      type="button"
                      onClick={handleDiagnose}
                      disabled={diagnosing}
                      className="inline-flex items-center gap-1.5 rounded-chip border border-line px-3 py-1.5 text-caption font-semibold text-n-600 hover:bg-surface-2 transition-colors disabled:opacity-60"
                    >
                      {diagnosing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      {diagnosing ? 'Verificando…' : 'Verificar'}
                    </button>
                  </div>
                  {diagResult && (
                    <div className="space-y-1.5">
                      {'error' in diagResult && diagResult.error && <p className="text-caption text-bad">{diagResult.error}</p>}
                      {diagResult.steps?.map((step, i) => (
                        <div key={i} className="flex items-start gap-2 text-caption">
                          {step.ok && !step.warn
                            ? <CheckCircle2 className="h-4 w-4 text-ok shrink-0 mt-0.5" />
                            : step.warn
                              ? <AlertCircle className="h-4 w-4 text-warn shrink-0 mt-0.5" />
                              : <XCircle className="h-4 w-4 text-bad shrink-0 mt-0.5" />
                          }
                          <div>
                            <span className="font-medium text-heading">{step.label}: </span>
                            <span className={step.ok && !step.warn ? 'text-n-600' : step.warn ? 'text-warn' : 'text-bad'}>{step.detail}</span>
                          </div>
                        </div>
                      ))}
                      {diagResult.ok && <p className="text-caption font-medium text-ok mt-1">Tudo certo por aqui.</p>}
                    </div>
                  )}
                </div>

                {/* Integração (webhook) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-caption font-semibold text-heading">Integração com a uazapi</p>
                      <p className="text-caption text-n-600">É configurada sozinha ao conectar. Use se o suporte pedir.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSetupWebhook}
                      disabled={isPending}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-chip border border-line px-3 py-1.5 text-caption font-semibold text-n-600 hover:bg-surface-2 transition-colors disabled:opacity-60"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Reconfigurar
                    </button>
                  </div>
                  {webhookUrl && (
                    <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2">
                      <p className="flex-1 truncate font-mono text-caption text-n-600">{webhookUrl}</p>
                      <button type="button" onClick={handleCopy} className="shrink-0 text-faint hover:text-heading transition-colors">
                        {copied ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ═══ Mensagens automáticas ═════════════════════════════════════════ */}
      <section className="card p-5 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-body font-bold text-heading tracking-tight">Mensagens automáticas</h2>
            <p className="text-caption text-n-600 mt-0.5">
              Ligue o que quiser enviar e escreva o texto. O Lume dispara na hora certa, sem você fazer nada.
            </p>
          </div>
          {activeAutomations > 0 && (
            <span className="shrink-0 rounded-badge border border-line px-2 py-0.5 mono-micro text-n-600">
              {activeAutomations} ativa{activeAutomations > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isConfigured && !isConnected && (
          <div className="flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--color-warn)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-warn)_8%,transparent)] px-4 py-3">
            <AlertCircle className="h-4 w-4 text-warn shrink-0 mt-0.5" />
            <p className="text-caption text-warn">
              Seu WhatsApp está desconectado — as mensagens abaixo só voltam a ser enviadas depois de reconectar.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <AutomationCard
            icon={CheckCircle2}
            title="Confirmação de agendamento"
            description="Assim que a cliente agenda"
            enabled={autoBookingEnabled}
            onToggle={setAutoBookingEnabled}
          >
            <MessageField value={autoBookingMessage} onChange={setAutoBookingMessage} />
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-caption font-medium text-n-600 shrink-0">Enviar após</label>
              <input
                type="number" min={0} max={3600} value={autoBookingDelay}
                onChange={e => setAutoBookingDelay(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 px-2 py-2 rounded-xl border border-line bg-surface text-label text-center text-heading outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
              />
              <span className="text-caption text-n-600">
                {autoBookingDelay === 0 ? 'segundos — envio instantâneo' : 'segundo(s) do agendamento'}
              </span>
            </div>
          </AutomationCard>

          <AutomationCard
            icon={CalendarClock}
            title="Lembrete — 5 dias antes"
            description="Cinco dias antes do atendimento"
            enabled={auto5daysEnabled}
            onToggle={setAuto5daysEnabled}
          >
            <MessageField value={auto5daysMessage} onChange={setAuto5daysMessage} />
            <TimeField value={auto5daysTime} onChange={setAuto5daysTime} />
          </AutomationCard>

          <AutomationCard
            icon={BellRing}
            title="Lembrete — dia anterior"
            description="Na véspera do atendimento"
            enabled={autoDayBeforeEnabled}
            onToggle={setAutoDayBeforeEnabled}
          >
            <MessageField value={autoDayBeforeMessage} onChange={setAutoDayBeforeMessage} />
            <TimeField value={autoDayBeforeTime} onChange={setAutoDayBeforeTime} />
          </AutomationCard>

          <AutomationCard
            icon={Sunrise}
            title="Lembrete — no dia"
            description="Na manhã do atendimento"
            enabled={autoDayOfEnabled}
            onToggle={setAutoDayOfEnabled}
          >
            <MessageField value={autoDayOfMessage} onChange={setAutoDayOfMessage} />
            <TimeField value={autoDayOfTime} onChange={setAutoDayOfTime} />
          </AutomationCard>

          <AutomationCard
            icon={Mail}
            title="Follow-up — cliente sem retorno"
            description="Reengaja quem não volta há um tempo"
            enabled={autoFollowupEnabled}
            onToggle={setAutoFollowupEnabled}
          >
            <MessageField
              value={autoFollowupMessage}
              onChange={setAutoFollowupMessage}
              hint={`Variáveis: {nome}, {servico} (último atendimento), {profissional}.`}
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <label className="text-caption font-medium text-n-600 shrink-0">Enviar após</label>
                <input
                  type="number" min={1} max={365} value={autoFollowupDays}
                  onChange={e => setAutoFollowupDays(Math.max(1, parseInt(e.target.value) || 30))}
                  className="w-20 px-2 py-2 rounded-xl border border-line bg-surface text-label text-center text-heading outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
                />
                <span className="text-caption text-n-600">dias sem retornar</span>
              </div>
              <TimeField value={autoFollowupTime} onChange={setAutoFollowupTime} label="Horário" />
            </div>
          </AutomationCard>
        </div>

        {/* Variáveis */}
        <div className="border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setVarsOpen(v => !v)}
            className="flex items-center gap-2 text-caption font-semibold text-n-600 hover:text-heading transition-colors"
          >
            Variáveis nas mensagens
            {varsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {varsOpen && (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {builtinVars.map(v => (
                  <span key={v} className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-caption text-n-600">{`{${v}}`}</span>
                ))}
                {customVarNames.map(v => (
                  <span key={v} className="rounded-full bg-[color:var(--color-accent-soft)] px-2 py-0.5 font-mono text-caption text-wine-700">{`{${v}}`}</span>
                ))}
              </div>
              <p className="text-caption text-n-600">
                Crie variáveis suas com dados do estúdio — como {'{endereco}'} ou {'{instagram}'} — e use em qualquer mensagem.
              </p>

              {varRows.length > 0 && (
                <div className="space-y-2">
                  {varRows.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="relative w-36 shrink-0">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 select-none font-mono text-caption text-faint">{'{'}</span>
                        <input
                          type="text" placeholder="nome_var" value={row.key}
                          onChange={e => updateVarRow(i, 'key', e.target.value)}
                          className="w-full rounded-xl border border-line bg-surface-2 py-2 pl-5 pr-5 font-mono text-caption text-heading outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 select-none font-mono text-caption text-faint">{'}'}</span>
                      </div>
                      <input
                        type="text" placeholder="Valor que aparece na mensagem" value={row.value}
                        onChange={e => updateVarRow(i, 'value', e.target.value)}
                        className="flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-label text-heading outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
                      />
                      <button type="button" onClick={() => removeVarRow(i)} className="shrink-0 text-faint hover:text-bad transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={addVarRow}
                className="inline-flex items-center gap-1.5 text-caption font-bold text-wine-700 hover:opacity-70 transition-opacity"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar variável
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={handleSaveAutomations}
          className="w-full py-3.5 bg-wine-700 hover:bg-wine-800 text-white text-label font-bold rounded-xl shadow-soft transition-colors disabled:opacity-60"
        >
          {isPending ? 'Salvando…' : 'Salvar mensagens'}
        </button>
      </section>

      {/* Modal de QR Code */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setQrModalOpen(false)}>
          <div className="w-full max-w-sm space-y-4 rounded-3xl bg-surface p-6 shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-label font-bold text-heading">Conectar WhatsApp</p>
              <button type="button" onClick={() => setQrModalOpen(false)} className="text-faint hover:text-heading transition-colors">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {qrLoading && (
              <div className="flex flex-col items-center gap-2 py-10">
                <Loader2 className="h-6 w-6 animate-spin text-faint" />
                <p className="text-caption text-n-600">Gerando QR Code…</p>
              </div>
            )}

            {qrError && !qrLoading && (
              <div className="space-y-3 py-2">
                <p className="text-caption text-bad">{qrError}</p>
                <button type="button" onClick={handleOpenQrModal} className="text-caption font-bold text-wine-700 underline">
                  Tentar novamente
                </button>
              </div>
            )}

            {qrConnected && !qrLoading && (
              <div className="flex flex-col items-center gap-2 py-10">
                <CheckCircle2 className="h-10 w-10 text-ok" />
                <p className="text-label font-bold text-heading">WhatsApp conectado!</p>
              </div>
            )}

            {qrImgSrc && !qrConnected && !qrLoading && (
              <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImgSrc} alt="QR Code do WhatsApp" className="h-64 w-64 rounded-xl border border-line bg-white" />
                <p className="text-center text-caption text-n-600">
                  No celular: WhatsApp → Mais opções (⋮) → Aparelhos conectados → Conectar um aparelho → aponte a câmera para este código.
                </p>
                <p className="flex items-center gap-1.5 text-caption text-faint">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Aguardando leitura…
                </p>
              </div>
            )}

            {qrPaircode && !qrConnected && !qrLoading && (
              <div className="flex flex-col items-center gap-3">
                <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 font-mono text-h2 font-bold tracking-widest text-wine-700">
                  {qrPaircode}
                </p>
                <p className="text-center text-caption text-n-600">
                  No celular: WhatsApp → Mais opções (⋮) → Aparelhos conectados → Conectar com número de telefone → digite este código.
                </p>
                <p className="flex items-center gap-1.5 text-caption text-faint">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Aguardando confirmação…
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MessageField({ value, onChange, hint }: { value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <label className="mb-1 block text-caption font-medium text-n-600">Mensagem</label>
      <textarea
        rows={3}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-2.5 text-label text-heading outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
      />
      {hint && <p className="mt-1 text-caption text-faint">{hint}</p>}
    </div>
  );
}

function TimeField({ value, onChange, label = 'Horário de envio' }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <label className="shrink-0 text-caption font-medium text-n-600">{label}</label>
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="rounded-xl border border-line bg-surface px-3 py-2 text-label text-heading outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
      />
    </div>
  );
}

function AutomationCard({
  icon: Icon, title, description, enabled, onToggle, children,
}: {
  /** Ícone lucide 20px. Era um emoji em string — família gráfica que não é a
      nossa, tamanho que não obedece à escala e desenho que muda por sistema
      operacional. */
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-control border overflow-hidden transition-ui ${enabled ? 'border-n-300' : 'border-line'}`}>
      <label className="flex cursor-pointer items-center justify-between gap-3 bg-n-50 px-4 py-3">
        <span className="icon-chip shrink-0" data-accent={enabled ? 'true' : undefined} aria-hidden>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-label font-semibold text-heading">{title}</p>
          <p className="mt-0.5 text-caption text-n-500">{description}</p>
        </div>
        <span className="relative inline-flex shrink-0 items-center">
          <input type="checkbox" className="sr-only" checked={enabled} onChange={e => onToggle(e.target.checked)} />
          <span className={`block h-6 w-10 rounded-full transition-colors ${enabled ? 'bg-wine-700' : 'bg-n-300'}`}>
            <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`} />
          </span>
        </span>
      </label>
      {enabled && <div className="space-y-3 border-t border-line px-4 py-3">{children}</div>}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useTransition, useCallback, useRef } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  RefreshCw, ChevronDown, ChevronUp, Smartphone, CheckCircle2, Loader2, AlertCircle,
  Plus, Trash2, CalendarClock, BellRing, Sunrise, Mail,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { WhatsAppSettings } from '@/types/database';
import {
  saveWhatsAppSettingsAction,
  setupWebhookAction,
  checkWhatsAppStatusAction,
  connectWhatsAppAction,
  disconnectWhatsAppAction,
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
  not_configured: 'Não conectado',
  loading:        'Verificando…',
};

/** Com o QR na tela, confere a cada 3 s se o celular já leu. */
const SCAN_POLL_MS = 3_000;
/** O código do WhatsApp expira rápido; pede outro antes disso, sem piscar. */
const QR_REFRESH_MS = 20_000;
/** Conectado: confere de vez em quando para, se cair, já mostrar o QR. */
const CONNECTED_POLL_MS = 30_000;

/**
 * Painel do WhatsApp: conectar o número e configurar as mensagens automáticas.
 *
 * A profissional não configura nada. O servidor uazapi é um só para todas as
 * contas (UAZAPI_SERVER_URL + UAZAPI_ADMIN_TOKEN) e a instância dela é criada
 * na primeira conexão. Sempre que o número está desconectado, o QR Code
 * aparece sozinho — sem botão, sem modal e sem "configurações avançadas".
 * Diagnóstico, teste de envio e webhook continuam como actions do servidor,
 * para uso do suporte.
 *
 * O atendimento por IA está desligado nesta versão (ver lib/whatsapp/flags.ts) —
 * os campos da persona continuam no banco e são preservados a cada salvamento.
 */
export function WhatsAppPanel({ initialSettings, canAutoProvision }: WhatsAppPanelProps) {
  const { success, error } = useToast();
  const [isPending, startTransition] = useTransition();

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
  // A instância desta conta já existe no servidor? Vira true na hora em que
  // ela é criada — sem recarregar a página.
  const [hasInstance, setHasInstance] = useState(!!(initialSettings?.uazapi_url && initialSettings?.uazapi_token));
  const [confirmSwap, setConfirmSwap] = useState(false);

  // ── QR Code (aparece sozinho sempre que o número está desconectado) ───────
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrRaw, setQrRaw] = useState<string | null>(null);
  const [qrPaircode, setQrPaircode] = useState<string | null>(null);
  const [qrAsyncImgSrc, setQrAsyncImgSrc] = useState<string | null>(null);
  // Um pedido de QR por "queda": evita pedir dois ao mesmo tempo.
  const qrRequested = useRef(false);

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

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const isConnected = status === 'open';
  const canConnect = hasInstance || canAutoProvision;
  // "connecting" também entra aqui: é como a uazapi chama a espera pela leitura do QR.
  const needsScan = status !== 'open' && status !== 'loading';
  const waitingScan = needsScan && canConnect;

  const clearQr = useCallback(() => {
    setQrRaw(null);
    setQrPaircode(null);
    setQrAsyncImgSrc(null);
    setQrError(null);
  }, []);

  /** Pede (ou renova) o QR Code. `silent` troca o código sem piscar a tela. */
  const fetchQr = useCallback(async (silent = false) => {
    if (!silent) { setQrLoading(true); setQrError(null); }
    const res = await connectWhatsAppAction().catch(() => null);
    setQrLoading(false);

    if (!res || !res.success) {
      setQrRaw(null);
      setQrPaircode(null);
      setQrAsyncImgSrc(null);
      setQrError(!res
        ? 'Não conseguimos falar com o servidor do WhatsApp. Tente de novo em instantes.'
        : 'limitReached' in res && res.limitReached
          ? 'Não conseguimos preparar seu WhatsApp agora. Já avisamos a equipe — tente de novo em alguns minutos.'
          : res.error || 'Não foi possível gerar o QR Code.');
      return;
    }

    setHasInstance(true);
    if (res.alreadyConnected) { setStatus('open'); clearQr(); return; }
    setQrError(null);
    if (res.qrcode) { setQrPaircode(null); setQrRaw(res.qrcode); return; }
    if (res.paircode) { setQrRaw(null); setQrAsyncImgSrc(null); setQrPaircode(res.paircode); return; }
    setQrRaw(null);
    setQrPaircode(null);
    setQrAsyncImgSrc(null);
    setQrError('O servidor não devolveu um QR Code. Tente de novo.');
  }, [clearQr]);

  // Caiu (ou nunca conectou)? Pede o QR na hora — a profissional não clica em nada.
  useEffect(() => {
    if (!waitingScan) { qrRequested.current = false; return; }
    if (qrRequested.current) return;
    qrRequested.current = true;
    void fetchQr();
  }, [waitingScan, fetchQr]);

  // Renova o código antes de expirar. Código de pareamento não precisa.
  useEffect(() => {
    if (!waitingScan || !qrRaw) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      void fetchQr(true);
    }, QR_REFRESH_MS);
    return () => clearInterval(timer);
  }, [waitingScan, qrRaw, fetchQr]);

  // Com o QR na tela, confere se o celular já leu. Ao conectar, registra o
  // webhook sozinho: a profissional não precisa saber que isso existe.
  useEffect(() => {
    if (!waitingScan) return;
    const timer = setInterval(async () => {
      if (document.hidden) return;
      const r = await checkWhatsAppStatusAction().catch(() => null);
      if (r?.status !== 'open') return;
      setStatus('open');
      clearQr();
      success('Conectado!', 'Seu WhatsApp está pronto para enviar as mensagens.');
      setupWebhookAction().catch(() => {});
    }, SCAN_POLL_MS);
    return () => clearInterval(timer);
  }, [waitingScan, success, clearQr]);

  // Conectado: confere de vez em quando (e ao voltar para a aba). Se cair, o
  // status muda e o QR aparece sozinho.
  useEffect(() => {
    if (!isConnected) return;
    const check = async () => {
      if (document.hidden) return;
      const first = await checkWhatsAppStatusAction().catch(() => null);
      if (first?.status === 'open') return;
      // Confirma antes de tirar o "conectado" da tela: um erro passageiro não
      // pode fazer o QR piscar na frente dela.
      await new Promise(r => setTimeout(r, 2000));
      const again = await checkWhatsAppStatusAction().catch(() => null);
      const val = (again?.status ?? 'error') as string;
      if (val !== 'open') setStatus((val in statusLabel ? val : 'error') as ConnectionStatus);
    };
    const timer = setInterval(check, CONNECTED_POLL_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, [isConnected]);

  const qrDirectImgSrc = !qrRaw ? null
    : qrRaw.startsWith('data:image') ? qrRaw
    : /^(iVBORw0KG|\/9j\/)/.test(qrRaw) ? `data:image/png;base64,${qrRaw}`
    : null;

  useEffect(() => {
    if (!qrRaw || qrDirectImgSrc) return;
    let cancelled = false;
    QRCode.toDataURL(qrRaw, { width: 280, margin: 1 })
      .then(src => { if (!cancelled) setQrAsyncImgSrc(src); })
      .catch(() => { if (!cancelled) setQrError('Não foi possível mostrar o QR Code recebido.'); });
    return () => { cancelled = true; };
  }, [qrRaw, qrDirectImgSrc]);

  const qrImgSrc = qrDirectImgSrc ?? qrAsyncImgSrc;

  // Trocar número: desliga o atual; o status cai e o QR novo é pedido sozinho.
  function handleSwapNumber() {
    startTransition(async () => {
      const res = await disconnectWhatsAppAction();
      if (!res.success) {
        error('Não deu para desconectar', res.error || 'Tente de novo.');
        return;
      }
      setConfirmSwap(false);
      setStatus('close');
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function buildPayload() {
    const customVars = Object.fromEntries(
      varRows.filter(r => r.key.trim()).map(r => [r.key.trim(), r.value])
    );
    return {
      // Credenciais ficam com o servidor: o painel nunca mexe nelas.
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

  function addVarRow() { setVarRows(prev => [...prev, { key: '', value: '' }]); }
  function updateVarRow(index: number, field: 'key' | 'value', val: string) {
    setVarRows(prev => prev.map((r, i) =>
      i === index ? { ...r, [field]: field === 'key' ? val.replace(/[^a-z0-9_]/g, '').toLowerCase() : val } : r
    ));
  }
  function removeVarRow(index: number) { setVarRows(prev => prev.filter((_, i) => i !== index)); }

  const activeAutomations = [autoBookingEnabled, auto5daysEnabled, autoDayBeforeEnabled, autoDayOfEnabled, autoFollowupEnabled].filter(Boolean).length;
  const builtinVars = ['nome', 'servico', 'data', 'horario', 'profissional', 'preco', 'forma_pagamento'];
  const customVarNames = varRows.filter(r => r.key.trim()).map(r => r.key.trim());

  // O que o cartão de conexão mostra. "scan" é o estado normal de desconectado:
  // o QR já na tela. Com um código na tela, "verificando" não o esconde.
  const hasQrOnScreen = !!(qrImgSrc || qrPaircode || qrLoading || qrError);
  const view: 'checking' | 'connected' | 'support' | 'scan' =
    isConnected ? 'connected'
    : status === 'loading' && !hasQrOnScreen ? 'checking'
    : !canConnect ? 'support'
    : 'scan';
  const everHadInstance = !!(initialSettings?.uazapi_url && initialSettings?.uazapi_token);

  return (
    <div className="space-y-5">
      {/* ═══ Conexão ═══════════════════════════════════════════════════════ */}
      <section data-tour="module-action" className="card p-5 md:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-h3 text-heading">Seu número de WhatsApp</h2>
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

        {view === 'checking' && (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3.5">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-faint" aria-hidden />
            <p className="text-caption text-n-600">Verificando sua conexão…</p>
          </div>
        )}

        {view === 'connected' && (
          <div className="space-y-3">
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
                {!confirmSwap && (
                  <button
                    type="button"
                    onClick={() => setConfirmSwap(true)}
                    className="rounded-chip border border-line bg-surface px-3 py-2 text-caption font-semibold text-n-600 hover:bg-surface-2 transition-colors"
                  >
                    Trocar número
                  </button>
                )}
              </div>
            </div>

            {confirmSwap && (
              <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-caption text-n-600">
                  O número atual é desconectado e o QR Code aparece em seguida para você conectar o novo.
                </p>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={handleSwapNumber}
                    disabled={isPending}
                    className="rounded-chip bg-wine-700 px-3 py-2 text-caption font-bold text-white transition-colors hover:bg-wine-800 disabled:opacity-60"
                  >
                    {isPending ? 'Desconectando…' : 'Desconectar e trocar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmSwap(false)}
                    disabled={isPending}
                    className="rounded-chip border border-line px-3 py-2 text-caption font-semibold text-n-600 transition-colors hover:bg-surface disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'support' && (
          <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3.5">
            <Smartphone className="h-5 w-5 text-n-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-label font-bold text-heading">Estamos preparando seu WhatsApp</p>
              <p className="text-caption text-n-600">
                A conexão ainda não foi liberada para a sua conta. Fale com o suporte do Lume que a gente resolve.
              </p>
            </div>
          </div>
        )}

        {view === 'scan' && (
          <div className="rounded-xl border border-line bg-surface-2 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-n-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-label font-bold text-heading">
                  {everHadInstance ? 'Seu WhatsApp está desconectado' : 'Conecte seu WhatsApp'}
                </p>
                <p className="text-caption text-n-600">
                  {everHadInstance
                    ? 'Leia o QR Code abaixo para reconectar. Nenhuma mensagem é enviada enquanto isso.'
                    : 'Leia o QR Code abaixo com o celular, como no WhatsApp Web. Leva menos de um minuto.'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col items-center gap-3">
              {qrLoading && (
                <div className="flex h-64 w-64 flex-col items-center justify-center gap-2 rounded-xl border border-line bg-surface">
                  <Loader2 className="h-6 w-6 animate-spin text-faint" aria-hidden />
                  <p className="text-caption text-n-600">Preparando seu QR Code…</p>
                </div>
              )}

              {qrError && !qrLoading && (
                <div className="flex w-full max-w-sm flex-col items-center gap-3 py-4 text-center">
                  <p className="flex items-start gap-2 text-caption text-bad">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                    {qrError}
                  </p>
                  <button
                    type="button"
                    onClick={() => void fetchQr()}
                    className="rounded-chip bg-wine-700 px-4 py-2.5 text-caption font-bold text-white transition-colors hover:bg-wine-800"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {qrImgSrc && !qrLoading && !qrError && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrImgSrc} alt="QR Code do WhatsApp" className="h-64 w-64 rounded-xl border border-line bg-white" />
                  <p className="max-w-sm text-center text-caption text-n-600">
                    No celular: WhatsApp → Mais opções (⋮) → Aparelhos conectados → Conectar um aparelho → aponte a câmera para este código.
                  </p>
                  <p className="flex items-center gap-1.5 text-caption text-faint">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    Aguardando leitura… o código se renova sozinho.
                  </p>
                </>
              )}

              {qrPaircode && !qrImgSrc && !qrLoading && !qrError && (
                <>
                  <p className="rounded-xl border border-line bg-surface px-4 py-3 font-mono text-h2 font-bold tracking-widest text-wine-700">
                    {qrPaircode}
                  </p>
                  <p className="max-w-sm text-center text-caption text-n-600">
                    No celular: WhatsApp → Mais opções (⋮) → Aparelhos conectados → Conectar com número de telefone → digite este código.
                  </p>
                  <p className="flex items-center gap-1.5 text-caption text-faint">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    Aguardando confirmação…
                  </p>
                </>
              )}
            </div>
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

        {hasInstance && needsScan && (
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

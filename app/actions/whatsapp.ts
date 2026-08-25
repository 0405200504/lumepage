'use server';

import { authService } from '@/lib/auth/auth';
import { dbService } from '@/lib/supabase/db';
import {
  configureUazapiWebhook, checkUazapiStatus, sendWhatsAppText, getUazapiQRCode,
  createUazapiInstance, uazapiAdminConfigured,
} from '@/lib/uazapi';
import { normalizeWhatsapp } from '@/lib/whatsapp';

/**
 * `mutating: true` recusa a sessão de suporte em modo leitura — o admin entrou para
 * investigar, não para ligar/desligar o bot da cliente sem querer.
 */
async function getProfessionalId(mutating = true): Promise<string | null> {
  try {
    const session = await authService.getCurrentUser('pro');
    if (mutating && session?.impersonated_by && session.readonly) return null;
    return session?.professional_id ?? null;
  } catch {
    return null;
  }
}

export async function saveWhatsAppSettingsAction(input: {
  uazapi_url: string;
  uazapi_token: string;
  bot_enabled: boolean;
  confirmation_enabled: boolean;
  bot_persona?: string;
  stop_keyword?: string;
  booking_url?: string;
  automation_booking_enabled?: boolean;
  automation_booking_message?: string;
  automation_booking_delay_minutes?: number;
  automation_day_before_enabled?: boolean;
  automation_day_before_message?: string;
  automation_day_before_time?: string;
  automation_day_of_enabled?: boolean;
  automation_day_of_message?: string;
  automation_day_of_time?: string;
  automation_5days_enabled?: boolean;
  automation_5days_message?: string;
  automation_5days_time?: string;
  automation_followup_enabled?: boolean;
  automation_followup_days?: number;
  automation_followup_message?: string;
  automation_followup_time?: string;
  bot_blocked_numbers?: string[];
  custom_variables?: Record<string, string>;
}) {
  try {
    const professionalId = await getProfessionalId();
    if (!professionalId) return { success: false, error: 'Sessão inválida. Faça login novamente.' };

    const settings = await dbService.upsertWhatsAppSettings(professionalId, {
      uazapi_url: input.uazapi_url.trim().replace(/\/$/, ''),
      uazapi_token: input.uazapi_token.trim(),
      bot_enabled: input.bot_enabled,
      confirmation_enabled: input.confirmation_enabled,
      bot_persona: input.bot_persona?.trim() || null,
      stop_keyword: input.stop_keyword?.trim() || '#humano',
      booking_url: input.booking_url?.trim() || null,
      automation_booking_enabled: input.automation_booking_enabled ?? false,
      automation_booking_message: input.automation_booking_message?.trim() || null,
      automation_booking_delay_minutes: input.automation_booking_delay_minutes ?? 1,
      automation_day_before_enabled: input.automation_day_before_enabled ?? false,
      automation_day_before_message: input.automation_day_before_message?.trim() || null,
      automation_day_before_time: input.automation_day_before_time || '10:00',
      automation_day_of_enabled: input.automation_day_of_enabled ?? false,
      automation_day_of_message: input.automation_day_of_message?.trim() || null,
      automation_day_of_time: input.automation_day_of_time || '08:00',
      automation_5days_enabled: input.automation_5days_enabled ?? false,
      automation_5days_message: input.automation_5days_message?.trim() || null,
      automation_5days_time: input.automation_5days_time || '10:00',
      automation_followup_enabled: input.automation_followup_enabled ?? false,
      automation_followup_days: input.automation_followup_days ?? 30,
      automation_followup_message: input.automation_followup_message?.trim() || null,
      automation_followup_time: input.automation_followup_time || '10:00',
      // Normaliza (só dígitos, DDI 55) e remove vazios/duplicados
      bot_blocked_numbers: Array.from(new Set((input.bot_blocked_numbers ?? []).map(normalizeWhatsapp).filter(Boolean))),
      custom_variables: input.custom_variables ?? {},
    });
    return { success: true as const, settings };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Erro ao salvar configurações.' };
  }
}

export async function setupWebhookAction() {
  try {
    const professionalId = await getProfessionalId();
    if (!professionalId) return { success: false, error: 'Sessão inválida. Faça login novamente.' };

    const waSettings = await dbService.getWhatsAppSettings(professionalId);
    if (!waSettings?.uazapi_url || !waSettings?.uazapi_token) {
      return { success: false, error: 'Configure e salve a URL e o token da uazapi primeiro.' };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl || appUrl.includes('SEU_APP')) {
      return { success: false, error: 'NEXT_PUBLIC_APP_URL não está configurado corretamente no Vercel.' };
    }

    const webhookUrl = `${appUrl}/api/whatsapp/webhook?pid=${professionalId}&secret=${waSettings.webhook_secret}`;
    const result = await configureUazapiWebhook(waSettings.uazapi_url, waSettings.uazapi_token, webhookUrl);
    console.log('[setupWebhook]', result.debug);

    if (!result.success) return { success: false, error: result.error };
    return { success: true as const, webhookUrl, debug: result.debug };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Erro ao ativar webhook.' };
  }
}

export async function getQRCodeAction() {
  try {
    const professionalId = await getProfessionalId();
    if (!professionalId) return { success: false as const, error: 'Sessão inválida. Faça login novamente.' };

    const waSettings = await dbService.getWhatsAppSettings(professionalId);
    if (!waSettings?.uazapi_url || !waSettings?.uazapi_token) {
      return { success: false as const, error: 'Configure e salve a URL e o token da uazapi primeiro.' };
    }

    const result = await getUazapiQRCode(waSettings.uazapi_url, waSettings.uazapi_token);
    console.log('[getQRCode]', result.debug);

    if (!result.success) {
      return { success: false as const, error: result.error, debug: result.debug };
    }
    return {
      success: true as const,
      qrcode: result.qrcode ?? null,
      paircode: result.paircode ?? null,
      alreadyConnected: result.alreadyConnected ?? false,
    };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Erro ao gerar QR Code.' };
  }
}

/**
 * Um clique só: garante que a profissional tem uma instância no servidor uazapi,
 * registra o webhook e devolve o QR Code para ela ler no celular.
 *
 * Se o servidor tem admintoken (UAZAPI_SERVER_URL + UAZAPI_ADMIN_TOKEN), a
 * instância é criada na hora — a profissional nunca vê URL nem token. Sem
 * admintoken, cai no fluxo antigo: alguém precisa ter salvo as credenciais.
 */
export async function connectWhatsAppAction() {
  try {
    const professionalId = await getProfessionalId();
    if (!professionalId) return { success: false as const, error: 'Sessão inválida. Faça login novamente.' };

    let waSettings = await dbService.getWhatsAppSettings(professionalId).catch(() => null);

    // 1. Sem credenciais? Cria a instância desta profissional no servidor.
    if (!waSettings?.uazapi_url || !waSettings?.uazapi_token) {
      if (!uazapiAdminConfigured()) {
        return { success: false as const, error: 'Configure e salve a URL e o token da uazapi primeiro.' };
      }

      const professional = await dbService.getProfessionalById(professionalId).catch(() => null);
      // Nome único no servidor: slug ajuda a reconhecer no painel da uazapi, e o
      // sufixo evita colisão com uma instância antiga de mesmo nome.
      const base = (professional?.slug || professional?.brand_name || 'lume')
        .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'lume';
      const instanceName = `${base}-${professionalId.slice(0, 8)}`;

      const created = await createUazapiInstance(instanceName, {
        adminField01: professionalId,
        adminField02: professional?.email || '',
      });
      if (!created.success) {
        console.error('[connectWhatsApp] falha ao criar instância:', created.error, created.debug ?? '');
        return { success: false as const, error: created.error, limitReached: created.limitReached ?? false };
      }

      waSettings = await dbService.upsertWhatsAppSettings(professionalId, {
        uazapi_url: created.url,
        uazapi_token: created.token,
      });
      console.log('[connectWhatsApp] instância criada:', instanceName);
    }

    // 2. Webhook: best-effort, não impede a conexão se falhar.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl && !appUrl.includes('SEU_APP') && waSettings.webhook_secret) {
      const webhookUrl = `${appUrl}/api/whatsapp/webhook?pid=${professionalId}&secret=${waSettings.webhook_secret}`;
      await configureUazapiWebhook(waSettings.uazapi_url, waSettings.uazapi_token, webhookUrl).catch(() => null);
    }

    // 3. QR Code para ler no celular.
    const result = await getUazapiQRCode(waSettings.uazapi_url, waSettings.uazapi_token);
    if (!result.success) return { success: false as const, error: result.error, debug: result.debug };

    return {
      success: true as const,
      qrcode: result.qrcode ?? null,
      paircode: result.paircode ?? null,
      alreadyConnected: result.alreadyConnected ?? false,
    };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Erro ao conectar o WhatsApp.' };
  }
}

export async function checkWhatsAppStatusAction() {
  try {
    const professionalId = await getProfessionalId();
    if (!professionalId) return { success: true, status: 'not_configured' as const };

    const waSettings = await dbService.getWhatsAppSettings(professionalId);
    if (!waSettings?.uazapi_url || !waSettings?.uazapi_token) {
      return { success: true, status: 'not_configured' as const };
    }

    const result = await checkUazapiStatus(waSettings.uazapi_url, waSettings.uazapi_token);
    return { success: true, status: result.status };
  } catch {
    return { success: true, status: 'error' as const };
  }
}

export async function sendTestMessageAction(phone: string) {
  try {
    const professionalId = await getProfessionalId();
    if (!professionalId) return { success: false, error: 'Não autenticado.' };

    const waSettings = await dbService.getWhatsAppSettings(professionalId);
    if (!waSettings?.uazapi_url || !waSettings?.uazapi_token) {
      return { success: false, error: 'Credenciais não configuradas.' };
    }

    // Limpa o número (remove tudo que não for dígito)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) return { success: false, error: 'Número inválido. Use formato: 5511999999999' };

    const sent = await sendWhatsAppText(
      waSettings.uazapi_url,
      waSettings.uazapi_token,
      cleanPhone,
      '✅ Teste do bot Lume — se você recebeu esta mensagem, o envio está funcionando!'
    );
    if (!sent) return { success: false, error: 'uazapi não enviou a mensagem. Verifique URL e token.' };
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Erro ao enviar.' };
  }
}

export async function diagnoseWhatsAppAction() {
  try {
    const professionalId = await getProfessionalId();
    if (!professionalId) return { ok: false, steps: [], error: 'Não autenticado.' };

    const steps: Array<{ label: string; ok: boolean; warn?: boolean; detail: string }> = [];

    // 1. Tabela e settings
    let waSettings = null;
    try {
      waSettings = await dbService.getWhatsAppSettings(professionalId);
      steps.push({ label: 'Tabela no banco', ok: true, detail: waSettings ? 'Configurações encontradas' : 'Tabela existe mas sem configurações — salve as credenciais' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      steps.push({ label: 'Tabela no banco', ok: false, detail: msg.includes('migration') ? 'Tabela não existe — rode supabase/migration_v8.sql no Supabase' : msg });
      return { ok: false, steps };
    }

    if (!waSettings) {
      steps.push({ label: 'Credenciais salvas', ok: false, detail: 'Preencha URL e token e clique em "Salvar configurações"' });
      return { ok: false, steps };
    }

    // 2. Credenciais
    const hasUrl = !!waSettings.uazapi_url;
    const hasToken = !!waSettings.uazapi_token;
    steps.push({ label: 'URL da instância', ok: hasUrl, detail: hasUrl ? waSettings.uazapi_url : 'URL não configurada' });
    steps.push({ label: 'Token', ok: hasToken, detail: hasToken ? '••••••••' + waSettings.uazapi_token.slice(-4) : 'Token não configurado' });
    if (!hasUrl || !hasToken) return { ok: false, steps };

    // 3. Status da instância (informativo)
    const { status } = await checkUazapiStatus(waSettings.uazapi_url, waSettings.uazapi_token);
    steps.push({
      label: 'Status da instância',
      ok: true,
      warn: status !== 'open',
      detail: status === 'open' ? 'Conectado (open)' : 'Não confirmado via API — se o WhatsApp está conectado no painel uazapi, ignore',
    });

    // 5. Webhook registrado na uazapi
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const expectedWebhook = appUrl && !appUrl.includes('SEU_APP')
      ? `${appUrl}/api/whatsapp/webhook?pid=${professionalId}&secret=${waSettings.webhook_secret}`
      : null;

    let registeredWebhook: string | null = null;
    let getWebhookRaw = '';
    try {
      const res = await fetch(`${waSettings.uazapi_url}/webhook`, {
        headers: { token: waSettings.uazapi_token },
        signal: AbortSignal.timeout(6000),
      });
      getWebhookRaw = `HTTP ${res.status}: `;
      const text = await res.text();
      getWebhookRaw += text.slice(0, 300);
      if (res.ok) {
        let parsed: unknown;
        try { parsed = JSON.parse(text); } catch { /* ignore */ }
        // uazapi retorna array de webhooks: [{ url, webhookUrl, enabled, ... }]
        const entry = Array.isArray(parsed)
          ? (parsed[0] as Record<string, unknown>)
          : (parsed as Record<string, unknown>);
        registeredWebhook = (
          entry?.url ?? entry?.webhookUrl ?? entry?.webhook ??
          (entry?.data as Record<string, unknown>)?.url
        ) as string | null;
        // URL vazia conta como não registrada
        if (!registeredWebhook) registeredWebhook = null;
      }
    } catch (e) {
      getWebhookRaw = e instanceof Error ? e.message : String(e);
    }

    if (!expectedWebhook) {
      steps.push({ label: 'NEXT_PUBLIC_APP_URL', ok: false, detail: 'Variável não configurada no Vercel' });
    } else if (!registeredWebhook) {
      steps.push({
        label: 'Webhook na uazapi',
        ok: false,
        detail: `Nenhum webhook detectado. Resposta raw: ${getWebhookRaw}`,
      });
    } else if (!registeredWebhook.includes(professionalId)) {
      steps.push({
        label: 'Webhook na uazapi',
        ok: false,
        detail: `URL errada: "${registeredWebhook.slice(0, 80)}" — clique em "Ativar webhook"`,
      });
    } else {
      steps.push({ label: 'Webhook na uazapi', ok: true, detail: `Registrado corretamente` });
    }

    const criticalOk = steps.filter((s) => !s.warn).every(s => s.ok);
    return { ok: criticalOk, steps };
  } catch (e: unknown) {
    return { ok: false, steps: [], error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}

export async function simulateIncomingMessageAction(testPhone: string) {
  try {
    const professionalId = await getProfessionalId();
    if (!professionalId) return { success: false, error: 'Não autenticado.' };

    const waSettings = await dbService.getWhatsAppSettings(professionalId);
    if (!waSettings?.uazapi_url || !waSettings?.uazapi_token) {
      return { success: false, error: 'Credenciais não configuradas.' };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) return { success: false, error: 'NEXT_PUBLIC_APP_URL não configurado.' };

    const cleanPhone = testPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) return { success: false, error: 'Número inválido. Use formato: 5511999999999' };

    const webhookUrl = `${appUrl}/api/whatsapp/webhook?pid=${professionalId}&secret=${waSettings.webhook_secret}`;

    const fakePayload = {
      EventType: 'messages',
      message: {
        chatid: `${cleanPhone}@s.whatsapp.net`,
        fromMe: false,
        isGroup: false,
        text: 'Olá, gostaria de agendar um horário',
        type: 'text',
        id: 'SIMULADO_' + Date.now(),
        messageid: 'SIMULADO_' + Date.now(),
      },
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fakePayload),
      signal: AbortSignal.timeout(20000),
    });

    return { success: res.ok, status: res.status };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Erro ao simular.' };
  }
}

export async function getConversationsAction() {
  try {
    const professionalId = await getProfessionalId();
    if (!professionalId) return [];
    return await dbService.getAllWhatsAppConversations(professionalId);
  } catch {
    return [];
  }
}

export async function getPendingConversationsAction() {
  try {
    const professionalId = await getProfessionalId();
    if (!professionalId) return [];
    return await dbService.getPausedConversations(professionalId);
  } catch {
    return [];
  }
}

export async function clearConversationsAction() {
  try {
    const professionalId = await getProfessionalId();
    if (!professionalId) return { success: false as const, error: 'Não autenticado.' };
    const deleted = await dbService.clearAllWhatsAppConversations(professionalId);
    return { success: true as const, deleted };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Erro ao apagar conversas.' };
  }
}

export async function toggleBotPauseAction(clientPhone: string, paused: boolean) {
  try {
    const professionalId = await getProfessionalId();
    if (!professionalId) return { success: false };
    await dbService.setBotPaused(professionalId, clientPhone, paused);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function getLastWebhookCallAction() {
  try {
    const professionalId = await getProfessionalId();
    if (!professionalId) return { receivedAt: null, payload: null };

    const conv = await dbService.getWhatsAppConversation(professionalId, '_debug_last_call');
    if (!conv || !Array.isArray(conv.messages) || conv.messages.length === 0) {
      return { receivedAt: null, payload: null };
    }
    const last = conv.messages[conv.messages.length - 1];
    return {
      receivedAt: last.at,
      payload: last.content,
    };
  } catch {
    return { receivedAt: null, payload: null };
  }
}

export async function getWebhookUrlAction() {
  try {
    const professionalId = await getProfessionalId();
    if (!professionalId) return { success: true, webhookUrl: null };

    const waSettings = await dbService.getWhatsAppSettings(professionalId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!waSettings || !appUrl || appUrl.includes('SEU_APP')) {
      return { success: true, webhookUrl: null };
    }

    const webhookUrl = `${appUrl}/api/whatsapp/webhook?pid=${professionalId}&secret=${waSettings.webhook_secret}`;
    return { success: true, webhookUrl };
  } catch {
    return { success: true, webhookUrl: null };
  }
}

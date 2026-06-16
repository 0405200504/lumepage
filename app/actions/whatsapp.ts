'use server';

import { authService } from '@/lib/auth/auth';
import { dbService } from '@/lib/supabase/db';
import { configureUazapiWebhook, checkUazapiStatus, sendWhatsAppText } from '@/lib/uazapi';

async function getProfessionalId(): Promise<string | null> {
  try {
    const session = await authService.getCurrentUser();
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

    if (!result.success) return { success: false, error: result.error };
    return { success: true as const, webhookUrl };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Erro ao ativar webhook.' };
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

    // 3. Bot ativado
    steps.push({ label: 'Bot ativado', ok: !!waSettings.bot_enabled, detail: waSettings.bot_enabled ? 'Ativo' : 'Desativado — ligue o toggle e salve' });

    // 4. Status da instância (informativo)
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
    try {
      const res = await fetch(`${waSettings.uazapi_url}/webhook`, {
        headers: { token: waSettings.uazapi_token },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const text = await res.text();
        let data: Record<string, unknown> = {};
        try { data = JSON.parse(text); } catch { /* ignore */ }
        registeredWebhook = (data?.webhookUrl ?? data?.url ?? data?.webhook) as string | null;
      }
    } catch { /* ignora erro de rede */ }

    if (!expectedWebhook) {
      steps.push({ label: 'NEXT_PUBLIC_APP_URL', ok: false, detail: 'Variável não configurada no Vercel' });
    } else if (!registeredWebhook) {
      steps.push({
        label: 'Webhook na uazapi',
        ok: false,
        detail: `Nenhum webhook registrado — clique em "Ativar webhook" para registrar`,
      });
    } else if (!registeredWebhook.includes(professionalId)) {
      steps.push({
        label: 'Webhook na uazapi',
        ok: false,
        detail: `URL errada registrada: "${registeredWebhook.slice(0, 80)}" — clique em "Ativar webhook" para corrigir`,
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

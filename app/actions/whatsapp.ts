'use server';

import { authService } from '@/lib/auth/auth';
import { dbService } from '@/lib/supabase/db';
import { configureUazapiWebhook, checkUazapiStatus } from '@/lib/uazapi';

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


export async function diagnoseWhatsAppAction() {
  try {
    const professionalId = await getProfessionalId();
    if (!professionalId) return { ok: false, steps: [], error: 'Não autenticado.' };

    const steps: Array<{ label: string; ok: boolean; warn?: boolean; detail: string }> = [];

    // 1. Tabela existe e settings carregam?
    let waSettings = null;
    try {
      waSettings = await dbService.getWhatsAppSettings(professionalId);
      steps.push({ label: 'Tabela whatsapp_settings', ok: true, detail: waSettings ? 'Configurações encontradas' : 'Tabela existe mas sem configurações (salve as credenciais)' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      steps.push({ label: 'Tabela whatsapp_settings', ok: false, detail: msg.includes('migration') ? 'Tabela não existe — rode supabase/migration_v8.sql no Supabase' : msg });
      return { ok: false, steps };
    }

    if (!waSettings) {
      steps.push({ label: 'Credenciais salvas', ok: false, detail: 'Preencha URL e token e clique em "Salvar configurações"' });
      return { ok: false, steps };
    }

    // 2. Credenciais preenchidas?
    const hasUrl = !!waSettings.uazapi_url;
    const hasToken = !!waSettings.uazapi_token;
    steps.push({ label: 'URL da instância', ok: hasUrl, detail: hasUrl ? waSettings.uazapi_url : 'URL não configurada' });
    steps.push({ label: 'Token da instância', ok: hasToken, detail: hasToken ? '••••••••' + waSettings.uazapi_token.slice(-4) : 'Token não configurado' });

    if (!hasUrl || !hasToken) return { ok: false, steps };

    // 3. Bot ativado?
    steps.push({ label: 'Bot ativado', ok: !!waSettings.bot_enabled, detail: waSettings.bot_enabled ? 'Ativo' : 'Desativado — ligue o toggle e salve' });

    // 4. Conexão com uazapi (informativo — não bloqueia o bot)
    const { checkUazapiStatus: check } = await import('@/lib/uazapi');
    const { status, rawJson } = await check(waSettings.uazapi_url, waSettings.uazapi_token);
    const isConnected = status === 'open';
    steps.push({
      label: 'Status da instância',
      ok: true,
      warn: !isConnected,
      detail: isConnected
        ? 'Conectado (open)'
        : `Não confirmado via API — se o WhatsApp está conectado no painel uazapi, ignore este aviso`,
    });

    // 5. Webhook URL gerada?
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const hasAppUrl = !!(appUrl && !appUrl.includes('SEU_APP'));
    steps.push({ label: 'NEXT_PUBLIC_APP_URL', ok: hasAppUrl, detail: hasAppUrl ? appUrl! : 'Variável não configurada no Vercel' });

    const criticalOk = steps.filter((_, i) => i !== 3).every(s => s.ok); // ignora o status check
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

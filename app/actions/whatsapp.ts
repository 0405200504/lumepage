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

    const status = await checkUazapiStatus(waSettings.uazapi_url, waSettings.uazapi_token);
    return { success: true, status };
  } catch {
    return { success: true, status: 'error' as const };
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

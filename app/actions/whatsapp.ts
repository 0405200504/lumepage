'use server';

import { authService } from '@/lib/auth/auth';
import { dbService } from '@/lib/supabase/db';
import { configureUazapiWebhook, checkUazapiStatus } from '@/lib/uazapi';

function requireProfessionalId(session: Awaited<ReturnType<typeof authService.getCurrentUser>>) {
  if (!session?.professional_id) throw new Error('Não autorizado.');
  return session.professional_id;
}

export async function getWhatsAppSettingsAction() {
  const session = await authService.getCurrentUser();
  const professionalId = requireProfessionalId(session);
  const settings = await dbService.getWhatsAppSettings(professionalId);
  return { success: true, settings };
}

export async function saveWhatsAppSettingsAction(input: {
  uazapi_url: string;
  uazapi_token: string;
  bot_enabled: boolean;
  confirmation_enabled: boolean;
  bot_persona?: string;
  stop_keyword?: string;
}) {
  const session = await authService.getCurrentUser();
  const professionalId = requireProfessionalId(session);

  try {
    const settings = await dbService.upsertWhatsAppSettings(professionalId, {
      uazapi_url: input.uazapi_url.trim().replace(/\/$/, ''),
      uazapi_token: input.uazapi_token.trim(),
      bot_enabled: input.bot_enabled,
      confirmation_enabled: input.confirmation_enabled,
      bot_persona: input.bot_persona?.trim() || null,
      stop_keyword: input.stop_keyword?.trim() || '#humano',
    });
    return { success: true, settings };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao salvar.' };
  }
}

export async function setupWebhookAction() {
  const session = await authService.getCurrentUser();
  const professionalId = requireProfessionalId(session);

  const waSettings = await dbService.getWhatsAppSettings(professionalId);
  if (!waSettings?.uazapi_url || !waSettings?.uazapi_token) {
    return { success: false, error: 'Configure a URL e o token da uazapi primeiro.' };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return { success: false, error: 'NEXT_PUBLIC_APP_URL não configurado no servidor.' };
  }

  const webhookUrl = `${appUrl}/api/whatsapp/webhook?pid=${professionalId}&secret=${waSettings.webhook_secret}`;
  const result = await configureUazapiWebhook(waSettings.uazapi_url, waSettings.uazapi_token, webhookUrl);

  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true, webhookUrl };
}

export async function checkWhatsAppStatusAction() {
  const session = await authService.getCurrentUser();
  const professionalId = requireProfessionalId(session);

  const waSettings = await dbService.getWhatsAppSettings(professionalId);
  if (!waSettings?.uazapi_url || !waSettings?.uazapi_token) {
    return { success: true, status: 'not_configured' as const };
  }

  const status = await checkUazapiStatus(waSettings.uazapi_url, waSettings.uazapi_token);
  return { success: true, status };
}

export async function getWebhookUrlAction() {
  const session = await authService.getCurrentUser();
  const professionalId = requireProfessionalId(session);

  const waSettings = await dbService.getWhatsAppSettings(professionalId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!waSettings || !appUrl) return { success: true, webhookUrl: null };

  const webhookUrl = `${appUrl}/api/whatsapp/webhook?pid=${professionalId}&secret=${waSettings.webhook_secret}`;
  return { success: true, webhookUrl };
}

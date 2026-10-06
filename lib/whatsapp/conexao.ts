/**
 * Conectar, conferir e desligar o WhatsApp de uma conta (instância uazapi).
 *
 * Quem chama já decidiu de quem é a conta: a aba WhatsApp da profissional
 * (sessão dela) ou o admin, para o número da Lume na conta interna das calls.
 * Só roda no servidor.
 */

import { dbService } from '@/lib/supabase/db';
import {
  configureUazapiWebhook, checkUazapiStatus, getUazapiQRCode,
  createUazapiInstance, uazapiAdminConfigured, disconnectUazapiInstance,
} from '@/lib/uazapi';

export type ResultadoConexao =
  | { success: true; qrcode: string | null; paircode: string | null; alreadyConnected: boolean; criada: boolean }
  | { success: false; error: string; limitReached?: boolean; debug?: string };

/**
 * Um passo só: garante a instância da conta no servidor uazapi, registra o
 * webhook e devolve o QR Code para ler no celular.
 *
 * Se o servidor tem admintoken (UAZAPI_SERVER_URL + UAZAPI_ADMIN_TOKEN), a
 * instância é criada na hora — ninguém vê URL nem token. Sem admintoken, cai
 * no fluxo antigo: alguém precisa ter salvo as credenciais.
 */
export async function conectarWhatsApp(professionalId: string): Promise<ResultadoConexao> {
  let waSettings = await dbService.getWhatsAppSettings(professionalId).catch(() => null);
  let criada = false;

  // 1. Sem credenciais? Cria a instância desta conta no servidor.
  if (!waSettings?.uazapi_url || !waSettings?.uazapi_token) {
    if (!uazapiAdminConfigured()) {
      return { success: false, error: 'Configure e salve a URL e o token da uazapi primeiro.' };
    }

    const professional = await dbService.getProfessionalById(professionalId).catch(() => null);
    // Nome único no servidor: slug ajuda a reconhecer no painel da uazapi, e o
    // sufixo evita colisão com uma instância antiga de mesmo nome.
    const base = (professional?.slug || professional?.brand_name || 'lume')
      .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'lume';
    const instanceName = `${base}-${professionalId.slice(0, 8)}`;

    const created = await createUazapiInstance(instanceName, {
      adminField01: professionalId,
      adminField02: professional?.email || '',
    });
    if (!created.success) {
      console.error('[conectarWhatsApp] falha ao criar instância:', created.error, created.debug ?? '');
      return { success: false, error: created.error ?? 'Não foi possível preparar o WhatsApp.', limitReached: created.limitReached ?? false };
    }

    waSettings = await dbService.upsertWhatsAppSettings(professionalId, {
      uazapi_url: created.url,
      uazapi_token: created.token,
    });
    criada = true;
    console.log('[conectarWhatsApp] instância criada:', instanceName);
  }

  // 2. Webhook: best-effort, não impede a conexão se falhar.
  await registrarWebhook(professionalId, waSettings).catch(() => null);

  // 3. QR Code para ler no celular.
  const result = await getUazapiQRCode(waSettings.uazapi_url, waSettings.uazapi_token);
  if (!result.success) return { success: false, error: result.error ?? 'Não foi possível gerar o QR Code.', debug: result.debug };

  return {
    success: true,
    qrcode: result.qrcode ?? null,
    paircode: result.paircode ?? null,
    alreadyConnected: result.alreadyConnected ?? false,
    criada,
  };
}

/** Aponta o webhook da instância para o Lume (mensagens recebidas, status). */
export async function registrarWebhook(
  professionalId: string,
  waSettings?: { uazapi_url: string; uazapi_token: string; webhook_secret?: string | null } | null,
): Promise<boolean> {
  const s = waSettings ?? await dbService.getWhatsAppSettings(professionalId).catch(() => null);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!s?.uazapi_url || !s.uazapi_token || !s.webhook_secret || !appUrl || appUrl.includes('SEU_APP')) return false;
  const webhookUrl = `${appUrl}/api/whatsapp/webhook?pid=${professionalId}&secret=${s.webhook_secret}`;
  const r = await configureUazapiWebhook(s.uazapi_url, s.uazapi_token, webhookUrl);
  return r.success;
}

/**
 * Desliga o número conectado sem apagar a instância ("trocar número"). A tela
 * vê o status cair e mostra o QR Code novo.
 */
export async function desconectarWhatsApp(professionalId: string): Promise<{ success: true } | { success: false; error: string }> {
  const waSettings = await dbService.getWhatsAppSettings(professionalId).catch(() => null);
  if (!waSettings?.uazapi_url || !waSettings?.uazapi_token) return { success: false, error: 'Nenhum número conectado.' };
  const ok = await disconnectUazapiInstance(waSettings.uazapi_url, waSettings.uazapi_token);
  return ok ? { success: true } : { success: false, error: 'Não foi possível desconectar agora. Tente de novo.' };
}

export type StatusWhatsApp = 'open' | 'connecting' | 'close' | 'qr' | 'error' | 'not_configured';

export async function statusWhatsApp(professionalId: string): Promise<StatusWhatsApp> {
  const waSettings = await dbService.getWhatsAppSettings(professionalId).catch(() => null);
  if (!waSettings?.uazapi_url || !waSettings?.uazapi_token) return 'not_configured';
  const result = await checkUazapiStatus(waSettings.uazapi_url, waSettings.uazapi_token).catch(() => ({ status: 'error' as const }));
  return result.status;
}

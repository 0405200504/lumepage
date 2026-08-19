'use server';

import { randomBytes } from 'crypto';
import { headers } from 'next/headers';
import { dbService } from '@/lib/supabase/db';
import { authorizeProfessional } from '@/lib/auth/authorize-professional';
import { isDemo } from '@/lib/demo';
import { rateLimit, ipFromHeaders } from '@/lib/rate-limit';
import { sendWhatsAppText, sendWhatsAppDocument } from '@/lib/uazapi';
import { normalizeWhatsapp, buildWhatsappLink } from '@/lib/whatsapp';
import type { AnamnesisQuestion, AnamnesisDesign, AnamnesisAnswer } from '@/types/database';

const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');

/** URL base pública do app: env NEXT_PUBLIC_APP_URL ou, na falta, o host da requisição. */
async function getAppUrl(): Promise<string> {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    if (host) return `${h.get('x-forwarded-proto') || 'https'}://${host}`;
  } catch { /* fora de contexto de request */ }
  return '';
}

/** Autorização compartilhada (admin, a própria profissional ou gerente do salão dela). */
const authorize = authorizeProfessional;

/** Sanitiza as perguntas vindas do builder (limites de tamanho e tipos válidos). */
function sanitizeQuestions(questions: AnamnesisQuestion[]): AnamnesisQuestion[] {
  const VALID_TYPES = new Set(['text', 'textarea', 'yesno', 'select', 'multiselect', 'date', 'number']);
  return (Array.isArray(questions) ? questions : [])
    .filter(q => q && typeof q.label === 'string' && q.label.trim() && VALID_TYPES.has(q.type))
    .slice(0, 60)
    .map(q => ({
      id: String(q.id || '').slice(0, 40) || `q-${Math.random().toString(36).slice(2, 10)}`,
      label: q.label.trim().slice(0, 400),
      type: q.type,
      required: !!q.required,
      options: ['select', 'multiselect'].includes(q.type)
        ? (q.options || []).map(o => String(o).trim().slice(0, 120)).filter(Boolean).slice(0, 20)
        : undefined,
    }));
}

function sanitizeDesign(design: AnamnesisDesign | undefined): AnamnesisDesign {
  const accent = /^#[0-9a-f]{6}$/i.test(design?.accent || '') ? design!.accent : '#8c2438';
  return { accent, showLogo: design?.showLogo !== false };
}

// ===================== MODELOS DE FICHA =====================

export async function createAnamnesisFormAction(professionalId: string, input: {
  title: string; description?: string; questions: AnamnesisQuestion[]; design?: AnamnesisDesign;
}) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    const title = (input.title || '').trim();
    if (!title) return { success: false, error: 'Dê um nome para a ficha.' };
    const questions = sanitizeQuestions(input.questions);
    if (questions.length === 0) return { success: false, error: 'Adicione pelo menos uma pergunta.' };

    const form = await dbService.createAnamnesisForm({
      professional_id: professionalId,
      title: title.slice(0, 120),
      description: input.description?.trim().slice(0, 500) || null,
      questions,
      design: sanitizeDesign(input.design),
    });
    return { success: true, form };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao criar a ficha.' };
  }
}

export async function updateAnamnesisFormAction(professionalId: string, formId: string, input: {
  title?: string; description?: string; questions?: AnamnesisQuestion[]; design?: AnamnesisDesign;
}) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) return { success: false, error: 'Dê um nome para a ficha.' };
      patch.title = title.slice(0, 120);
    }
    if (input.description !== undefined) patch.description = input.description.trim().slice(0, 500) || null;
    if (input.questions !== undefined) {
      const questions = sanitizeQuestions(input.questions);
      if (questions.length === 0) return { success: false, error: 'Adicione pelo menos uma pergunta.' };
      patch.questions = questions;
    }
    if (input.design !== undefined) patch.design = sanitizeDesign(input.design);
    const form = await dbService.updateAnamnesisForm(formId, professionalId, patch);
    return { success: true, form };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao salvar a ficha.' };
  }
}

export async function deleteAnamnesisFormAction(professionalId: string, formId: string) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    await dbService.deleteAnamnesisForm(formId, professionalId);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao excluir a ficha.' };
  }
}

// ===================== ENVIO PARA A CLIENTE =====================

/**
 * Gera o link único da ficha para uma cliente e tenta enviá-lo pelo WhatsApp
 * conectado (uazapi). Se o WhatsApp não estiver conectado, devolve o link
 * wa.me para a profissional mandar manualmente.
 */
export async function sendAnamnesisAction(professionalId: string, input: {
  formId: string;
  clientId?: string | null;
  clientName: string;
  clientWhatsapp: string;
}) {
  try {
    if (isDemo(professionalId)) return { success: false, error: 'Conta demo não envia fichas.' };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };

    const clientName = (input.clientName || '').trim();
    const whatsapp = onlyDigits(input.clientWhatsapp);
    if (!clientName) return { success: false, error: 'Informe o nome da cliente.' };
    if (whatsapp.length < 10) return { success: false, error: 'Informe um WhatsApp válido com DDD.' };

    const form = await dbService.getAnamnesisFormById(input.formId, professionalId);
    if (!form) return { success: false, error: 'Ficha não encontrada.' };

    // Token do link público: 32 chars base64url — não adivinhável
    const token = randomBytes(24).toString('base64url');

    const response = await dbService.createAnamnesisResponse({
      form_id: form.id,
      professional_id: professionalId,
      client_id: input.clientId || null,
      client_name: clientName,
      client_whatsapp: whatsapp,
      token,
      status: 'pending',
      questions_snapshot: form.questions,
      design_snapshot: form.design,
      form_title: form.title,
      answers: [],
      signature: null,
      pdf_sent_at: null,
      completed_at: null,
    });

    const appUrl = await getAppUrl();
    const link = appUrl ? `${appUrl}/ficha/${token}` : `/ficha/${token}`;

    const professional = await dbService.getProfessionalById(professionalId);
    const brand = professional?.brand_name || professional?.name || 'sua profissional';
    const firstName = clientName.split(' ')[0];
    const message =
      `Oi, ${firstName}! 💛 Aqui é ${brand}.\n\n` +
      `Para o seu atendimento ficar ainda mais seguro e personalizado, preencha a sua ficha de anamnese "${form.title}" neste link:\n\n${link}\n\n` +
      `Leva só alguns minutinhos. Qualquer dúvida, me chame por aqui!`;

    // Tenta enviar pelo WhatsApp conectado (uazapi)
    let sentViaBot = false;
    if (appUrl) {
      const settings = await dbService.getWhatsAppSettings(professionalId);
      if (settings?.uazapi_url && settings?.uazapi_token) {
        sentViaBot = await sendWhatsAppText(
          settings.uazapi_url, settings.uazapi_token,
          normalizeWhatsapp(whatsapp), message
        );
      }
    }

    return {
      success: true,
      responseId: response.id,
      link,
      sentViaBot,
      waLink: buildWhatsappLink(whatsapp, message),
    };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao gerar o link da ficha.' };
  }
}

export async function deleteAnamnesisResponseAction(professionalId: string, responseId: string) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    await dbService.deleteAnamnesisResponse(responseId, professionalId);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao excluir a resposta.' };
  }
}

// ===================== PREENCHIMENTO PÚBLICO (CLIENTE) =====================

/**
 * Recebe as respostas da cliente (página pública /ficha/[token]).
 * Ao concluir, envia automaticamente o PDF da ficha para o WhatsApp da
 * cliente pelo número conectado da profissional (best-effort).
 */
export async function submitAnamnesisAction(token: string, input: {
  answers: AnamnesisAnswer[];
  signature?: string;
  clientName?: string;
}) {
  try {
    // Rate limit por IP: página pública
    const ip = ipFromHeaders(await headers());
    const rl = await rateLimit(`anamnesis:${ip}`, 10, 10 * 60 * 1000);
    if (!rl.ok) return { success: false, error: `Muitas tentativas. Aguarde ${rl.retryAfterSeconds}s e tente de novo.` };

    if (!token || token.length < 16) return { success: false, error: 'Link inválido.' };
    const existing = await dbService.getAnamnesisResponseByToken(token);
    if (!existing) return { success: false, error: 'Esta ficha não existe ou foi removida.' };
    if (existing.status === 'completed') return { success: false, error: 'Esta ficha já foi preenchida.' };

    // Valida obrigatórias e mantém só respostas de perguntas existentes
    const questionById = new Map(existing.questions_snapshot.map(q => [q.id, q]));
    const clean: AnamnesisAnswer[] = [];
    for (const a of Array.isArray(input.answers) ? input.answers : []) {
      const q = questionById.get(a?.questionId);
      if (!q) continue;
      const answer = Array.isArray(a.answer)
        ? a.answer.map(v => String(v).slice(0, 300)).slice(0, 20)
        : String(a.answer ?? '').slice(0, 4000);
      clean.push({ questionId: q.id, answer });
    }
    const answered = new Map(clean.map(a => [a.questionId, a.answer]));
    for (const q of existing.questions_snapshot) {
      if (!q.required) continue;
      const v = answered.get(q.id);
      const empty = v === undefined || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0);
      if (empty) return { success: false, error: `Responda a pergunta obrigatória: "${q.label}"` };
    }

    const signature = (input.signature || '').trim().slice(0, 120) || null;
    const clientName = (input.clientName || '').trim().slice(0, 120) || undefined;

    const completed = await dbService.completeAnamnesisResponse(token, clean, signature, clientName);
    if (!completed) return { success: false, error: 'Esta ficha já foi preenchida.' };

    // Envio automático do PDF no WhatsApp da cliente (best-effort — não
    // bloqueia a confirmação na tela se o WhatsApp não estiver conectado).
    let pdfSentToClient = false;
    try {
      const appUrl = await getAppUrl();
      const settings = await dbService.getWhatsAppSettings(completed.professional_id);
      if (appUrl && settings?.uazapi_url && settings?.uazapi_token && completed.client_whatsapp) {
        const phone = normalizeWhatsapp(completed.client_whatsapp);
        const pdfUrl = `${appUrl}/api/anamnese/${token}/pdf`;
        const firstName = (completed.client_name || '').split(' ')[0] || 'tudo certo';
        pdfSentToClient = await sendWhatsAppDocument(
          settings.uazapi_url, settings.uazapi_token, phone,
          pdfUrl, `ficha-anamnese-${firstName.toLowerCase()}.pdf`,
          `Prontinho, ${firstName}! ✅ Sua ficha "${completed.form_title}" foi recebida com sucesso. Segue uma cópia em PDF para você guardar. 💛`
        );
        if (pdfSentToClient) await dbService.markAnamnesisPdfSent(completed.id);
      }
    } catch (e) {
      console.error('[anamnesis] Falha ao enviar PDF no WhatsApp:', e);
    }

    return { success: true, pdfSentToClient };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao enviar as respostas.' };
  }
}

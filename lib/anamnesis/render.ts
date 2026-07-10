import { dbService } from '@/lib/supabase/db';
import { generateAnamnesisPdf } from '@/lib/anamnesis/pdf';
import type { AnamnesisResponse } from '@/types/database';

/**
 * Monta os bytes do PDF de uma resposta de anamnese (server-only).
 * Usado pela rota /api/anamnese/[token]/pdf e pelo envio automático no WhatsApp.
 */

/** Pares pergunta/resposta legíveis, na ordem do snapshot. */
function buildPdfItems(response: AnamnesisResponse): Array<{ question: string; answer: string }> {
  const byId = new Map(response.answers.map(a => [a.questionId, a.answer]));
  return response.questions_snapshot.map(q => {
    const raw = byId.get(q.id);
    const answer = Array.isArray(raw) ? raw.join(', ') : (raw ?? '');
    return { question: q.label, answer: String(answer) };
  });
}

/** Data/hora legível em pt-BR no fuso de Brasília. */
function formatDateTimeBR(iso: string | null): string {
  if (!iso) return '';
  const dt = new Date(iso);
  const date = dt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const time = dt.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  return `${date} às ${time}`;
}

export async function buildAnamnesisPdfBytes(response: AnamnesisResponse): Promise<Uint8Array> {
  const professional = await dbService.getProfessionalById(response.professional_id);
  return generateAnamnesisPdf({
    brandName: professional?.brand_name || professional?.name || 'Lume Agenda',
    formTitle: response.form_title,
    clientName: response.client_name,
    clientWhatsapp: response.client_whatsapp,
    completedAtLabel: formatDateTimeBR(response.completed_at),
    accent: response.design_snapshot?.accent || '#8c2438',
    items: buildPdfItems(response),
    signature: response.signature,
  });
}

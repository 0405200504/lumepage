/**
 * Boas-vindas da conta (/bem-vinda).
 *
 * Quem se cadastra pelo formulário informa nome, negócio e WhatsApp de uma vez.
 * Quem entra com o Google não passa por nada disso: a conta nasce com o nome do
 * perfil Google, sem WhatsApp e com um endereço público gerado. Sem esses dados
 * a agenda pública não serve para nada (nem confirmação, nem lembrete).
 *
 * `onboarding_completed_at` (migração v38) marca quem já completou. Enquanto for
 * NULL, o painel manda a pessoa para /bem-vinda.
 */

import { Professional } from '@/types/database';
import { dbService } from '@/lib/supabase/db';
import { isDemo } from '@/lib/demo';

/** Slug a partir de um nome: minúsculo, sem acento, separado por hífen. */
export function slugify(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Primeiro endereço público livre a partir do nome ("maria", "maria-2"…).
 * Só um chute inicial — a pessoa troca na tela de boas-vindas.
 */
export async function slugLivre(nome: string, professionalId: string): Promise<string> {
  const base = slugify(nome) || 'lume';
  for (let i = 0; i < 8; i++) {
    const tentativa = i === 0 ? base : `${base}-${i + 1}`;
    try {
      if (!await dbService.isSlugTaken(tentativa, professionalId)) return tentativa;
    } catch {
      break; // banco indisponível: cai no sufixo aleatório, que não colide
    }
  }
  return `${base}-${professionalId.slice(0, 4)}`;
}

/**
 * A conta ainda precisa passar pelas boas-vindas?
 *
 * Tolerante à migração v38 ausente: sem a coluna o campo vem `undefined`, e aí
 * usamos o WhatsApp como sinal — assim nenhuma conta antiga completa é jogada
 * na tela de boas-vindas sem motivo.
 */
export function professionalPrecisaOnboarding(prof: Pick<Professional, 'whatsapp'> & { id?: string; onboarding_completed_at?: string | null }): boolean {
  if (isDemo(prof.id)) return false;
  if (prof.onboarding_completed_at === undefined) return !prof.whatsapp?.trim();
  return prof.onboarding_completed_at === null;
}

/** Igual à anterior, buscando a profissional pelo id. */
export async function precisaOnboarding(professionalId: string): Promise<boolean> {
  if (isDemo(professionalId)) return false;
  try {
    const prof = await dbService.getProfessionalById(professionalId);
    if (!prof) return false;
    return professionalPrecisaOnboarding(prof);
  } catch {
    return false; // na dúvida, não barra o acesso ao painel
  }
}

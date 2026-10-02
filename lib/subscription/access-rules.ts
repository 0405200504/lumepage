/**
 * QUEM PODE USAR O PAINEL AGORA — regra única
 * -------------------------------------------
 * Antes, só o layout do painel decidia isso, e só para dois casos (teste
 * vencido e plano ativo vencido). Assinatura cancelada ou reembolsada pela
 * Hubla (`subscription_status = 'canceled'`), cobrança recusada sem pagamento
 * depois (`past_due`) e conta pausada/encerrada pelo admin passavam direto —
 * e as server actions nunca conferiam nada: bastava apagar o paywall no
 * navegador para continuar usando.
 *
 * Agora o layout (o que ela vê), as actions (o que ela consegue fazer) e as
 * rotas de IA (o que custa dinheiro) perguntam aqui. Puro: sem banco, dá
 * para testar com um objeto solto.
 */

import { isLegacyAccount } from './entitlements';
import { isDemo } from '@/lib/demo';

export type AccessBlock =
  /** teste grátis de 7 dias terminou sem assinatura */
  | 'trial_ended'
  /** plano pago passou do vencimento (renovação não chegou) */
  | 'plan_expired'
  /** assinatura encerrada na Hubla: cancelamento ou reembolso */
  | 'subscription_ended'
  /** decisão operacional do admin */
  | 'paused'
  | 'cancelled';

export interface AccessInput {
  id?: string | null;
  status?: string | null;
  created_at?: string | null;
  subscription_status?: string | null;
  subscription_ends_at?: string | null;
  trial_ends_at?: string | null;
}

const passou = (iso: string | null | undefined, now: Date) =>
  !!iso && now.getTime() > new Date(iso).getTime();

/**
 * Motivo do bloqueio, ou null se a conta pode usar o painel.
 *
 * Ordem: decisão do admin (vale para qualquer conta, inclusive legada) →
 * conta legada passa → assinatura encerrada → prazo vencido.
 *
 *  - trialing: vence em trial_ends_at.
 *  - active:   vence só se o admin/webhook gravou subscription_ends_at
 *              (ativa "sem vencimento" é acesso cheio, como sempre foi).
 *  - past_due: a Hubla não conseguiu cobrar. O acesso segue até o vencimento
 *              já gravado; sem vencimento gravado (primeira cobrança de quem
 *              estava em teste), vale o fim do teste.
 *  - canceled: cancelamento/reembolso → paywall na hora.
 */
export function accessBlockFor(prof: AccessInput, now: Date = new Date()): AccessBlock | null {
  if (isDemo(prof.id)) return null;

  if (prof.status === 'cancelled') return 'cancelled';
  if (prof.status === 'paused') return 'paused';

  if (isLegacyAccount(prof.created_at)) return null;

  const s = prof.subscription_status;
  if (s === 'canceled') return 'subscription_ended';
  if (s === 'trialing') return passou(prof.trial_ends_at, now) ? 'trial_ended' : null;
  if (s === 'active') return passou(prof.subscription_ends_at, now) ? 'plan_expired' : null;
  if (s === 'past_due') {
    return passou(prof.subscription_ends_at || prof.trial_ends_at, now) ? 'plan_expired' : null;
  }
  return null;
}

/** Mensagem curta para respostas de API (chat, voz, transcrição). */
export const ACCESS_BLOCK_MESSAGE: Record<AccessBlock, string> = {
  trial_ended: 'Seu teste grátis acabou. Assine um plano para continuar.',
  plan_expired: 'Seu plano venceu. Renove para continuar.',
  subscription_ended: 'Sua assinatura foi encerrada. Assine de novo para continuar.',
  paused: 'Esta conta está pausada. Fale com o suporte.',
  cancelled: 'Esta conta foi encerrada. Fale com o suporte.',
};

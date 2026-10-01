/**
 * Aplicar uma compra da Hubla numa conta — o MESMO caminho para os três lugares
 * que liberam plano: o webhook (conta achada na hora), o admin (conciliação
 * manual) e o cadastro (compra órfã vinculada quando a dona cria a conta).
 *
 * Antes cada um tinha a sua cópia da regra de plano/ciclo/vencimento; uma
 * mudança no webhook não chegava na conciliação. Aqui só mora a escrita no
 * banco — quem chama decide e-mail, log e resposta.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { matchPlan, accessEndsAt, type HublaEvent, type HublaPlanMatch } from './hubla';

export type ActivationTarget = {
  id: string;
  subscription_plan: string | null;
  subscription_status: string | null;
  hubla_subscription_id: string | null;
};

export type ActivationResult = {
  plan: string;
  months: number;
  endsAt: string;
  /** null = oferta fora do de-para (lib/lp/site.ts) — o plano anterior foi mantido */
  match: HublaPlanMatch | null;
  /** a conta já estava neste plano e nesta assinatura (evento repetido da mesma venda) */
  wasActive: boolean;
};

export const PROFESSIONAL_SUBSCRIPTION_COLS =
  'id, subscription_plan, subscription_status, subscription_ends_at, hubla_subscription_id';

/**
 * Libera o acesso. `via` entra no histórico ("conciliado por fulano",
 * "vínculo automático no cadastro"); `changedBy` é quem assina a linha.
 */
export async function applyActivation(
  db: SupabaseClient,
  prof: ActivationTarget,
  event: HublaEvent,
  { via, changedBy }: { via?: string; changedBy: string },
): Promise<ActivationResult> {
  const match = matchPlan(event.offerIds);
  // Ciclo real da assinatura tem prioridade sobre o do link (cobre upgrade,
  // cupom e mudança de oferta feitas direto no painel da Hubla).
  const months = event.billingCycleMonths || match?.months || 1;
  // Sem de-para, NÃO inventamos plano: liberamos o acesso mantendo o que a
  // conta já tinha (ou Start). Dar Premium por engano é pior que dar pouco.
  const plan = match?.plan ?? prof.subscription_plan ?? 'start';
  const endsAt = accessEndsAt(months);

  const patch: Record<string, unknown> = {
    subscription_status: 'active',
    subscription_plan: plan,
    subscription_ends_at: endsAt,
  };
  if (event.subscriptionId) patch.hubla_subscription_id = event.subscriptionId;

  // Os três eventos de liberação (pagamento, assinatura ativada, acesso
  // concedido) chegam pela MESMA compra — quem chama usa isto para não mandar
  // três e-mails de parabéns.
  const wasActive =
    prof.subscription_status === 'active' &&
    prof.subscription_plan === plan &&
    prof.hubla_subscription_id === event.subscriptionId;

  const { error } = await db.from('professionals').update(patch).eq('id', prof.id);
  if (error) throw error;

  await recordSubscriptionEvent(db, prof.id, {
    plan,
    status: 'active',
    endsAt,
    note: [
      `Hubla · ${event.type}`,
      match ? `checkout ${match.checkoutId}` : 'oferta não mapeada',
      `${months}m`,
      via,
    ].filter(Boolean).join(' · '),
    changedBy,
  });

  return { plan, months, endsAt, match, wasActive };
}

/** Histórico que o admin já lê (migration v33). Best-effort. */
export async function recordSubscriptionEvent(
  db: SupabaseClient,
  professionalId: string,
  { plan, status, endsAt, note, changedBy }: {
    plan: string | null; status: string; endsAt: string | null; note: string; changedBy: string;
  },
) {
  const { error } = await db.from('subscription_events').insert({
    professional_id: professionalId,
    plan_key: plan,
    status,
    current_period_end: endsAt,
    note,
    changed_by: changedBy,
  });
  if (error && error.code !== '42P01') {
    console.warn('[hubla] Histórico não registrado:', error.message);
  }
}

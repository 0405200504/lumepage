import { isLegacyAccount } from '@/lib/subscription/entitlements';

/**
 * MÁQUINA DE ESTADOS DA CONTA — fonte única
 * -----------------------------------------
 * O painel dizia duas coisas ao mesmo tempo sobre a mesma conta: a faixa de atenção
 * contava "13 conta(s) ativa(s) com acesso já vencido" e o selo da linha dizia
 * "Ativa". Não era um bug de texto: eram DOIS campos independentes sendo lidos por
 * telas diferentes — `professionals.status` (ativa/pausada/cancelada, decisão
 * operacional) e `subscription_status` + prazo (situação comercial).
 *
 * Aqui os dois viram um estado só, com precedência explícita. Todo selo, filtro e
 * contagem do admin deve derivar DESTA função — nunca de um dos campos crus.
 *
 * Precedência (o primeiro que casar vence):
 *   1. cancelada   — decisão operacional ou assinatura cancelada
 *   2. pausada     — decisão operacional
 *   3. vencida     — o prazo de acesso já passou (inclui inadimplente)
 *   4. em teste    — trial ainda válido
 *   5. legada      — conta anterior ao marco de planos: acesso cheio sem assinatura
 *   6. ativa       — pagando e em dia
 */

export type AccountState = 'cancelled' | 'paused' | 'expired' | 'trialing' | 'legacy' | 'active';

export interface AccountStateInput {
  status?: string | null;
  subscription_status?: string | null;
  subscription_plan?: string | null;
  subscription_ends_at?: string | null;
  trial_ends_at?: string | null;
  created_at?: string | null;
}

export interface AccountStateResult {
  state: AccountState;
  /** Rótulo curto do estado — é o único selo que ganha cor. */
  label: string;
  tone: 'ok' | 'warn' | 'bad' | 'neutral';
  /** Prazo relevante deste estado (vencimento ou fim do teste). */
  deadline: string | null;
  /** Dias até o prazo. Negativo = já venceu. null = sem prazo. */
  days: number | null;
  /** Texto secundário do prazo, sem cor: "41d vencida", "vence em 6d". */
  deadlineLabel: string | null;
  /** Rótulo do plano — informação separada do estado, em selo neutro. */
  planLabel: string;
  /** Pode usar o produto agora? */
  hasAccess: boolean;
}

const PLAN_LABEL: Record<string, string> = { start: 'Start', pro: 'Pro', premium: 'Premium' };

export function accountState(p: AccountStateInput, now = new Date()): AccountStateResult {
  const planLabel = p.subscription_plan ? PLAN_LABEL[p.subscription_plan] ?? p.subscription_plan : 'Legada';

  const deadline = p.subscription_ends_at || p.trial_ends_at || null;
  const days = deadline ? Math.ceil((new Date(deadline).getTime() - now.getTime()) / 86_400_000) : null;
  const legacy = isLegacyAccount(p.created_at);

  const base = { deadline, days, planLabel };

  const deadlineLabel = (state: AccountState): string | null => {
    if (days === null) return null;
    if (state === 'expired') return `${Math.abs(days)}d vencida`;
    if (state === 'trialing') return days >= 0 ? `${days}d de teste` : 'teste encerrado';
    if (days >= 0 && days <= 30) return `vence em ${days}d`;
    return null;
  };

  const build = (state: AccountState, label: string, tone: AccountStateResult['tone'], hasAccess: boolean): AccountStateResult =>
    ({ ...base, state, label, tone, hasAccess, deadlineLabel: deadlineLabel(state) });

  if (p.status === 'cancelled' || p.subscription_status === 'canceled') {
    return build('cancelled', 'Cancelada', 'bad', false);
  }
  if (p.status === 'paused') {
    return build('paused', 'Pausada', 'warn', false);
  }
  // Legada nunca vence: ela não tem assinatura para vencer. Vem antes do prazo
  // justamente porque um trial_ends_at herdado do cadastro não deve marcá-la.
  if (legacy && !p.subscription_plan) {
    return build('legacy', 'Ativa', 'ok', true);
  }
  if (p.subscription_status === 'past_due') {
    return build('expired', 'Inadimplente', 'bad', false);
  }
  if (days !== null && days < 0) {
    return build('expired', 'Vencida', 'bad', false);
  }
  if (p.subscription_status === 'trialing') {
    return build('trialing', 'Em teste', days !== null && days <= 3 ? 'warn' : 'ok', true);
  }
  return build('active', 'Ativa', 'ok', true);
}

/** Quais estados contam como "conta em uso" nos totais do admin. */
export const ACTIVE_STATES: AccountState[] = ['active', 'trialing', 'legacy'];

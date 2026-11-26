/**
 * Estado do monitor de saúde do WhatsApp, por profissional.
 *
 * Fica na própria whatsapp_conversations (sem migração), numa linha com
 * `client_phone` de prefixo `_debug_` — que a lista de conversas do painel
 * já filtra. Quem grava é lib/whatsapp/health.ts; o admin só lê (alertas).
 */

export const HEALTH_KEY = '_debug_health_state';

/**
 * `server_limit`: o servidor uazapi recusa conexões por falta de vaga no plano
 * (HTTP 429). Não é a profissional que resolve — é a assinatura do servidor.
 * `waking`: a sessão estava pausada e o pedido de reconexão acabou de sair.
 */
export type HealthProblem = 'disconnected' | 'webhook_failed' | 'server_limit' | 'waking';

export interface HealthState {
  status: HealthProblem | 'ok' | string;
  alertedAt: number;
  reassertAt: number;
  /** Rodadas seguidas em que o servidor não respondeu ao status. */
  errors?: number;
}

/** Lê o estado gravado na coluna `messages` da linha de saúde. */
export function parseHealthState(messages: unknown): HealthState {
  try {
    const last = Array.isArray(messages) ? messages[messages.length - 1] : null;
    const raw = (last as { content?: unknown } | null)?.content;
    if (typeof raw === 'string' && raw) {
      const parsed = JSON.parse(raw) as Partial<HealthState>;
      return {
        status: parsed.status || 'ok',
        alertedAt: parsed.alertedAt || 0,
        reassertAt: parsed.reassertAt || 0,
        errors: parsed.errors || 0,
      };
    }
  } catch { /* estado novo */ }
  return { status: 'ok', alertedAt: 0, reassertAt: 0, errors: 0 };
}

/** Re-avisa o mesmo problema a cada 6 h — só os que ela consegue resolver. */
export const REALERT_MS = 6 * 60 * 60 * 1000;

export interface HealthReading {
  connected: boolean;
  /** O servidor pausou a sessão; a reconexão já foi pedida nesta rodada. */
  hibernated: boolean;
  /** O servidor recusou a reconexão por falta de vaga. */
  serverFull: boolean;
  /** Webhook no ar (ou recadastrado agora). Só importa com a instância conectada. */
  webhookOk: boolean;
}

/**
 * O que a rodada do monitor conclui e se manda notificação à profissional.
 * Função pura — as regras:
 *  - `server_limit` avisa UMA vez: não é com ela, repetir só incomoda;
 *  - `waking` não avisa: a reconexão acabou de ser pedida. Se na rodada
 *    seguinte a sessão continuar pausada, vira `disconnected`;
 *  - os demais avisam ao aparecer e de novo a cada 6 h;
 *  - voltou ao normal: avisa só se ela tinha sido avisada do problema.
 */
export function decideHealthAlert(
  reading: HealthReading,
  state: Pick<HealthState, 'status' | 'alertedAt'>,
  now: number,
): { problem: HealthProblem | null; push: Exclude<HealthProblem, 'waking'> | 'recovered' | null; alertedAt: number } {
  const alertedAt = state.alertedAt || 0;

  const problem: HealthProblem | null = reading.connected
    ? (reading.webhookOk ? null : 'webhook_failed')
    : reading.serverFull
      ? 'server_limit'
      : (reading.hibernated && state.status !== 'waking' && state.status !== 'disconnected')
        ? 'waking'
        : 'disconnected';

  if (problem === 'waking') return { problem, push: null, alertedAt };

  if (problem) {
    const changed = state.status !== problem;
    const stale = problem !== 'server_limit' && now - alertedAt > REALERT_MS;
    return changed || stale ? { problem, push: problem, alertedAt: now } : { problem, push: null, alertedAt };
  }

  const wasAlerted = alertedAt > 0 || (!!state.status && state.status !== 'ok' && state.status !== 'waking');
  return { problem: null, push: wasAlerted ? 'recovered' : null, alertedAt: 0 };
}

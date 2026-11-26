import { getSupabaseAdmin } from '@/lib/supabase/client';

/**
 * Agendador das automações pelo próprio banco (migração v49).
 *
 * As mensagens automáticas só saem quando alguém chama /api/cron/reminders.
 * Quem chamava era o agendamento do GitHub Actions ("a cada 5 minutos"), que
 * na prática rodava 2 ou 3 vezes por dia: o lembrete das 06:00 saía com 3 h
 * de atraso na mediana. A v49 põe o pg_cron do Supabase para chamar, com um
 * segredo gerado no banco — o mesmo esquema da guarda da voz (v43).
 *
 * A tabela `lume_cron` guarda, por job: o segredo, a trava que impede duas
 * rodadas simultâneas (pg_cron + GitHub mandariam a mesma mensagem duas vezes)
 * e a hora da última rodada, que o admin usa para avisar quando parar.
 *
 * Tudo aqui tolera a migração ainda não aplicada: sem a tabela, só o
 * CRON_SECRET aciona a rota e não há trava — o comportamento de antes.
 */

export const CRON_TABLE = 'lume_cron';
export const REMINDERS_JOB = 'reminders';

/** O job roda a cada 5 min. Passou disto sem rodar, as mensagens estão paradas. */
export const CRON_STALE_MS = 20 * 60_000;

/** Uma rodada leva no máximo 60 s (maxDuration da rota). A trava dura um pouco mais. */
const LOCK_MS = 90_000;

/** Segredo que o job do banco manda. `null`: migração v49 ainda não aplicada. */
export async function getCronToken(name: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin.from(CRON_TABLE).select('token').eq('name', name).maybeSingle();
  if (error) return null;
  return (data?.token as string | undefined) || null;
}

/**
 * `claimed`: a rodada é sua. `busy`: outra está em andamento — não rode.
 * `unavailable`: sem a tabela (ou sem a linha do job) não há como travar; rode
 * como sempre rodou.
 */
export type CronClaim = 'claimed' | 'busy' | 'unavailable';

/**
 * Reserva a rodada. É um UPDATE condicionado a `locked_until < agora`: se duas
 * chamadas chegam juntas, o Postgres deixa só uma alterar a linha.
 */
export async function claimCronRun(name: string, now: Date = new Date()): Promise<CronClaim> {
  const admin = getSupabaseAdmin();
  if (!admin) return 'unavailable';

  const { data, error } = await admin.from(CRON_TABLE)
    .update({ locked_until: new Date(now.getTime() + LOCK_MS).toISOString(), last_run_at: now.toISOString() })
    .eq('name', name)
    .lt('locked_until', now.toISOString())
    .select('name');
  if (error) return 'unavailable';
  if (data?.length) return 'claimed';

  // Nada mudou: ou a trava está com outra rodada, ou a linha do job não existe.
  const { data: row, error: readError } = await admin.from(CRON_TABLE).select('name').eq('name', name).maybeSingle();
  return !readError && row ? 'busy' : 'unavailable';
}

/** Há quanto tempo (ms) o job não roda. `null`: não dá para saber (sem a v49). */
export async function cronSilenceMs(name: string, now: Date = new Date()): Promise<number | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin.from(CRON_TABLE).select('last_run_at, created_at').eq('name', name).maybeSingle();
  if (error || !data) return null;
  // Nunca rodou: conta a partir de quando o job foi criado.
  const since = (data.last_run_at as string | null) ?? (data.created_at as string | null);
  return since ? Math.max(0, now.getTime() - new Date(since).getTime()) : null;
}

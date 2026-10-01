import { dbService } from '@/lib/supabase/db';
import { appointmentRevenueCents, indexServices } from '@/lib/finance';
import { isDemo } from '@/lib/demo';
import { dailyRevenuePush, weeklyRevenuePush } from './messages';
import { pushConfigured, pushToProfessional } from './send';

/** A partir desta hora (Brasília) sai o resumo do dia. */
export const DIGEST_HOUR = 21;

const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * "Parabéns, Fulana! Hoje você faturou R$ X" — e, no sábado, também o da
 * semana (domingo a sábado). Roda dentro do cron de 5 em 5 min: a primeira
 * passada depois das 21h envia, as outras veem a reserva em `push_digests`
 * (migração v44) e ficam quietas. Dia sem faturamento não manda nada.
 *
 * Faturamento = confirmados + concluídos pela data, a mesma regra da Início.
 */
export async function sendRevenueDigests(nowBR: Date): Promise<{ sent: number }> {
  if (nowBR.getHours() < DIGEST_HOUR || !pushConfigured()) return { sent: 0 };

  const todayISO = isoOf(nowBR);
  const sent = await dbService.getPushDigestsSent(todayISO);
  if (!sent) return { sent: 0 }; // sem a migração v44 não há como evitar envio repetido

  const kinds: Array<'day' | 'week'> = nowBR.getDay() === 6 ? ['day', 'week'] : ['day'];
  const sunday = new Date(nowBR);
  sunday.setDate(sunday.getDate() - nowBR.getDay());
  const weekStartISO = isoOf(sunday);

  let count = 0;
  for (const professionalId of await dbService.getProfessionalIdsWithPush()) {
    const pending = kinds.filter(k => !sent.has(`${professionalId}:${k}`));
    if (!pending.length || isDemo(professionalId)) continue;

    try {
      const [professional, appointments, services] = await Promise.all([
        dbService.getProfessionalById(professionalId),
        dbService.getBillableAppointmentsInRange(professionalId, pending.includes('week') ? weekStartISO : todayISO, todayISO),
        dbService.getServicesByProfessional(professionalId),
      ]);
      if (!professional || professional.deleted_at) continue;

      const byId = indexServices(services);
      const total = (from: string) => appointments
        .filter(a => a.date >= from && a.date <= todayISO)
        .reduce((s, a) => s + appointmentRevenueCents(a, byId), 0);

      for (const kind of pending) {
        const cents = total(kind === 'week' ? weekStartISO : todayISO);
        if (cents <= 0) continue;
        // Reserva antes de enviar: duas passadas do cron ao mesmo tempo não mandam em dobro.
        if (!(await dbService.claimPushDigest(professionalId, kind, todayISO))) continue;
        const payload = kind === 'week'
          ? weeklyRevenuePush(professional.name, cents, todayISO)
          : dailyRevenuePush(professional.name, cents, todayISO);
        if (await pushToProfessional(professionalId, payload)) count++;
      }
    } catch (e) {
      console.error(`[push/digest] Falha no resumo de ${professionalId}:`, e);
    }
  }
  return { sent: count };
}

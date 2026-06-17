import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/supabase/db';
import { sendWhatsAppText } from '@/lib/uazapi';
import { fillTemplate, formatDateBR } from '@/lib/whatsapp';

export const maxDuration = 60;

// Chamado pelo Vercel Cron a cada 5 minutos (ver vercel.json)
// Também pode ser acionado manualmente via GET /api/cron/reminders
// com header Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization')?.replace('Bearer ', '');
    if (auth !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Hora atual no fuso de Brasília
  const nowBR = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
  );
  const currentHour = nowBR.getHours();
  const currentMin = nowBR.getMinutes();

  const pad = (n: number) => String(n).padStart(2, '0');
  const todayISO = `${nowBR.getFullYear()}-${pad(nowBR.getMonth() + 1)}-${pad(nowBR.getDate())}`;
  const tomorrowDate = new Date(nowBR);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowISO = `${tomorrowDate.getFullYear()}-${pad(tomorrowDate.getMonth() + 1)}-${pad(tomorrowDate.getDate())}`;

  let sent = 0;
  let errors = 0;

  const allSettings = await dbService.getAllWhatsAppSettingsForCron();

  for (const settings of allSettings) {
    const anyEnabled =
      settings.automation_booking_enabled ||
      settings.automation_day_before_enabled ||
      settings.automation_day_of_enabled;
    if (!anyEnabled) continue;

    try {
      const [professional, appointments] = await Promise.all([
        dbService.getProfessionalById(settings.professional_id),
        dbService.getAppointmentsByProfessional(settings.professional_id),
      ]);

      const activeAppts = appointments.filter(a => a.status !== 'cancelled');

      // ── Automação 1: Confirmação após agendamento ──────────────────────────
      if (settings.automation_booking_enabled && settings.automation_booking_message) {
        const delayMs = (settings.automation_booking_delay_minutes ?? 1) * 60 * 1000;
        const eligible = activeAppts.filter(a =>
          !a.automation_booking_sent_at &&
          (Date.now() - new Date(a.created_at).getTime()) >= delayMs
        );
        for (const appt of eligible) {
          const msg = fillTemplate(settings.automation_booking_message, {
            nome: appt.client_name.split(' ')[0],
            servico: appt.service?.name || '',
            data: formatDateBR(appt.date),
            horario: appt.start_time.substring(0, 5),
            profissional: professional?.name || '',
          });
          const ok = await sendWhatsAppText(settings.uazapi_url, settings.uazapi_token, appt.client_whatsapp, msg);
          if (ok) { await dbService.markReminderSent(appt.id, 'booking'); sent++; }
        }
      }

      // ── Automação 2: Lembrete dia anterior ───────────────────────────────
      if (settings.automation_day_before_enabled && settings.automation_day_before_message) {
        const [rh, rm] = (settings.automation_day_before_time || '10:00').split(':').map(Number);
        if (currentHour > rh || (currentHour === rh && currentMin >= rm)) {
          const eligible = activeAppts.filter(a =>
            a.date === tomorrowISO && !a.automation_day_before_sent_at
          );
          for (const appt of eligible) {
            const msg = fillTemplate(settings.automation_day_before_message, {
              nome: appt.client_name.split(' ')[0],
              servico: appt.service?.name || '',
              data: formatDateBR(appt.date),
              horario: appt.start_time.substring(0, 5),
              profissional: professional?.name || '',
            });
            const ok = await sendWhatsAppText(settings.uazapi_url, settings.uazapi_token, appt.client_whatsapp, msg);
            if (ok) { await dbService.markReminderSent(appt.id, 'day_before'); sent++; }
          }
        }
      }

      // ── Automação 3: Lembrete no dia ─────────────────────────────────────
      if (settings.automation_day_of_enabled && settings.automation_day_of_message) {
        const [rh, rm] = (settings.automation_day_of_time || '08:00').split(':').map(Number);
        if (currentHour > rh || (currentHour === rh && currentMin >= rm)) {
          const eligible = activeAppts.filter(a =>
            a.date === todayISO && !a.automation_day_of_sent_at
          );
          for (const appt of eligible) {
            const msg = fillTemplate(settings.automation_day_of_message, {
              nome: appt.client_name.split(' ')[0],
              servico: appt.service?.name || '',
              data: formatDateBR(appt.date),
              horario: appt.start_time.substring(0, 5),
              profissional: professional?.name || '',
            });
            const ok = await sendWhatsAppText(settings.uazapi_url, settings.uazapi_token, appt.client_whatsapp, msg);
            if (ok) { await dbService.markReminderSent(appt.id, 'day_of'); sent++; }
          }
        }
      }
    } catch (e) {
      console.error('[cron/reminders] erro pid:', settings.professional_id, e);
      errors++;
    }
  }

  console.log(`[cron/reminders] enviados: ${sent}, erros: ${errors}`);
  return NextResponse.json({ ok: true, sent, errors });
}

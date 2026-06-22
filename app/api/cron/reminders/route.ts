import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/supabase/db';
import { sendWhatsAppText } from '@/lib/uazapi';
import { fillTemplate, formatDateBR, formatPriceBRL } from '@/lib/whatsapp';
import { runWhatsAppHealthCheck } from '@/lib/whatsapp/health';

export const maxDuration = 60;

// Chamado pelo Vercel Cron a cada 5 minutos (ver vercel.json)
// Também pode ser acionado manualmente via GET /api/cron/reminders
// com header Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // Fail-closed: sem CRON_SECRET configurado, o endpoint é recusado. Antes, a
  // ausência da env deixava o endpoint PÚBLICO — qualquer um disparava o envio
  // em massa de WhatsApp (e custo). Agora exige o segredo sempre.
  if (!secret) {
    console.error('[cron/reminders] CRON_SECRET não configurado — endpoint desabilitado.');
    return NextResponse.json({ error: 'Cron disabled (missing secret)' }, { status: 503 });
  }
  const auth = req.headers.get('authorization')?.replace('Bearer ', '');
  if (auth !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  const in5DaysDate = new Date(nowBR);
  in5DaysDate.setDate(in5DaysDate.getDate() + 5);
  const in5DaysISO = `${in5DaysDate.getFullYear()}-${pad(in5DaysDate.getMonth() + 1)}-${pad(in5DaysDate.getDate())}`;

  let sent = 0;
  let errors = 0;

  const allSettings = await dbService.getAllWhatsAppSettingsForCron();

  for (const settings of allSettings) {
    const anyEnabled =
      settings.automation_booking_enabled ||
      settings.automation_day_before_enabled ||
      settings.automation_day_of_enabled ||
      settings.automation_5days_enabled ||
      settings.automation_followup_enabled;
    if (!anyEnabled) continue;

    try {
      const [professional, appointments] = await Promise.all([
        dbService.getProfessionalById(settings.professional_id),
        dbService.getAppointmentsByProfessional(settings.professional_id),
      ]);

      const activeAppts = appointments.filter(a => a.status !== 'cancelled');

      // ── Automação 1: Confirmação após agendamento ──────────────────────────
      if (settings.automation_booking_enabled && settings.automation_booking_message) {
        const delayMs = (settings.automation_booking_delay_minutes ?? 30) * 1000;
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
            preco: formatPriceBRL(appt.service?.price_cents),
            forma_pagamento: appt.payment_method || '',
          }, settings.custom_variables);
          const ok = await sendWhatsAppText(settings.uazapi_url, settings.uazapi_token, appt.client_whatsapp, msg);
          if (ok) {
            await dbService.markReminderSent(appt.id, 'booking');
            dbService.setBotCooldown(settings.professional_id, appt.client_whatsapp, 3).catch(() => {});
            dbService.appendAutomatedMessage(settings.professional_id, appt.client_whatsapp, msg).catch(() => {});
            sent++;
          }
        }
      }

      // ── Automação 2: Lembrete dia anterior ───────────────────────────────
      if (settings.automation_day_before_enabled && settings.automation_day_before_message) {
        const [rh, rm] = (settings.automation_day_before_time || '10:00').split(':').map(Number);
        if (currentHour > rh || (currentHour === rh && currentMin >= rm)) {
          const eligible = activeAppts.filter(a => {
            if (a.date !== tomorrowISO || a.automation_day_before_sent_at) return false;
            // Conflito a evitar: se a cliente agendou na própria véspera (hoje, para amanhã),
            // o lembrete "1 dia antes" cairia no MESMO dia da confirmação — redundante.
            // Nesse caso anulamos o "1 dia antes"; ela recebe só confirmação + lembrete do dia.
            // Só suprimimos quando a confirmação está ativa (senão ela ficaria sem aviso antecedente).
            if (settings.automation_booking_enabled) {
              const createdBR = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(a.created_at));
              if (createdBR >= todayISO) return false; // criado hoje (véspera) → anula o "1 dia antes"
            }
            return true;
          });
          for (const appt of eligible) {
            const msg = fillTemplate(settings.automation_day_before_message, {
              nome: appt.client_name.split(' ')[0],
              servico: appt.service?.name || '',
              data: formatDateBR(appt.date),
              horario: appt.start_time.substring(0, 5),
              profissional: professional?.name || '',
              preco: formatPriceBRL(appt.service?.price_cents),
              forma_pagamento: appt.payment_method || '',
            }, settings.custom_variables);
            const ok = await sendWhatsAppText(settings.uazapi_url, settings.uazapi_token, appt.client_whatsapp, msg);
            if (ok) {
              await dbService.markReminderSent(appt.id, 'day_before');
              dbService.setBotCooldown(settings.professional_id, appt.client_whatsapp, 3).catch(() => {});
              dbService.appendAutomatedMessage(settings.professional_id, appt.client_whatsapp, msg).catch(() => {});
              sent++;
            }
          }
        }
      }

      // ── Automação 4: Lembrete 5 dias antes ───────────────────────────────
      if (settings.automation_5days_enabled && settings.automation_5days_message) {
        const [rh, rm] = (settings.automation_5days_time || '10:00').split(':').map(Number);
        if (currentHour > rh || (currentHour === rh && currentMin >= rm)) {
          const eligible = activeAppts.filter(a => {
            if (a.date !== in5DaysISO || a.automation_5days_sent_at) return false;
            // Se a cliente agendou faltando ≤5 dias, este lembrete não faz sentido
            // (cairia junto/antes da confirmação) — suprime quando criado a partir de hoje.
            const createdBR = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(a.created_at));
            if (createdBR >= todayISO) return false;
            return true;
          });
          for (const appt of eligible) {
            const msg = fillTemplate(settings.automation_5days_message, {
              nome: appt.client_name.split(' ')[0],
              servico: appt.service?.name || '',
              data: formatDateBR(appt.date),
              horario: appt.start_time.substring(0, 5),
              profissional: professional?.name || '',
              preco: formatPriceBRL(appt.service?.price_cents),
              forma_pagamento: appt.payment_method || '',
            }, settings.custom_variables);
            const ok = await sendWhatsAppText(settings.uazapi_url, settings.uazapi_token, appt.client_whatsapp, msg);
            if (ok) {
              await dbService.markReminderSent(appt.id, '5days');
              dbService.setBotCooldown(settings.professional_id, appt.client_whatsapp, 3).catch(() => {});
              dbService.appendAutomatedMessage(settings.professional_id, appt.client_whatsapp, msg).catch(() => {});
              sent++;
            }
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
              preco: formatPriceBRL(appt.service?.price_cents),
              forma_pagamento: appt.payment_method || '',
            }, settings.custom_variables);
            const ok = await sendWhatsAppText(settings.uazapi_url, settings.uazapi_token, appt.client_whatsapp, msg);
            if (ok) {
              await dbService.markReminderSent(appt.id, 'day_of');
              dbService.setBotCooldown(settings.professional_id, appt.client_whatsapp, 3).catch(() => {});
              dbService.appendAutomatedMessage(settings.professional_id, appt.client_whatsapp, msg).catch(() => {});
              sent++;
            }
          }
        }
      }

      // ── Automação 5: Follow-up de cliente sem retorno há N dias ───────────
      // Para cada cliente cujo ÚLTIMO atendimento foi há >= N dias (padrão 30) e
      // que NÃO tem horário futuro marcado, envia uma mensagem de reengajamento.
      // Janela de captura (N..N+30 dias) evita disparo em massa para clientes que
      // sumiram há muito tempo ao ativar a automação. Dedupe por followup_sent_at.
      if (settings.automation_followup_enabled && settings.automation_followup_message) {
        const [fh, fm] = (settings.automation_followup_time || '10:00').split(':').map(Number);
        if (currentHour > fh || (currentHour === fh && currentMin >= fm)) {
          const thresholdDays = settings.automation_followup_days || 30;
          const clients = await dbService.getClientsByProfessional(settings.professional_id);

          // Mapa por telefone: último atendimento passado + se tem horário futuro.
          const byPhone = new Map<string, { lastPast: string | null; hasUpcoming: boolean; lastPastAppt: typeof activeAppts[number] | null }>();
          for (const a of activeAppts) {
            const entry = byPhone.get(a.client_whatsapp) || { lastPast: null, hasUpcoming: false, lastPastAppt: null };
            if (a.date < todayISO) {
              if (!entry.lastPast || a.date > entry.lastPast) { entry.lastPast = a.date; entry.lastPastAppt = a; }
            } else {
              entry.hasUpcoming = true; // hoje ou futuro
            }
            byPhone.set(a.client_whatsapp, entry);
          }

          for (const client of clients) {
            const entry = byPhone.get(client.whatsapp);
            if (!entry || !entry.lastPast || entry.hasUpcoming) continue;
            const daysSince = Math.floor((Date.parse(`${todayISO}T00:00:00`) - Date.parse(`${entry.lastPast}T00:00:00`)) / 86400000);
            if (daysSince < thresholdDays || daysSince > thresholdDays + 30) continue;
            // Já enviou follow-up depois do último atendimento? (zera quando ela volta a agendar)
            if (client.followup_sent_at && Date.parse(client.followup_sent_at) >= Date.parse(`${entry.lastPast}T00:00:00`)) continue;

            const msg = fillTemplate(settings.automation_followup_message, {
              nome: (client.name || '').split(' ')[0],
              servico: entry.lastPastAppt?.service?.name || 'atendimento',
              profissional: professional?.name || '',
            }, settings.custom_variables);
            const ok = await sendWhatsAppText(settings.uazapi_url, settings.uazapi_token, client.whatsapp, msg);
            if (ok) {
              await dbService.markFollowupSent(settings.professional_id, client.whatsapp);
              dbService.setBotCooldown(settings.professional_id, client.whatsapp, 3).catch(() => {});
              dbService.appendAutomatedMessage(settings.professional_id, client.whatsapp, msg).catch(() => {});
              sent++;
            }
          }
        }
      }
    } catch (e) {
      console.error('[cron/reminders] erro pid:', settings.professional_id, e);
      errors++;
    }
  }

  // Monitor de saúde do bot (auto-cura do webhook + alerta push), aproveitando a
  // cadência já existente deste cron. Best-effort: nunca interrompe os lembretes.
  let health: unknown = null;
  try {
    health = await runWhatsAppHealthCheck();
  } catch (e) {
    console.error('[cron/reminders] health-check falhou:', e);
  }

  console.log(`[cron/reminders] enviados: ${sent}, erros: ${errors}`);
  return NextResponse.json({ ok: true, sent, errors, health });
}

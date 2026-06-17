'use server';

import { dbService } from '@/lib/supabase/db';
import { getAvailableSlots, timeToMinutes } from '@/lib/appointments/slots';
import { authService } from '@/lib/auth/auth';
import { isDemo } from '@/lib/demo';
import { sendWhatsAppText } from '@/lib/uazapi';
import { fillTemplate, formatDateBR, formatPriceBRL, normalizeWhatsapp } from '@/lib/whatsapp';

/**
 * Busca dados da profissional e serviços pelo slug para a página pública.
 */
export async function getBookingData(slug: string) {
  try {
    const professional = await dbService.getProfessionalBySlug(slug);
    if (!professional || professional.status !== 'active') {
      return { success: false, error: 'Profissional não encontrada ou inativa.' };
    }

    const services = await dbService.getServicesByProfessional(professional.id);
    const activeServices = services.filter(s => s.is_active);

    const settings = await dbService.getSettingsByProfessional(professional.id);

    return {
      success: true,
      professional,
      services: activeServices,
      settings
    };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao carregar dados de agendamento.' };
  }
}

/**
 * Seleciona N itens distribuídos de forma natural ao longo do array (não sequenciais).
 * Ex.: de 12 horários livres, escolhe 4 espalhados pela manhã/tarde.
 */
function pickDistributed<T>(arr: T[], n: number): T[] {
  if (n <= 0 || arr.length <= n) return arr;
  if (n === 1) return [arr[Math.floor(arr.length / 2)]];
  const result: T[] = [];
  const seen = new Set<number>();
  const step = (arr.length - 1) / (n - 1);
  for (let i = 0; i < n; i++) {
    let idx = Math.round(i * step);
    while (seen.has(idx) && idx < arr.length - 1) idx++;
    if (seen.has(idx)) continue;
    seen.add(idx);
    result.push(arr[idx]);
  }
  return result;
}

/**
 * Retorna os slots de horários disponíveis para um dia e serviço específico (PÚBLICO).
 * Respeita o limite público (settings.public_slots_limit): mostra só N horários livres,
 * distribuídos naturalmente, sem revelar todos os horários vagos. A agenda real não muda.
 */
export async function getSlotsAction(professionalId: string, dateStr: string, serviceId: string) {
  try {
    const service = await dbService.getServiceById(serviceId);
    if (!service || !service.is_active) {
      return { success: false, error: 'Serviço indisponível.' };
    }

    const slots = await getAvailableSlots(professionalId, dateStr, service.duration_minutes);

    const settings = await dbService.getSettingsByProfessional(professionalId);
    const limit = settings?.public_slots_limit ?? 0;
    if (limit && limit > 0) {
      // Só horários livres, distribuídos; ocupados nunca aparecem nessa visão limitada.
      const available = slots.filter(s => s.isAvailable);
      return { success: true, slots: pickDistributed(available, limit) };
    }

    return { success: true, slots };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao calcular horários livres.' };
  }
}

/**
 * Slots para uso INTERNO (painel da profissional): sempre TODOS os horários livres,
 * ignorando o limite público. Aceita duração personalizada (agendamento manual).
 */
export async function getSlotsInternalAction(professionalId: string, dateStr: string, durationMinutes: number) {
  try {
    const session = await authService.getCurrentUser();
    if (!session || (session.professional_id !== professionalId && session.role !== 'super_admin' && !session.is_salon_manager)) {
      return { success: false, error: 'Não autorizado.' };
    }
    const slots = await getAvailableSlots(professionalId, dateStr, durationMinutes);
    return { success: true, slots };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao calcular horários livres.' };
  }
}

/**
 * Cria um agendamento MANUAL pelo painel, com duração personalizada opcional.
 * - Se durationMinutes não vier, usa a duração padrão do serviço.
 * - Permite horário de início arbitrário (não preso à grade de slots).
 * - Bloqueia conflito com outros agendamentos (considerando o buffer) e dia bloqueado.
 * - A duração padrão do serviço NÃO é alterada (vale só para este agendamento).
 */
export async function createManualAppointmentAction(input: {
  professionalId: string;
  serviceId: string;
  clientName: string;
  clientWhatsapp: string;
  date: string;
  startTime: string; // "HH:MM"
  durationMinutes?: number;
  notes?: string;
  allowOverlap?: boolean;
  paymentMethod?: string;
}) {
  try {
    const { professionalId, serviceId, clientName, clientWhatsapp, date, startTime } = input;

    const session = await authService.getCurrentUser();
    if (!session || (session.professional_id !== professionalId && session.role !== 'super_admin' && !session.is_salon_manager)) {
      return { success: false, error: 'Não autorizado.' };
    }
    if (isDemo(professionalId)) return { success: true, appointmentId: 'demo' };
    if (!serviceId || !clientName?.trim() || !clientWhatsapp?.trim() || !date || !startTime) {
      return { success: false, error: 'Preencha serviço, cliente, data e horário.' };
    }

    const service = await dbService.getServiceById(serviceId);
    if (!service) return { success: false, error: 'Serviço inválido.' };

    const duration = input.durationMinutes && input.durationMinutes > 0
      ? Math.round(input.durationMinutes)
      : service.duration_minutes;

    const startMin = timeToMinutes(startTime);
    const endMin = startMin + duration;
    if (endMin <= startMin) return { success: false, error: 'Duração inválida.' };

    // Dia bloqueado?
    const dayBlocks = (await dbService.getTimeBlocksByProfessional(professionalId)).filter(b => b.date === date);
    if (dayBlocks.some(b => b.block_type === 'full_day')) {
      return { success: false, error: 'A agenda está bloqueada (dia inteiro) nesta data.' };
    }

    // Conflito com outros agendamentos (considerando o buffer pós-atendimento)
    // allowOverlap=true permite que a profissional agende múltiplas clientes no mesmo horário
    if (!input.allowOverlap) {
      const settings = await dbService.getSettingsByProfessional(professionalId);
      const buffer = settings?.default_buffer_minutes ?? 0;
      const dayAppts = (await dbService.getAppointmentsByProfessional(professionalId))
        .filter(a => a.date === date && a.status !== 'cancelled');
      const conflict = dayAppts.some(a => {
        const aStart = timeToMinutes(a.start_time);
        const aEnd = timeToMinutes(a.end_time) + buffer;
        return Math.max(startMin, aStart) < Math.min(endMin, aEnd);
      });
      if (conflict) {
        return { success: false, error: 'Esse intervalo conflita com outro agendamento. Escolha outro horário ou ajuste a duração.' };
      }
    }

    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}:00`;
    const finalStart = startTime.length === 5 ? `${startTime}:00` : startTime;

    const appointment = await dbService.createAppointment({
      professional_id: professionalId,
      service_id: serviceId,
      client_id: null,
      client_name: clientName.trim(),
      client_whatsapp: normalizeWhatsapp(clientWhatsapp),
      client_email: null,
      date,
      start_time: finalStart,
      end_time: endTime,
      notes: input.notes?.trim() || null,
      cancellation_reason: null,
      payment_method: input.paymentMethod || null,
    });

    // Agendamento criado pela profissional já entra como confirmado
    try { await dbService.updateAppointmentStatus(appointment.id, 'confirmed'); } catch {}

    // Garante que a cliente esteja na base de clientes (ignoreDuplicates = não sobrescreve)
    dbService.upsertWhatsAppClient(professionalId, normalizeWhatsapp(clientWhatsapp), clientName.trim()).catch(() => {});

    // Envio instantâneo via automação se delay = 0
    try {
      const waSettings = await dbService.getWhatsAppSettings(professionalId);
      const cleanPhone = normalizeWhatsapp(clientWhatsapp);
      if (
        waSettings?.automation_booking_enabled &&
        waSettings?.automation_booking_message &&
        (waSettings?.automation_booking_delay_minutes ?? 30) === 0 &&
        waSettings.uazapi_url &&
        waSettings.uazapi_token
      ) {
        const msg = fillTemplate(waSettings.automation_booking_message, {
          nome: clientName.trim().split(' ')[0],
          servico: service.name,
          data: formatDateBR(date),
          horario: startTime.substring(0, 5),
          profissional: '',
          preco: formatPriceBRL(service.price_cents),
          forma_pagamento: input.paymentMethod || '',
        }, waSettings.custom_variables);
        const ok = await sendWhatsAppText(waSettings.uazapi_url, waSettings.uazapi_token, cleanPhone, msg);
        if (ok) {
          dbService.markReminderSent(appointment.id, 'booking').catch(() => {});
          await dbService.setBotCooldown(professionalId, cleanPhone, 3);
          dbService.appendAutomatedMessage(professionalId, cleanPhone, msg).catch(() => {});
        }
      }
    } catch {}

    return { success: true, appointmentId: appointment.id };
  } catch (e: any) {
    console.error('Erro ao criar agendamento manual:', e);
    return { success: false, error: e.message || 'Erro ao criar agendamento.' };
  }
}

import webpush from 'web-push';

// Configuração do Web Push
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contato@lumepremium.com', // Coloque um email de contato válido
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

interface CreateAppointmentInput {
  professionalId: string;
  serviceId: string;
  clientName: string;
  clientWhatsapp: string;
  clientEmail?: string;
  date: string;
  startTime: string; // "HH:MM"
  notes?: string;
  clientBirthday?: string;
  paymentMethod?: string;
}

/**
 * Cria um agendamento público com dupla validação (evita double-booking no servidor).
 */
export async function createAppointmentAction(input: CreateAppointmentInput) {
  try {
    const {
      professionalId, serviceId, clientName, clientWhatsapp,
      clientEmail, date, startTime, notes, clientBirthday
    } = input;

    // Conta demo: não persiste agendamentos (reseta ao atualizar)
    if (isDemo(professionalId)) {
      return { success: true, appointmentId: 'demo' };
    }

    // 1. Validar inputs básicos
    if (!professionalId || !serviceId || !clientName || !clientWhatsapp || !date || !startTime) {
      return { success: false, error: 'Por favor, preencha todos os campos obrigatórios.' };
    }

    // 2. Obter serviço e calcular horário final
    const service = await dbService.getServiceById(serviceId);
    if (!service || !service.is_active) {
      return { success: false, error: 'O serviço selecionado é inválido ou foi inativado.' };
    }

    // 3. Validação preventiva de concorrência (Double Booking)
    // Calcula os slots disponíveis para o dia e verifica se o slot de interesse continua livre
    const availableSlots = await getAvailableSlots(professionalId, date, service.duration_minutes);
    const targetSlot = availableSlots.find(s => s.time === startTime && s.isAvailable);

    if (!targetSlot) {
      return { 
        success: false, 
        error: 'O horário selecionado acabou de ser reservado por outro cliente. Por favor, escolha outro horário.' 
      };
    }

    // Calcular end_time ("HH:MM")
    const parts = startTime.split(':');
    const startHour = parseInt(parts[0], 10);
    const startMin = parseInt(parts[1], 10);
    const totalStartMinutes = startHour * 60 + startMin;
    const totalEndMinutes = totalStartMinutes + service.duration_minutes;
    
    const endHour = Math.floor(totalEndMinutes / 60);
    const endMin = totalEndMinutes % 60;
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}:00`;
    const finalStartTime = `${startTime}:00`;

    // 4. Salvar agendamento no banco
    const appointment = await dbService.createAppointment({
      professional_id: professionalId,
      service_id: serviceId,
      client_id: null, // será vinculado internamente
      client_name: clientName,
      client_whatsapp: normalizeWhatsapp(clientWhatsapp), // apenas números
      client_email: clientEmail || null,
      date,
      start_time: finalStartTime,
      end_time: endTime,
      notes: notes || null,
      cancellation_reason: null,
      payment_method: input.paymentMethod || null,
    });

    // Best-effort: registrar aniversário da cliente (requer migração v2 — não bloqueia o agendamento)
    if (clientBirthday) {
      await dbService.setClientBirthday(professionalId, normalizeWhatsapp(clientWhatsapp), clientBirthday);
    }

    // Confirmação automática: se a profissional ativou em Configurações → Agenda,
    // o agendamento já entra como CONFIRMADO (em vez de pendente).
    try {
      const settings = await dbService.getSettingsByProfessional(professionalId);
      if (settings?.confirmation_mode === 'automatic') {
        await dbService.updateAppointmentStatus(appointment.id, 'confirmed');
      }
    } catch (e) {
      console.error('Falha ao aplicar confirmação automática:', e);
    }

    // 5. Enviar notificação Web Push
    try {
      const subs = await dbService.getPushSubscriptionsByProfessional(professionalId);
      if (subs && subs.length > 0 && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        const payload = JSON.stringify({
          title: 'Novo Agendamento! 🎉',
          body: `${clientName} marcou ${service.name} para ${date.split('-').reverse().join('/')} às ${startTime}.`,
          url: '/dashboard'
        });

        // Enviar para todas as inscrições (celular, desktop, etc)
        const pushPromises = subs.map(async (sub) => {
          try {
            await webpush.sendNotification({
              endpoint: sub.endpoint,
              keys: {
                auth: sub.auth,
                p256dh: sub.p256dh
              }
            }, payload);
          } catch (err: any) {
            // Se o token expirou ou foi removido (Status 410 / 404), remover do BD
            if (err.statusCode === 404 || err.statusCode === 410) {
              await dbService.removePushSubscription(sub.endpoint);
            } else {
              console.error('Erro ao enviar push notification:', err);
            }
          }
        });

        await Promise.allSettled(pushPromises);
      }
    } catch (pushErr) {
      console.error('Falha geral no disparo de Web Push:', pushErr);
      // Não bloqueamos o agendamento em caso de erro no Push
    }

    // 6. Enviar confirmação via WhatsApp automaticamente (best-effort, não bloqueia)
    try {
      const [waSettings, agendaSettings] = await Promise.all([
        dbService.getWhatsAppSettings(professionalId),
        dbService.getSettingsByProfessional(professionalId),
      ]);
      const cleanPhone = normalizeWhatsapp(clientWhatsapp);

      // Automação ativa com delay=0 → envio instantâneo usando a mensagem configurada
      if (
        waSettings?.automation_booking_enabled &&
        waSettings?.automation_booking_message &&
        (waSettings?.automation_booking_delay_minutes ?? 30) === 0 &&
        waSettings.uazapi_url &&
        waSettings.uazapi_token
      ) {
        const professional = await dbService.getProfessionalById(professionalId).catch(() => null);
        const msg = fillTemplate(waSettings.automation_booking_message, {
          nome: clientName.split(' ')[0],
          servico: service.name,
          data: formatDateBR(date),
          horario: startTime,
          profissional: professional?.name || '',
          preco: formatPriceBRL(service.price_cents),
          forma_pagamento: input.paymentMethod || '',
        }, waSettings.custom_variables);
        const ok = await sendWhatsAppText(waSettings.uazapi_url, waSettings.uazapi_token, cleanPhone, msg);
        if (ok) {
          dbService.markReminderSent(appointment.id, 'booking').catch(() => {});
          await dbService.setBotCooldown(professionalId, cleanPhone, 3);
          dbService.appendAutomatedMessage(professionalId, cleanPhone, msg).catch(() => {});
        }
      // Sistema legado: confirmation_enabled sem automação ativa
      } else if (
        waSettings?.confirmation_enabled &&
        !waSettings?.automation_booking_enabled &&
        waSettings.uazapi_url &&
        waSettings.uazapi_token
      ) {
        const confirmMsg = fillTemplate(
          agendaSettings?.whatsapp_confirmation_message ||
            'Oi, {nome}! Seu agendamento de {servico} foi confirmado para o dia {data} às {horario}. Te esperamos! 💛',
          {
            nome: clientName.split(' ')[0],
            servico: service.name,
            data: formatDateBR(date),
            horario: startTime,
          }
        );
        const okLegacy = await sendWhatsAppText(waSettings.uazapi_url, waSettings.uazapi_token, cleanPhone, confirmMsg);
        if (okLegacy) {
          await dbService.setBotCooldown(professionalId, cleanPhone, 3);
          dbService.appendAutomatedMessage(professionalId, cleanPhone, confirmMsg).catch(() => {});
        }
      }
    } catch (waErr) {
      console.error('Falha ao enviar confirmação WhatsApp:', waErr);
    }

    return {
      success: true,
      appointmentId: appointment.id
    };
  } catch (e: any) {
    console.error('Erro ao agendar:', e);
    return { success: false, error: e.message || 'Ocorreu um erro interno ao realizar seu agendamento.' };
  }
}

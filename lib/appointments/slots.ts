import { dbService } from '../supabase/db';
import { AvailabilityRule, TimeBlock, Appointment } from '@/types/database';

/**
 * Converte string de horário "HH:MM" ou "HH:MM:SS" em minutos desde a meia-noite.
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Converte minutos desde a meia-noite em formato "HH:MM".
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export interface TimeSlot {
  time: string; // "HH:MM"
  isAvailable: boolean;
}

/**
 * Calcula os horários livres de um profissional em um dia específico.
 * @param professionalId ID do profissional
 * @param dateStr Data no formato "YYYY-MM-DD"
 * @param durationMinutes Duração do serviço em minutos
 */
export async function getAvailableSlots(
  professionalId: string,
  dateStr: string,
  durationMinutes: number
): Promise<TimeSlot[]> {
  try {
    // 1. Obter dia da semana (0 = Domingo, 1 = Segunda, etc.)
    // Usamos split('-') para evitar fuso horário local na criação de Date
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);
    const weekday = dateObj.getDay();

    // 2. Carregar Regra de Disponibilidade
    const rules = await dbService.getAvailabilityRulesByProfessional(professionalId);
    const rule = rules.find(r => r.weekday === weekday && r.is_active);
    if (!rule) {
      return []; // Sem expediente neste dia
    }

    // 3. Carregar Configurações e Bloqueios
    const settings = await dbService.getSettingsByProfessional(professionalId);
    const minNoticeHours = settings?.min_notice_hours ?? 3;
    // Buffer por dia (definido na aba Disponibilidade) tem prioridade; cai no
    // default global de settings só se a regra do dia não tiver valor.
    const bufferMinutes = rule.buffer_minutes ?? settings?.default_buffer_minutes ?? 15;

    const timeBlocks = await dbService.getTimeBlocksByProfessional(professionalId);
    const dayBlocks = timeBlocks.filter(b => b.date === dateStr);

    // Se houver bloqueio de dia inteiro, agenda fechada
    if (dayBlocks.some(b => b.block_type === 'full_day')) {
      return [];
    }

    // 4. Carregar Agendamentos do dia (não cancelados)
    const appointments = await dbService.getAppointmentsByProfessional(professionalId);
    const dayAppointments = appointments.filter(a => a.date === dateStr && a.status !== 'cancelled');

    // 5. Definir janelas de horários em minutos
    const workStart = timeToMinutes(rule.start_time);
    const workEnd = timeToMinutes(rule.end_time);
    const breakStart = rule.break_start ? timeToMinutes(rule.break_start) : null;
    const breakEnd = rule.break_end ? timeToMinutes(rule.break_end) : null;
    const interval = rule.slot_interval_minutes || 30;

    // Calcular limite mínimo de antecedência (aviso prévio) para hoje
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    let minAllowedMinutes = 0;

    if (dateStr === todayStr) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      minAllowedMinutes = currentMinutes + (minNoticeHours * 60);
    }

    const slots: TimeSlot[] = [];

    // Gerar slots possíveis
    for (let current = workStart; current + durationMinutes <= workEnd; current += interval) {
      // Regra: Não pode começar antes do horário mínimo de antecedência
      if (dateStr === todayStr && current < minAllowedMinutes) {
        continue;
      }

      const slotStart = current;
      const slotEnd = current + durationMinutes;

      // 1. Validar almoço
      if (breakStart !== null && breakEnd !== null) {
        const hasBreakConflict = Math.max(slotStart, breakStart) < Math.min(slotEnd, breakEnd);
        if (hasBreakConflict) {
          continue;
        }
      }

      // 2. Validar bloqueios personalizados de expediente
      let blocked = false;
      for (const block of dayBlocks) {
        if (block.block_type === 'custom_time' && block.start_time && block.end_time) {
          const bStart = timeToMinutes(block.start_time);
          const bEnd = timeToMinutes(block.end_time);
          if (Math.max(slotStart, bStart) < Math.min(slotEnd, bEnd)) {
            blocked = true;
            break;
          }
        }
      }
      if (blocked) continue;

      // 3. Validar conflitos com agendamentos existentes (considerando buffer)
      let hasConflict = false;
      for (const app of dayAppointments) {
        const appStart = timeToMinutes(app.start_time);
        const appEnd = timeToMinutes(app.end_time);
        
        // O intervalo reservado é [início do agendamento, término + buffer]
        const reservedStart = appStart;
        const reservedEnd = appEnd + bufferMinutes;

        // Verifica interseção entre o slot desejado e o intervalo reservado
        if (Math.max(slotStart, reservedStart) < Math.min(slotEnd, reservedEnd)) {
          hasConflict = true;
          break;
        }
      }

      slots.push({
        time: minutesToTime(slotStart),
        isAvailable: !hasConflict
      });
    }

    return slots;
  } catch (e) {
    console.error('Erro ao calcular slots disponíveis:', e);
    return [];
  }
}

import { dbService } from '../supabase/db';
import { AvailabilityRule, TimeBlock, Appointment, Setting } from '@/types/database';

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
    // Dia da semana (split evita problema de fuso ao criar Date).
    const parts = dateStr.split('-');
    const weekday = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getDay();

    const rules = await dbService.getAvailabilityRulesByProfessional(professionalId);
    const rule = rules.find(r => r.weekday === weekday && r.is_active);
    if (!rule) return []; // Sem expediente neste dia

    const settings = await dbService.getSettingsByProfessional(professionalId);
    const timeBlocks = await dbService.getTimeBlocksByProfessional(professionalId);
    const dayBlocks = timeBlocks.filter(b => b.date === dateStr);

    // Agendamentos do dia (filtro por data no banco — sem cancelados/lixeira).
    const dayAppointments = await dbService.getAppointmentsByProfessionalAndDate(professionalId, dateStr);

    return computeDaySlots(dateStr, durationMinutes, rule, settings, dayBlocks, dayAppointments);
  } catch (e) {
    console.error('Erro ao calcular slots disponíveis:', e);
    return [];
  }
}

/**
 * Núcleo do cálculo de horários livres de UM dia, a partir de dados já carregados.
 * Usado tanto por getAvailableSlots (1 dia) quanto por getDaysAvailability (vários dias,
 * carregando os dados uma única vez).
 */
function computeDaySlots(
  dateStr: string,
  durationMinutes: number,
  rule: AvailabilityRule,
  settings: Setting | null,
  dayBlocks: TimeBlock[],
  dayAppointments: Appointment[],
): TimeSlot[] {
  try {
    const minNoticeHours = settings?.min_notice_hours ?? 3;
    // Buffer por dia (aba Disponibilidade) tem prioridade; cai no default global se vazio.
    const bufferMinutes = rule.buffer_minutes ?? settings?.default_buffer_minutes ?? 15;

    // Se houver bloqueio de dia inteiro, agenda fechada.
    if (dayBlocks.some(b => b.block_type === 'full_day')) {
      return [];
    }

    // Definir janelas de horários em minutos
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

/**
 * Para uma lista de datas, retorna um mapa { "YYYY-MM-DD": temHorárioLivre }.
 * Carrega regras/configurações/bloqueios UMA vez e os agendamentos do período inteiro
 * numa única consulta — assim marcar 300 dias custa ~4 queries, não 300.
 * Usado pela página pública para riscar os dias sem horário.
 */
export async function getDaysAvailability(
  professionalId: string,
  dateStrs: string[],
  durationMinutes: number
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  if (!dateStrs.length) return result;

  try {
    const [rules, settings, timeBlocks] = await Promise.all([
      dbService.getAvailabilityRulesByProfessional(professionalId),
      dbService.getSettingsByProfessional(professionalId),
      dbService.getTimeBlocksByProfessional(professionalId),
    ]);

    const sorted = [...dateStrs].sort();
    const minDate = sorted[0];
    const maxDate = sorted[sorted.length - 1];
    const appts = await dbService.getAppointmentsByProfessionalInRange(professionalId, minDate, maxDate);

    // Agrupa agendamentos por data para lookup O(1) por dia.
    const apptsByDate = new Map<string, Appointment[]>();
    for (const a of appts) {
      const arr = apptsByDate.get(a.date) || [];
      arr.push(a);
      apptsByDate.set(a.date, arr);
    }
    const blocksByDate = new Map<string, TimeBlock[]>();
    for (const b of timeBlocks) {
      const arr = blocksByDate.get(b.date) || [];
      arr.push(b);
      blocksByDate.set(b.date, arr);
    }

    for (const dateStr of dateStrs) {
      const p = dateStr.split('-');
      const weekday = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)).getDay();
      const rule = rules.find(r => r.weekday === weekday && r.is_active);
      if (!rule) { result[dateStr] = false; continue; }
      const slots = computeDaySlots(
        dateStr,
        durationMinutes,
        rule,
        settings,
        blocksByDate.get(dateStr) || [],
        apptsByDate.get(dateStr) || [],
      );
      result[dateStr] = slots.some(s => s.isAvailable);
    }
    return result;
  } catch (e) {
    console.error('Erro ao calcular disponibilidade dos dias:', e);
    // Em erro, não marca nada como indisponível (não atrapalha o agendamento).
    for (const d of dateStrs) result[d] = true;
    return result;
  }
}

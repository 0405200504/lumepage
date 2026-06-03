'use server';

import { dbService } from '@/lib/supabase/db';
import { getAvailableSlots } from '@/lib/appointments/slots';
import { Appointment } from '@/types/database';

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
 * Retorna os slots de horários disponíveis para um dia e serviço específico.
 */
export async function getSlotsAction(professionalId: string, dateStr: string, serviceId: string) {
  try {
    const service = await dbService.getServiceById(serviceId);
    if (!service || !service.is_active) {
      return { success: false, error: 'Serviço indisponível.' };
    }

    const slots = await getAvailableSlots(professionalId, dateStr, service.duration_minutes);
    return { success: true, slots };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao calcular horários livres.' };
  }
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
}

/**
 * Cria um agendamento público com dupla validação (evita double-booking no servidor).
 */
export async function createAppointmentAction(input: CreateAppointmentInput) {
  try {
    const {
      professionalId, serviceId, clientName, clientWhatsapp,
      clientEmail, date, startTime, notes
    } = input;

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
      client_whatsapp: clientWhatsapp.replace(/\D/g, ''), // apenas números
      client_email: clientEmail || null,
      date,
      start_time: finalStartTime,
      end_time: endTime,
      notes: notes || null,
      cancellation_reason: null
    });

    return { 
      success: true, 
      appointmentId: appointment.id 
    };
  } catch (e: any) {
    console.error('Erro ao agendar:', e);
    return { success: false, error: e.message || 'Ocorreu um erro interno ao realizar seu agendamento.' };
  }
}

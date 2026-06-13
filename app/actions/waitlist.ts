'use server';

import { dbService } from '@/lib/supabase/db';
import { authService } from '@/lib/auth/auth';
import { isDemo } from '@/lib/demo';
import { WaitlistStatus } from '@/types/database';
import { createManualAppointmentAction } from './booking';

const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');

async function authorize(professionalId: string): Promise<boolean> {
  const session = await authService.getCurrentUser();
  if (!session) return false;
  if (session.role === 'super_admin') return true;
  if (session.professional_id === professionalId) return true;
  if (session.is_salon_manager) {
    const prof = await dbService.getProfessionalById(professionalId);
    return !!prof && (prof.salon_id ?? null) === (session.salon_id ?? null);
  }
  return false;
}

/**
 * PÚBLICO — a cliente entra na lista de espera pela página de agendamento.
 */
export async function addToWaitlistAction(input: {
  professionalId: string;
  clientName: string;
  clientWhatsapp: string;
  serviceId?: string;
  desiredDate?: string;
  desiredPeriod?: string;
  timePreference?: string;
  notes?: string;
}) {
  try {
    const { professionalId } = input;
    if (isDemo(professionalId)) return { success: true };

    const name = (input.clientName || '').trim();
    const whatsapp = onlyDigits(input.clientWhatsapp);
    if (!name) return { success: false, error: 'Informe seu nome.' };
    if (whatsapp.length < 10) return { success: false, error: 'Informe um WhatsApp válido com DDD.' };

    let serviceName: string | null = null;
    if (input.serviceId) {
      const svc = await dbService.getServiceById(input.serviceId);
      serviceName = svc?.name ?? null;
    }

    await dbService.createWaitlistEntry({
      professional_id: professionalId,
      client_name: name,
      client_whatsapp: whatsapp,
      service_id: input.serviceId || null,
      service_name: serviceName,
      desired_date: input.desiredDate || null,
      desired_period: input.desiredPeriod?.trim() || null,
      time_preference: input.timePreference?.trim() || null,
      notes: input.notes?.trim() || null,
    });
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao entrar na lista de espera.' };
  }
}

/**
 * PAINEL — adiciona manualmente alguém à lista de espera.
 */
export async function addWaitlistManualAction(professionalId: string, input: {
  clientName: string;
  clientWhatsapp: string;
  serviceId?: string;
  desiredDate?: string;
  desiredPeriod?: string;
  timePreference?: string;
  notes?: string;
}) {
  if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
  return addToWaitlistAction({ professionalId, ...input });
}

export async function updateWaitlistStatusAction(professionalId: string, entryId: string, status: WaitlistStatus) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    const entry = await dbService.getWaitlistEntryById(entryId);
    if (!entry || entry.professional_id !== professionalId) return { success: false, error: 'Solicitação não encontrada.' };
    await dbService.updateWaitlistStatus(entryId, status);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao atualizar status.' };
  }
}

export async function deleteWaitlistEntryAction(professionalId: string, entryId: string) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    const entry = await dbService.getWaitlistEntryById(entryId);
    if (!entry || entry.professional_id !== professionalId) return { success: false, error: 'Solicitação não encontrada.' };
    await dbService.deleteWaitlistEntry(entryId);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao remover da lista.' };
  }
}

/**
 * Cria um agendamento a partir de uma solicitação da lista de espera.
 * Em caso de sucesso, o status da solicitação muda automaticamente para "Encaixada" (scheduled).
 */
export async function scheduleFromWaitlistAction(professionalId: string, entryId: string, input: {
  serviceId: string;
  clientName: string;
  clientWhatsapp: string;
  date: string;
  startTime: string;
  durationMinutes?: number;
  notes?: string;
}) {
  try {
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    const entry = await dbService.getWaitlistEntryById(entryId);
    if (!entry || entry.professional_id !== professionalId) return { success: false, error: 'Solicitação não encontrada.' };

    const res = await createManualAppointmentAction({ professionalId, ...input });
    if (!res.success) return res;

    await dbService.updateWaitlistStatus(entryId, 'scheduled');
    return { success: true, appointmentId: res.appointmentId };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao encaixar.' };
  }
}

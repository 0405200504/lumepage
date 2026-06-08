'use server';

import { dbService } from '@/lib/supabase/db';
import { authService } from '@/lib/auth/auth';
import { AppointmentStatus, Service, AvailabilityRule, Professional, Setting, BlockType } from '@/types/database';
import { isSupabaseConfigured, supabase, getSupabaseAdmin } from '@/lib/supabase/client';
import { isDemo } from '@/lib/demo';

/**
 * Valida se a sessão atual é do profissional dono da informação ou do Super Admin.
 */
async function authorizeAction(professionalId: string): Promise<boolean> {
  const session = await authService.getCurrentUser();
  if (!session) return false;
  if (session.role === 'super_admin') return true;
  if (session.professional_id === professionalId) return true;
  // Gerente de contas pode agir sobre as funcionárias do seu salão
  if (session.is_salon_manager) {
    const prof = await dbService.getProfessionalById(professionalId);
    return !!prof && (prof.salon_id ?? null) === (session.salon_id ?? null);
  }
  return false;
}

// 1. Atualizar Cadastro do Profissional
export async function updateProfessionalAction(professionalId: string, data: Partial<Professional>) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorizeAction(professionalId)) {
      return { success: false, error: 'Não autorizado.' };
    }

    const result = await dbService.upsertProfessional({
      ...data,
      id: professionalId
    });

    return { success: true, professional: result };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao atualizar dados.' };
  }
}

// 2. Atualizar Configurações Comerciais
export async function updateSettingsAction(professionalId: string, data: Partial<Setting>) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorizeAction(professionalId)) {
      return { success: false, error: 'Não autorizado.' };
    }

    const result = await dbService.upsertSettings({
      ...data,
      professional_id: professionalId
    });

    return { success: true, settings: result };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao atualizar configurações.' };
  }
}

// 3. Atualizar Regras de Disponibilidade Semanal
export async function updateAvailabilityAction(professionalId: string, rules: Omit<AvailabilityRule, 'id' | 'created_at' | 'updated_at'>[]) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorizeAction(professionalId)) {
      return { success: false, error: 'Não autorizado.' };
    }

    const results = [];
    for (const rule of rules) {
      const res = await dbService.upsertAvailabilityRule({
        professional_id: professionalId,
        weekday: rule.weekday,
        start_time: rule.start_time,
        end_time: rule.end_time,
        break_start: rule.break_start || null,
        break_end: rule.break_end || null,
        slot_interval_minutes: rule.slot_interval_minutes,
        buffer_minutes: rule.buffer_minutes,
        is_active: rule.is_active
      });
      results.push(res);
    }

    return { success: true, availabilityRules: results };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao salvar disponibilidade.' };
  }
}

// 4. Gerenciar Serviços
export async function createServiceAction(professionalId: string, data: Omit<Service, 'id' | 'professional_id' | 'created_at' | 'updated_at'>) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorizeAction(professionalId)) {
      return { success: false, error: 'Não autorizado.' };
    }

    // IMPORTANTE: não passar id manual — services.id é UUID e o banco gera sozinho
    const newService = await dbService.createService({
      ...data,
      professional_id: professionalId
    });

    return { success: true, service: newService };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao cadastrar serviço.' };
  }
}

export async function updateServiceAction(professionalId: string, serviceId: string, data: Partial<Service>) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorizeAction(professionalId)) {
      return { success: false, error: 'Não autorizado.' };
    }

    const updated = await dbService.upsertService({
      ...data,
      id: serviceId,
      professional_id: professionalId
    });

    return { success: true, service: updated };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao atualizar serviço.' };
  }
}

export async function deleteServiceAction(professionalId: string, serviceId: string) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorizeAction(professionalId)) {
      return { success: false, error: 'Não autorizado.' };
    }

    await dbService.deleteService(serviceId);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao excluir serviço.' };
  }
}

// 5. Gerenciar Bloqueios Manuais da Agenda
export async function createTimeBlockAction(professionalId: string, data: { date: string; start_time?: string; end_time?: string; reason?: string; block_type: BlockType }) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorizeAction(professionalId)) {
      return { success: false, error: 'Não autorizado.' };
    }

    const block = await dbService.createTimeBlock({
      professional_id: professionalId,
      date: data.date,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      reason: data.reason || null,
      block_type: data.block_type
    });

    return { success: true, timeBlock: block };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao bloquear horário.' };
  }
}

export async function deleteTimeBlockAction(professionalId: string, blockId: string) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorizeAction(professionalId)) {
      return { success: false, error: 'Não autorizado.' };
    }

    await dbService.deleteTimeBlock(blockId);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao excluir bloqueio.' };
  }
}

// 6. Atualizar Status de Agendamento
export async function updateAppointmentStatusAction(appointmentId: string, professionalId: string, status: AppointmentStatus, cancellationReason?: string) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorizeAction(professionalId)) {
      return { success: false, error: 'Não autorizado.' };
    }

    const result = await dbService.updateAppointmentStatus(appointmentId, status, cancellationReason);
    if (!result) {
      return { success: false, error: 'Agendamento não encontrado.' };
    }

    return { success: true, appointment: result };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao alterar agendamento.' };
  }
}

// 7. Logout do sistema
export async function logoutAction() {
  const res = await authService.logout();
  return { success: res };
}

// 7b. Login da CONTA TESTE (demo Amanda Costa) — sem senha
export async function loginDemoAction() {
  await authService.loginDemo();
  return { success: true };
}

// 8. Login no sistema
export async function loginAction(email: string, password?: string) {
  console.log('[ACTIONS_LOGIN] loginAction chamada com:', { email, password: password ? '********' : 'não fornecido' });
  console.log('[ACTIONS_LOGIN] isSupabaseConfigured:', isSupabaseConfigured);
  const result = await authService.login(email, password);
  console.log('[ACTIONS_LOGIN] Resultado do login:', result);
  return result;
}

// 9. Cadastro de profissional
export async function registerProfessionalAction(data: {
  name: string;
  brandName: string;
  email: string;
  whatsapp: string;
  password?: string;
}) {
  const cleanEmail = data.email.trim().toLowerCase();
  
  if (isSupabaseConfigured) {
    try {
      // 1. Gerar um ID de profissional
      const professionalId = crypto.randomUUID();
      
      // 2. Criar profissional no banco de dados (regras e settings padrão são criados internamente em dbService.createProfessional)
      const slug = data.brandName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove acentos
        .replace(/[^a-z0-9]+/g, "-") // substitui caracteres especiais por -
        .replace(/(^-|-$)+/g, ""); // remove traços no início/fim

      await dbService.createProfessional({
        id: professionalId,
        owner_user_id: null,
        name: data.name,
        brand_name: data.brandName,
        slug,
        email: cleanEmail,
        whatsapp: data.whatsapp,
        instagram: null,
        logo_url: null,
        profile_image_url: null,
        primary_color: '#500b18',
        secondary_color: '#eccbd2',
        address: null,
        city: null,
        state: null,
        description: null,
        public_bio: null,
        status: 'active'
      });

      // 3. Cadastrar no Supabase Auth via API Admin (sem rate limit de email)
      const clientAdmin = getSupabaseAdmin();
      if (!clientAdmin) {
        // Fallback: usar signUp normal se não tiver service_role key
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: data.password || 'lume123456',
          options: {
            data: {
              name: data.name,
              professional_id: professionalId
            }
          }
        });

        if (authError) {
          await supabase.from('professionals').delete().eq('id', professionalId);
          return { success: false, error: authError.message };
        }

        if (authData.user) {
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({ professional_id: professionalId })
            .eq('auth_user_id', authData.user.id);
          
          if (profileUpdateError) {
            console.error('Erro ao vincular professional_id no perfil:', profileUpdateError);
          }
        }

        return { success: true, user: authData.user };
      }

      // Caminho preferencial: API Admin (sem email, sem rate limit, já confirmado)
      const { data: authData, error: authError } = await clientAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: data.password || 'lume123456',
        email_confirm: true,
        user_metadata: {
          name: data.name,
          professional_id: professionalId
        }
      });

      if (authError) {
        await clientAdmin.from('professionals').delete().eq('id', professionalId);
        return { success: false, error: authError.message };
      }

      // Forçar atualização do perfil criado pela trigger para associar o professional_id
      if (authData.user) {
        const { error: profileUpdateError } = await clientAdmin
          .from('profiles')
          .update({ professional_id: professionalId })
          .eq('auth_user_id', authData.user.id);
        
        if (profileUpdateError) {
          console.error('Erro ao vincular professional_id no perfil:', profileUpdateError);
        }
      }

      return { success: true, user: authData.user };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro ao realizar cadastro.' };
    }
  }

  // --- FALLBACK MOCK ---
  try {
    const professionalId = 'prof_' + Math.random().toString(36).substring(2, 9);
    const slug = data.brandName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    const prof = await dbService.createProfessional({
      id: professionalId,
      owner_user_id: null,
      name: data.name,
      brand_name: data.brandName,
      slug,
      email: cleanEmail,
      whatsapp: data.whatsapp,
      instagram: null,
      logo_url: null,
      profile_image_url: null,
      primary_color: '#500b18',
      secondary_color: '#eccbd2',
      address: null,
      city: null,
      state: null,
      description: null,
      public_bio: null,
      status: 'active'
    });

    const profileId = 'profile_' + Math.random().toString(36).substring(2, 9);
    await dbService.createProfile({
      id: profileId,
      auth_user_id: 'mock_auth_' + Math.random().toString(36).substring(2, 9),
      name: data.name,
      email: cleanEmail,
      role: 'professional',
      professional_id: professionalId
    });

    return { success: true, professional: prof };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao realizar cadastro.' };
  }
}


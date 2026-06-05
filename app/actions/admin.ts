'use server';

import { dbService } from '@/lib/supabase/db';
import { authService } from '@/lib/auth/auth';
import { isSupabaseConfigured, supabase, getSupabaseAdmin } from '@/lib/supabase/client';
import { ProfessionalStatus, Professional, Profile } from '@/types/database';

/**
 * Valida se a sessão atual é de um Super Admin da Lume.
 */
async function authorizeAdmin(): Promise<boolean> {
  const session = await authService.getCurrentUser();
  return session?.role === 'super_admin';
}

interface CreateProfessionalInput {
  name: string;
  brandName: string;
  slug: string;
  email: string;
  whatsapp: string;
  instagram?: string;
  address?: string;
  city?: string;
  state?: string;
  description?: string;
  publicBio?: string;
}

/**
 * Cria um profissional e seu respectivo perfil administrativo.
 */
export async function createProfessionalAction(input: CreateProfessionalInput) {
  try {
    if (!await authorizeAdmin()) {
      return { success: false, error: 'Acesso não autorizado. Apenas administradores.' };
    }

    const {
      name, brandName, slug, email, whatsapp, instagram,
      address, city, state, description, publicBio
    } = input;

    // 1. Validar slug único
    const slugLower = slug.trim().toLowerCase().replace(/\s+/g, '-');
    const existing = await dbService.getProfessionalBySlug(slugLower);
    if (existing) {
      return { success: false, error: 'Este slug já está em uso por outro profissional.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingProfile = await dbService.getProfileByEmail(cleanEmail);
    if (existingProfile) {
      return { success: false, error: 'Já existe um perfil cadastrado com este e-mail.' };
    }

    const isSupabase = isSupabaseConfigured;
    const finalProfId = isSupabase ? crypto.randomUUID() : (Math.random().toString(36).substring(2, 9) + '-' + Math.random().toString(36).substring(2, 9));
    let finalOwnerId: string | null = null;
    const tempPassword = 'Lume' + whatsapp.substring(0, 4) + '!';

    // 2. Criar profissional no banco de dados primeiro
    const newProf = await dbService.createProfessional({
      id: finalProfId,
      owner_user_id: null, // será associado depois do signUp
      name,
      brand_name: brandName,
      slug: slugLower,
      email: cleanEmail,
      whatsapp,
      instagram: instagram || null,
      logo_url: null,
      profile_image_url: null,
      primary_color: '#500b18', // Bordô Lume default
      secondary_color: '#eccbd2',
      address: address || null,
      city: city || null,
      state: state || null,
      description: description || null,
      public_bio: publicBio || null,
      status: 'active'
    });

    if (isSupabase) {
      try {
        const clientAdmin = getSupabaseAdmin();
        
        if (!clientAdmin) {
          // Sem service_role key, não consegue criar usuário sem rate limit
          const adminClient = supabase;
          await adminClient.from('professionals').delete().eq('id', finalProfId);
          return { success: false, error: 'Chave de serviço do Supabase não configurada. Adicione SUPABASE_SERVICE_ROLE_KEY no .env.' };
        }

        // 3. Criar usuário via API Admin (sem enviar email, sem rate limit, já confirmado)
        const { data: authUser, error: authErr } = await clientAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: tempPassword,
          email_confirm: true, // Confirma o email automaticamente
          user_metadata: {
            name: name,
            role: 'professional',
            professional_id: finalProfId
          }
        });

        if (authErr) {
          await clientAdmin.from('professionals').delete().eq('id', finalProfId);
          return { success: false, error: authErr.message };
        }

        if (authUser.user) {
          finalOwnerId = authUser.user.id;
          
          // 4. Associar o owner_user_id no profissional
          await clientAdmin
            .from('professionals')
            .update({ owner_user_id: finalOwnerId })
            .eq('id', finalProfId);

          // 5. Garantir que o perfil está associado (a trigger já criou, mas forçamos o update por segurança)
          await clientAdmin
            .from('profiles')
            .update({ professional_id: finalProfId })
            .eq('auth_user_id', finalOwnerId);
        }
      } catch (e: any) {
        // Limpar profissional se houver erro
        const clientAdmin = getSupabaseAdmin() || supabase;
        await clientAdmin.from('professionals').delete().eq('id', finalProfId);
        throw e;
      }
    } else {
      // Fallback Mock: criar perfil
      await dbService.createProfile({
        id: 'prof_profile_' + Math.random().toString(36).substring(2, 6),
        auth_user_id: 'mock_auth_' + Math.random().toString(36).substring(2, 9),
        name,
        email: cleanEmail,
        role: 'professional',
        professional_id: finalProfId
      });
    }

    return { 
      success: true, 
      professional: newProf,
      tempPassword
    };
  } catch (e: any) {
    console.error('Erro ao cadastrar profissional:', e);
    return { success: false, error: e.message || 'Erro interno ao cadastrar profissional.' };
  }
}

/**
 * Altera status do profissional (ex: Ativo, Pausado, Cancelado).
 */
export async function updateProfessionalStatusAction(professionalId: string, status: ProfessionalStatus) {
  try {
    if (!await authorizeAdmin()) {
      return { success: false, error: 'Não autorizado.' };
    }

    const result = await dbService.upsertProfessional({
      id: professionalId,
      status
    });

    return { success: true, professional: result };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao alterar status.' };
  }
}

/**
 * Coleta estatísticas consolidadas para o painel de administração da Lume.
 */
export async function getDashboardStatsAction() {
  try {
    if (!await authorizeAdmin()) {
      return { success: false, error: 'Não autorizado.' };
    }

    const professionals = await dbService.getProfessionals();
    const activeProfsCount = professionals.filter(p => p.status === 'active').length;
    
    // Contagem total de agendamentos e faturamento estimado (consolida todos os profissionais)
    let totalAppointmentsCount = 0;
    let totalRevenueCents = 0;
    
    for (const prof of professionals) {
      const appointments = await dbService.getAppointmentsByProfessional(prof.id);
      const activeApps = appointments.filter(a => a.status !== 'cancelled');
      totalAppointmentsCount += activeApps.length;

      // Faturamento dos confirmados/finalizados
      const completedApps = activeApps.filter(a => ['confirmed', 'completed'].includes(a.status));
      for (const app of completedApps) {
        totalRevenueCents += app.service?.price_cents || 0;
      }
    }

    return {
      success: true,
      stats: {
        totalProfessionals: professionals.length,
        activeProfessionals: activeProfsCount,
        totalAppointments: totalAppointmentsCount,
        totalRevenueCents
      }
    };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao carregar estatísticas gerais.' };
  }
}

'use server';

import { randomBytes } from 'crypto';
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
    // Senha temporária ALEATÓRIA e forte (antes era 'Lume'+telefone[0:4]+'!', adivinhável
    // por quem soubesse o telefone). O admin compartilha esta senha e a profissional troca.
    const tempPassword = 'Lm-' + randomBytes(9).toString('base64url');

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

// ===================== SALÕES (gerente multi-painel) =====================
export async function createSalonAction(name: string) {
  try {
    if (!await authorizeAdmin()) return { success: false, error: 'Não autorizado.' };
    if (!name.trim()) return { success: false, error: 'Dê um nome ao grupo.' };
    const salon = await dbService.createSalon(name.trim());
    return { success: true, salon };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao criar grupo.' };
  }
}

export async function assignProfessionalToSalonAction(professionalId: string, salonId: string | null) {
  try {
    if (!await authorizeAdmin()) return { success: false, error: 'Não autorizado.' };
    await dbService.setProfessionalSalon(professionalId, salonId);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao vincular profissional.' };
  }
}

export async function createSalonManagerAction(input: { name: string; email: string; password: string; salonId: string }) {
  try {
    if (!await authorizeAdmin()) return { success: false, error: 'Não autorizado.' };
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name || !email || !input.password) return { success: false, error: 'Preencha nome, e-mail e senha.' };
    if (input.password.length < 6) return { success: false, error: 'A senha precisa ter ao menos 6 caracteres.' };

    if (isSupabaseConfigured) {
      const clientAdmin = getSupabaseAdmin();
      if (!clientAdmin) return { success: false, error: 'Service role não configurada.' };
      const existing = await dbService.getProfileByEmail(email);
      if (existing) return { success: false, error: 'Já existe uma conta com esse e-mail.' };

      const { data: authUser, error: authErr } = await clientAdmin.auth.admin.createUser({
        email, password: input.password, email_confirm: true, user_metadata: { name },
      });
      if (authErr) return { success: false, error: authErr.message };

      // A trigger cria o profile; atualizamos para gerente do salão
      const { error: upErr } = await clientAdmin
        .from('profiles')
        .update({ name, is_salon_manager: true, salon_id: input.salonId, professional_id: null })
        .eq('auth_user_id', authUser.user!.id);
      if (upErr) {
        await clientAdmin.auth.admin.deleteUser(authUser.user!.id);
        return { success: false, error: 'Falha ao configurar gerente (rode a migração v6): ' + upErr.message };
      }
      return { success: true };
    }

    // Mock
    await dbService.createProfile({
      id: 'mgr_' + Math.random().toString(36).slice(2, 9),
      auth_user_id: 'mock_' + Math.random().toString(36).slice(2, 9),
      name, email, role: 'professional', professional_id: null,
      salon_id: input.salonId, is_salon_manager: true,
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao criar gerente.' };
  }
}

/**
 * Move a profissional para a LIXEIRA (soft-delete). Reversível: preserva login e
 * todos os dados; só some das listas ativas e da página pública. Apenas Super Admin.
 */
export async function deleteProfessionalAction(professionalId: string) {
  try {
    if (!await authorizeAdmin()) {
      return { success: false, error: 'Não autorizado.' };
    }
    await dbService.softDeleteProfessional(professionalId);
    return { success: true };
  } catch (e: any) {
    console.error('Erro ao mover profissional para a lixeira:', e);
    return { success: false, error: e.message || 'Erro ao mover para a lixeira.' };
  }
}

/** Lista as profissionais na lixeira (apenas Super Admin). */
export async function getTrashedProfessionalsAction() {
  if (!await authorizeAdmin()) return [];
  try {
    return await dbService.getTrashedProfessionals();
  } catch {
    return [];
  }
}

/** Restaura uma profissional da lixeira (apenas Super Admin). */
export async function restoreProfessionalAction(professionalId: string) {
  try {
    if (!await authorizeAdmin()) return { success: false, error: 'Não autorizado.' };
    await dbService.restoreProfessional(professionalId);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao restaurar profissional.' };
  }
}

/**
 * Exclui DEFINITIVAMENTE uma profissional (da lixeira): remove o usuário do Auth, os
 * perfis de login e todos os dados vinculados (cascade). IRREVERSÍVEL — Super Admin.
 */
export async function purgeProfessionalAction(professionalId: string) {
  try {
    if (!await authorizeAdmin()) {
      return { success: false, error: 'Não autorizado.' };
    }

    if (isSupabaseConfigured) {
      const clientAdmin = getSupabaseAdmin();
      if (clientAdmin) {
        const uids = new Set<string>();
        const { data: linkedProfiles } = await clientAdmin
          .from('profiles').select('auth_user_id').eq('professional_id', professionalId);
        (linkedProfiles || []).forEach((p: { auth_user_id: string | null }) => { if (p.auth_user_id) uids.add(p.auth_user_id); });
        const prof = await dbService.getProfessionalById(professionalId);
        if (prof?.owner_user_id) uids.add(prof.owner_user_id);

        for (const uid of uids) {
          const { error: delErr } = await clientAdmin.auth.admin.deleteUser(uid);
          if (delErr) console.warn('[purgeProfessional] falha ao remover usuário do Auth:', delErr.message);
        }
      }
    }

    await dbService.deleteProfessional(professionalId);
    return { success: true };
  } catch (e: any) {
    console.error('Erro ao excluir profissional definitivamente:', e);
    return { success: false, error: e.message || 'Erro ao excluir profissional.' };
  }
}

/** Esvazia a lixeira da rede (apaga definitivamente os registros soft-deleted). Super Admin. */
export async function purgeNetworkTrashAction() {
  try {
    if (!await authorizeAdmin()) return { success: false, error: 'Não autorizado.' };
    const result = await dbService.purgeNetworkTrash();
    return { success: true, ...result };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao esvaziar a lixeira da rede.' };
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

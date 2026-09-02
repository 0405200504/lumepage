'use server';

import { headers } from 'next/headers';
import { dbService } from '@/lib/supabase/db';
import { authService } from '@/lib/auth/auth';
import { authorizeProfessional } from '@/lib/auth/authorize-professional';
import { AppointmentStatus, Service, AvailabilityRule, Professional, Setting, BlockType } from '@/types/database';
import { revalidatePath } from 'next/cache';
import { isSupabaseConfigured, supabase, getSupabaseAdmin } from '@/lib/supabase/client';
import { isDemo } from '@/lib/demo';
import { rateLimit, ipFromHeaders } from '@/lib/rate-limit';
import { logAccessEvent } from '@/lib/access-tokens';
import { sendMail } from '@/lib/mail';
import { welcomeEmail } from '@/lib/mail-templates';
import { normalizeWhatsapp } from '@/lib/whatsapp';
import { validateSlug } from '@/lib/site/slug';

/**
 * Valida se a sessão atual é do profissional dono da informação ou do Super Admin.
 */
/** Autorização compartilhada (admin, a própria profissional ou gerente do salão dela). */
const authorizeAction = authorizeProfessional;

/**
 * Marca o tutorial de boas-vindas como visto — na CONTA, não no aparelho.
 *
 * Antes isso morava só no localStorage, então quem fazia o tour no computador
 * e depois entrava pelo celular era tratada como primeira viagem de novo. A
 * memória do navegador continua existindo (é ela que guarda em qual passo a
 * pessoa parou), mas quem decide se o tour abre sozinho é este carimbo.
 *
 * Banco sem a migração v40: o upsert repete sem a coluna e devolve sucesso —
 * volta a valer o comportamento antigo, por aparelho, em vez de dar erro.
 */
export async function marcarTourConcluidoAction(professionalId: string) {
  try {
    if (!professionalId) return { success: false };
    if (isDemo(professionalId)) return { success: true };
    if (!await authorizeAction(professionalId)) {
      return { success: false, error: 'Não autorizado.' };
    }
    await dbService.upsertProfessional({
      id: professionalId,
      tour_completed_at: new Date().toISOString(),
    });
    return { success: true };
  } catch {
    // Não vale quebrar a tela por causa do tutorial: se não gravou, ele
    // reaparece no próximo aparelho e a pessoa fecha de novo.
    return { success: false };
  }
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

    await dbService.deleteService(serviceId, professionalId);
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

    await dbService.deleteTimeBlock(blockId, professionalId);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao excluir bloqueio.' };
  }
}

// 6. Editar Agendamento (reagendamento + troca de serviço/status/obs)
export async function updateAppointmentAction(
  appointmentId: string,
  professionalId: string,
  patch: { date?: string; startTime?: string; endTime?: string; serviceId?: string; serviceIds?: string[]; notes?: string; status?: AppointmentStatus; paymentMethod?: string }
) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorizeAction(professionalId)) return { success: false, error: 'Não autorizado.' };

    const result = await dbService.updateAppointment(appointmentId, {
      ...(patch.date && { date: patch.date }),
      ...(patch.startTime && { start_time: patch.startTime }),
      ...(patch.endTime && { end_time: patch.endTime }),
      ...(patch.serviceId && { service_id: patch.serviceId }),
      ...(patch.serviceIds && { service_ids: patch.serviceIds.length > 1 ? patch.serviceIds : null }),
      ...('notes' in patch && { notes: patch.notes ?? null }),
      ...('paymentMethod' in patch && { payment_method: patch.paymentMethod ?? null }),
      ...(patch.status && { status: patch.status }),
    }, professionalId);
    if (!result) return { success: false, error: 'Agendamento não encontrado.' };
    // Mantém a receita automática em sincronia com o status atual
    await dbService.syncAppointmentRevenue(appointmentId).catch(() => {});
    revalidatePath('/dashboard/agenda');
    return { success: true, appointment: result };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao atualizar agendamento.' };
  }
}

// 7. Atualizar Status de Agendamento
export async function updateAppointmentStatusAction(appointmentId: string, professionalId: string, status: AppointmentStatus, cancellationReason?: string) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorizeAction(professionalId)) {
      return { success: false, error: 'Não autorizado.' };
    }

    const result = await dbService.updateAppointmentStatus(appointmentId, status, cancellationReason, professionalId);
    if (!result) {
      return { success: false, error: 'Agendamento não encontrado.' };
    }
    // Concluído → lança receita automática; outro status → remove a entrada vinculada
    await dbService.syncAppointmentRevenue(appointmentId).catch(() => {});

    return { success: true, appointment: result };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao alterar agendamento.' };
  }
}

export async function deleteAppointmentAction(appointmentId: string, professionalId: string) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorizeAction(professionalId)) {
      return { success: false, error: 'Não autorizado.' };
    }

    await dbService.deleteAppointment(appointmentId, professionalId);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao excluir agendamento.' };
  }
}

// Lixeira de agendamentos
export async function getTrashedAppointmentsAction(professionalId: string) {
  try {
    if (!await authorizeAction(professionalId)) return [];
    return await dbService.getTrashedAppointments(professionalId);
  } catch {
    return [];
  }
}

export async function restoreAppointmentAction(appointmentId: string, professionalId: string) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorizeAction(professionalId)) return { success: false, error: 'Não autorizado.' };
    await dbService.restoreAppointment(appointmentId, professionalId);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao restaurar agendamento.' };
  }
}

export async function purgeAppointmentAction(appointmentId: string, professionalId: string) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorizeAction(professionalId)) return { success: false, error: 'Não autorizado.' };
    await dbService.purgeAppointment(appointmentId, professionalId);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao excluir definitivamente.' };
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

// 8b. Login/cadastro via Google — recebe o access_token do cliente (validado no servidor).
export async function googleAuthAction(accessToken: string) {
  if (!accessToken) return { success: false, error: 'Sessão do Google ausente.' };
  const ip = ipFromHeaders(await headers());
  const rl = await rateLimit(`google:${ip}`, 15, 5 * 60 * 1000);
  if (!rl.ok) return { success: false, error: `Muitas tentativas. Tente novamente em ${rl.retryAfterSeconds}s.` };
  return authService.loginWithGoogle(accessToken);
}

// 8. Login no sistema
export async function loginAction(email: string, password?: string) {
  // Rate limit por IP: corta brute force de senha (best-effort por instância).
  const ip = ipFromHeaders(await headers());
  const rl = await rateLimit(`login:${ip}`, 10, 5 * 60 * 1000); // 10 tentativas / 5 min
  if (!rl.ok) {
    return { success: false, error: `Muitas tentativas. Tente novamente em ${rl.retryAfterSeconds}s.` };
  }
  // Não logar e-mail, senha nem o resultado do login (PII/credenciais nos logs da Vercel).
  const res = await authService.login(email, password);

  // Histórico de acesso da conta (aba "Acesso" do admin). Guarda o QUE aconteceu —
  // método, IP, sucesso/falha — e nunca a credencial usada.
  await logAccessEvent({
    professionalId: res.profile?.professional_id ?? null,
    email: email.trim().toLowerCase(),
    method: 'password',
    success: res.success,
  });

  return res;
}

// 9. Cadastro de profissional
/**
 * Boas-vindas do cadastro — best-effort.
 *
 * Nunca bloqueia nem falha o cadastro: a conta já existe, e um provedor de
 * e-mail fora do ar não pode impedir alguém de entrar no painel. Sem
 * RESEND_API_KEY configurada, o envio é simplesmente pulado.
 *
 * O e-mail NÃO leva a senha: quem se cadastra escolhe a própria senha e já a
 * conhece. Mandar em texto num canal encaminhável só criaria risco.
 */
async function enviarBoasVindas(email: string, nome: string) {
  try {
    // Mesmo prazo do DEFAULT de `trial_ends_at` (migration v26).
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const r = await sendMail({ to: email, ...welcomeEmail({ name: nome, email, trialEndsAt }) });
    if (r.sent) console.log(`[cadastro] Boas-vindas enviadas para ${email}.`);
  } catch (e) {
    console.warn('[cadastro] Falha ao enviar boas-vindas:', e instanceof Error ? e.message : e);
  }
}

export async function registerProfessionalAction(data: {
  name: string;
  brandName: string;
  email: string;
  whatsapp: string;
  password?: string;
}) {
  const cleanEmail = data.email.trim().toLowerCase();

  // Rate limit por IP: evita criação em massa de contas (lixo no banco / abuso).
  const ip = ipFromHeaders(await headers());
  const rl = await rateLimit(`register:${ip}`, 5, 60 * 60 * 1000); // 5 cadastros / hora
  if (!rl.ok) {
    return { success: false, error: `Muitas tentativas de cadastro. Tente novamente em ${Math.ceil(rl.retryAfterSeconds / 60)} min.` };
  }

  // Exige senha forte no cadastro — sem mais fallback fixo ('lume123456') que deixava
  // contas com senha pública e adivinhável.
  if (!data.password || data.password.length < 8) {
    return { success: false, error: 'Crie uma senha de pelo menos 8 caracteres.' };
  }

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
        status: 'active',
        // Cadastro pelo formulário já traz negócio e WhatsApp — não precisa
        // passar pela tela de boas-vindas (/bem-vinda), só quem entra pelo Google.
        onboarding_completed_at: new Date().toISOString(),
      });

      // 3. Cadastrar no Supabase Auth via API Admin (sem rate limit de email)
      const clientAdmin = getSupabaseAdmin();
      if (!clientAdmin) {
        // Fallback: usar signUp normal se não tiver service_role key
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: data.password,
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

        await enviarBoasVindas(cleanEmail, data.name);
        return { success: true, user: authData.user };
      }

      // Caminho preferencial: API Admin (sem email, sem rate limit, já confirmado)
      const { data: authData, error: authError } = await clientAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: data.password,
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

      await enviarBoasVindas(cleanEmail, data.name);
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


// 12. Boas-vindas (/bem-vinda) — completa a conta criada com o Google
/**
 * Quem entra pelo Google não preenche o formulário de cadastro: a conta nasce
 * com o nome do perfil Google, sem WhatsApp e com um endereço público chutado.
 * Esta action recebe o que falta, marca a conta como completa e manda o e-mail
 * de boas-vindas (que o cadastro por senha já enviava).
 */
export async function completeOnboardingAction(data: {
  name: string;
  brandName: string;
  whatsapp: string;
  slug: string;
}) {
  const session = await authService.getCurrentUser('pro');
  const professionalId = session?.professional_id;
  if (!professionalId) return { success: false, error: 'Sessão expirada. Entre de novo.' };
  if (isDemo(professionalId)) return { success: true, slug: data.slug };

  const name = data.name.trim();
  const brandName = data.brandName.trim();
  if (name.length < 2) return { success: false, error: 'Escreva o seu nome.' };
  if (brandName.length < 2) return { success: false, error: 'Escreva o nome do seu negócio.' };

  // WhatsApp: é por ele que saem confirmação e lembrete — sem número válido a
  // conta fica muda, então validamos o tamanho (DDI 55 + DDD + 8 ou 9 dígitos).
  const whatsapp = normalizeWhatsapp(data.whatsapp);
  if (whatsapp.length < 12 || whatsapp.length > 13) {
    return { success: false, error: 'Digite o WhatsApp com DDD. Ex.: (11) 91234-5678.' };
  }

  const check = validateSlug(data.slug);
  if (!check.ok) return { success: false, error: check.error || 'Endereço inválido.' };

  try {
    const prof = await dbService.getProfessionalById(professionalId);
    if (!prof) return { success: false, error: 'Conta não encontrada.' };

    if (prof.slug !== check.slug && await dbService.isSlugTaken(check.slug, professionalId)) {
      return { success: false, error: 'Esse endereço já está sendo usado. Tente outro.' };
    }

    await dbService.upsertProfessional({
      id: professionalId,
      name,
      brand_name: brandName,
      whatsapp,
      slug: check.slug,
      onboarding_completed_at: new Date().toISOString(),
    });

    // Mesmo e-mail do cadastro por senha — quem entrou pelo Google nunca recebia.
    if (prof.email) await enviarBoasVindas(prof.email, name);

    revalidatePath('/dashboard');
    revalidatePath(`/${check.slug}`);
    if (prof.slug && prof.slug !== check.slug) revalidatePath(`/${prof.slug}`);

    return { success: true, slug: check.slug };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (/duplicate key|unique/i.test(msg)) {
      return { success: false, error: 'Esse endereço acabou de ser reservado por outra pessoa. Tente outro.' };
    }
    return { success: false, error: 'Não foi possível salvar. Tente de novo.' };
  }
}

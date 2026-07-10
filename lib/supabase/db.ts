import { isSupabaseConfigured, supabase, supabaseAdmin, getSupabaseAdmin } from './client';
import { mockDb } from './mockDb';
import {
  Professional, Profile, Service, AvailabilityRule,
  TimeBlock, Setting, Client, Appointment, AppointmentStatus,
  Transaction, Task, FixedExpense, Salon, WaitlistEntry, WaitlistStatus,
  WhatsAppSettings, WhatsAppConversation, GoogleCalendarConnection,
  AnamnesisForm, AnamnesisResponse
} from '@/types/database';
import { syncAppointmentToGoogle } from '@/lib/google/calendar';

/**
 * Cliente de banco para uso EXCLUSIVO no servidor.
 * O app autentica via cookie próprio (não usa a sessão RLS do Supabase),
 * portanto as leituras/escritas server-side usam o service-role e a
 * autorização é feita na camada de actions/sessão.
 */
const getDb = () => getSupabaseAdmin() || supabase;

/** Detecta erro de "tabela não existe" (PostgREST 42P01 / PGRST205). */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01'
    || error.code === 'PGRST205'
    || /does not exist|could not find the table|schema cache/i.test(error.message || '');
}

function warnMigration(table: string) {
  console.warn(`[${table}] Tabela ausente — rode supabase/migration_v3.sql no Supabase para ativar o módulo.`);
}

/** Valida formato UUID (colunas id são UUID — nunca gravar id improvisado). */
function isUuid(v: unknown): boolean {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

/** Erro do Postgres "coluna não existe" (42703) — usado p/ fallback gracioso
 *  quando uma migração opcional (ex.: v24 cost_cents) ainda não foi rodada. */
function isMissingColumnError(error: unknown, column: string): boolean {
  const e = error as { code?: string; message?: string } | null;
  return !!e && (e.code === '42703' || (typeof e.message === 'string' && e.message.includes(column)));
}

/** Remove uma chave de um objeto (cópia rasa). */
function omitKey<T extends Record<string, unknown>>(obj: T, key: string): Omit<T, string> {
  const { [key]: _drop, ...rest } = obj;
  return rest;
}

/**
 * Máximo de mensagens guardadas por conversa do WhatsApp. O histórico inteiro
 * em JSON é o que mais incha o banco no plano Free; o contexto antigo já é
 * preservado em client_summary, então mantemos só as últimas N trocas.
 */
const MAX_CONVERSATION_MESSAGES = 40;
function capMessages<T>(messages: T[] | undefined | null): T[] {
  if (!Array.isArray(messages)) return [];
  return messages.length > MAX_CONVERSATION_MESSAGES
    ? messages.slice(messages.length - MAX_CONVERSATION_MESSAGES)
    : messages;
}

export const dbService = {
  // Professionals
  getProfessionals: async (): Promise<Professional[]> => {
    if (isSupabaseConfigured) {
      // Lista ATIVA: ignora as profissionais na lixeira (deleted_at não nulo).
      // .is('deleted_at', null) com OR para bancos sem a coluna ainda (pré-v23):
      // se a coluna não existir, o filtro falha — então usamos try/fallback.
      const q = getDb().from('professionals').select('*').order('name');
      const { data, error } = await q.is('deleted_at', null);
      if (error) {
        if (error.code === '42703') { // coluna deleted_at ausente (migração v23 pendente)
          const { data: d2, error: e2 } = await getDb().from('professionals').select('*').order('name');
          if (e2) throw e2;
          return d2 || [];
        }
        throw error;
      }
      return data || [];
    }
    return mockDb.getProfessionals();
  },

  // Profissionais na LIXEIRA (soft-deleted) — para a tela de lixeira do admin.
  getTrashedProfessionals: async (): Promise<Professional[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('professionals')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) { if (error.code === '42703') return []; throw error; }
      return data || [];
    }
    return [];
  },

  getProfessionalBySlug: async (slug: string): Promise<Professional | null> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('professionals')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      // Profissional na lixeira não tem página pública (some do ar).
      if (data && data.deleted_at) return null;
      return data;
    }
    return mockDb.getProfessionalBySlug(slug);
  },

  getProfessionalById: async (id: string): Promise<Professional | null> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('professionals')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    return mockDb.getProfessionalById(id);
  },

  upsertProfessional: async (data: Partial<Professional> & { id: string }): Promise<Professional> => {
    if (isSupabaseConfigured) {
      // UPDATE por id (não upsert): a profissional sempre já existe aqui. Um .upsert()
      // vira INSERT ... ON CONFLICT no Postgres e monta um candidato a inserção sem os
      // campos NOT NULL não enviados (ex.: slug) — o que viola a constraint e quebra a
      // edição. A criação tem caminho próprio (createProfessional).
      const { id, ...patch } = data;
      const { data: result, error } = await getDb()
        .from('professionals')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    }
    return mockDb.upsertProfessional(data);
  },

  createProfessional: async (data: Omit<Professional, 'created_at' | 'updated_at'>): Promise<Professional> => {
    if (isSupabaseConfigured) {
      const client = getSupabaseAdmin() || supabaseAdmin || supabase;
      // 1. Criar o profissional
      const { data: result, error } = await client
        .from('professionals')
        .insert(data)
        .select()
        .single();
      if (error) throw error;

      // 2. Criar as configurações padrão para o profissional
      const defaultSettings = {
        professional_id: result.id,
        confirmation_mode: 'manual',
        min_notice_hours: 3,
        max_days_ahead: 30,
        default_slot_interval_minutes: 30,
        default_buffer_minutes: 15,
        whatsapp_confirmation_message: 'Oi, {nome}! Tudo bem? Passando para confirmar seu agendamento de {servico} no dia {data} às {horario}.',
        whatsapp_cancel_message: 'Oi, {nome}! Seu agendamento de {servico} no dia {data} às {horario} precisou ser cancelado. Motivo: {motivo}.',
        show_price_public: true
      };
      const { error: settingsError } = await client
        .from('settings')
        .insert(defaultSettings);
      if (settingsError) console.error('Erro ao inicializar settings:', settingsError);

      // 3. Criar as regras de disponibilidade padrão (Seg-Sex 9-18 com almoço 12-13, Sab 8-13)
      const defaultRules = [];
      for (let weekday = 0; weekday <= 6; weekday++) {
        defaultRules.push({
          professional_id: result.id,
          weekday,
          start_time: weekday === 6 ? '08:00:00' : '09:00:00',
          end_time: weekday === 6 ? '13:00:00' : '18:00:00',
          break_start: weekday === 6 ? null : '12:00:00',
          break_end: weekday === 6 ? null : '13:00:00',
          slot_interval_minutes: 30,
          buffer_minutes: 15,
          is_active: weekday !== 0 // Inativo no Domingo (0)
        });
      }
      const { error: rulesError } = await client
        .from('availability_rules')
        .insert(defaultRules);
      if (rulesError) console.error('Erro ao inicializar disponibilidade:', rulesError);

      return result;
    }
    return mockDb.createProfessional(data);
  },

  // Profiles
  getProfiles: async (): Promise<Profile[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('profiles')
        .select('*');
      if (error) throw error;
      return data || [];
    }
    return mockDb.getProfiles();
  },

  getProfileByEmail: async (email: string): Promise<Profile | null> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('profiles')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    return mockDb.getProfileByEmail(email);
  },

  getProfileByAuthUserId: async (uid: string): Promise<Profile | null> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('profiles')
        .select('*')
        .eq('auth_user_id', uid)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    return mockDb.getProfileByAuthUserId(uid);
  },

  createProfile: async (data: Omit<Profile, 'created_at' | 'updated_at'>): Promise<Profile> => {
    if (isSupabaseConfigured) {
      const client = getSupabaseAdmin() || supabaseAdmin || supabase;
      const { data: result, error } = await client
        .from('profiles')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    }
    return mockDb.createProfile(data);
  },

  // Services
  getServices: async (): Promise<Service[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('services')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    }
    return mockDb.getServices();
  },

  getServicesByProfessional: async (profId: string): Promise<Service[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('services')
        .select('*')
        .eq('professional_id', profId)
        .order('name');
      if (error) throw error;
      return data || [];
    }
    return mockDb.getServicesByProfessional(profId);
  },

  getServiceById: async (id: string): Promise<Service | null> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('services')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    return mockDb.getServiceById(id);
  },

  // Cria um serviço deixando o banco gerar o UUID (NÃO passar id manual — services.id é UUID)
  createService: async (data: Omit<Service, 'id' | 'created_at' | 'updated_at'>): Promise<Service> => {
    if (isSupabaseConfigured) {
      const { data: result, error } = await getDb()
        .from('services')
        .insert(data)
        .select()
        .single();
      // Fallback: coluna cost_cents ainda não existe (migração v24 não rodada).
      if (error && isMissingColumnError(error, 'cost_cents')) {
        const { data: retry, error: retryErr } = await getDb()
          .from('services').insert(omitKey(data as Record<string, unknown>, 'cost_cents')).select().single();
        if (retryErr) throw retryErr;
        return retry;
      }
      if (error) throw error;
      return result;
    }
    return mockDb.createService(data);
  },

  upsertService: async (data: Partial<Service> & { id: string; professional_id: string }): Promise<Service> => {
    if (isSupabaseConfigured) {
      const { id, professional_id, ...patch } = data;
      // UPDATE escopado por id + professional_id: garante que a profissional só
      // edita os PRÓPRIOS serviços (um id de outra profissional não casa nenhuma linha).
      // Se o id não for um UUID válido, é criação → insere deixando o banco gerar o id.
      if (isUuid(id)) {
        const payload = { ...patch, professional_id, updated_at: new Date().toISOString() };
        const { data: result, error } = await getDb()
          .from('services').update(payload).eq('id', id).eq('professional_id', professional_id).select().single();
        if (error && isMissingColumnError(error, 'cost_cents')) {
          const { data: retry, error: retryErr } = await getDb()
            .from('services').update(omitKey(payload, 'cost_cents')).eq('id', id).eq('professional_id', professional_id).select().single();
          if (retryErr) throw retryErr;
          return retry;
        }
        if (error) throw error;
        return result;
      }
      const insertPayload = { ...patch, professional_id };
      const { data: result, error } = await getDb()
        .from('services').insert(insertPayload).select().single();
      if (error && isMissingColumnError(error, 'cost_cents')) {
        const { data: retry, error: retryErr } = await getDb()
          .from('services').insert(omitKey(insertPayload, 'cost_cents')).select().single();
        if (retryErr) throw retryErr;
        return retry;
      }
      if (error) throw error;
      return result;
    }
    return mockDb.upsertService(data);
  },

  deleteService: async (id: string, professionalId: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb()
        .from('services')
        .delete()
        .eq('id', id)
        .eq('professional_id', professionalId);
      if (error) throw error;
      return true;
    }
    return mockDb.deleteService(id);
  },

  // AvailabilityRules
  getAvailabilityRulesByProfessional: async (profId: string): Promise<AvailabilityRule[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('availability_rules')
        .select('*')
        .eq('professional_id', profId)
        .order('weekday');
      if (error) throw error;
      return data || [];
    }
    return mockDb.getAvailabilityRulesByProfessional(profId);
  },

  upsertAvailabilityRule: async (data: Partial<AvailabilityRule> & { professional_id: string; weekday: number }): Promise<AvailabilityRule> => {
    if (isSupabaseConfigured) {
      const { data: result, error } = await getDb()
        .from('availability_rules')
        .upsert(data, { onConflict: 'professional_id,weekday' })
        .select()
        .single();
      if (error) throw error;
      return result;
    }
    return mockDb.upsertAvailabilityRule(data);
  },

  // TimeBlocks
  getTimeBlocksByProfessional: async (profId: string): Promise<TimeBlock[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('time_blocks')
        .select('*')
        .eq('professional_id', profId)
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return mockDb.getTimeBlocksByProfessional(profId);
  },

  createTimeBlock: async (data: Omit<TimeBlock, 'id' | 'created_at'>): Promise<TimeBlock> => {
    if (isSupabaseConfigured) {
      const { data: result, error } = await getDb()
        .from('time_blocks')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    }
    return mockDb.createTimeBlock(data);
  },

  deleteTimeBlock: async (id: string, professionalId: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb()
        .from('time_blocks')
        .delete()
        .eq('id', id)
        .eq('professional_id', professionalId);
      if (error) throw error;
      return true;
    }
    return mockDb.deleteTimeBlock(id);
  },

  // Settings
  getSettingsByProfessional: async (profId: string): Promise<Setting | null> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('settings')
        .select('*')
        .eq('professional_id', profId)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    return mockDb.getSettingsByProfessional(profId);
  },

  upsertSettings: async (data: Partial<Setting> & { professional_id: string }): Promise<Setting> => {
    if (isSupabaseConfigured) {
      // Campos opcionais que dependem de migração — gravados SEPARADAMENTE, cada um em
      // seu próprio comando best-effort. Assim, se UMA coluna não existir no banco (migração
      // pendente), ela apenas não persiste e avisa no log — sem derrubar o salvamento das
      // demais nem retornar erro para a profissional.
      const { requires_deposit, deposit_instructions, booking_theme, public_slots_limit, ...core } = data as Partial<Setting> & { professional_id: string };
      const { data: result, error } = await getDb()
        .from('settings')
        .upsert(core, { onConflict: 'professional_id' })
        .select()
        .single();
      if (error) throw error;

      // Cada campo opcional é aplicado isoladamente — um faltando não afeta os outros.
      const optional: Array<{ key: keyof Setting; value: unknown; migration: string }> = [
        { key: 'requires_deposit', value: requires_deposit, migration: 'migration_v2.sql' },
        { key: 'deposit_instructions', value: deposit_instructions, migration: 'migration_v2.sql' },
        { key: 'booking_theme', value: booking_theme, migration: 'migration_v4.sql' },
        { key: 'public_slots_limit', value: public_slots_limit, migration: 'migration_v7.sql' },
      ];
      for (const { key, value, migration } of optional) {
        if (value === undefined) continue;
        const { error: optErr } = await getDb()
          .from('settings')
          .update({ [key]: value })
          .eq('professional_id', data.professional_id);
        if (optErr) {
          console.warn(`[settings] Coluna "${String(key)}" ausente — rode supabase/${migration}:`, optErr.message);
        } else {
          (result as Record<string, unknown>)[key as string] = value;
        }
      }

      return result;
    }
    return mockDb.upsertSettings(data);
  },

  // Clients
  getClientsByProfessional: async (profId: string): Promise<Client[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('clients')
        .select('*')
        .eq('professional_id', profId)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data || [];
    }
    return mockDb.getClientsByProfessional(profId);
  },

  // Clientes na lixeira (soft-deleted) — para a tela de Lixeira
  getTrashedClients: async (profId: string): Promise<Client[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('clients')
        .select('*')
        .eq('professional_id', profId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) { if (isMissingTable(error)) return []; throw error; }
      return data || [];
    }
    return [];
  },

  getClientById: async (id: string): Promise<Client | null> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    return mockDb.getClientById(id);
  },

  // Best-effort: grava aniversário da cliente (requer migração v2). Erros de coluna ausente são ignorados.
  setClientBirthday: async (professionalId: string, whatsapp: string, birthday: string): Promise<void> => {
    if (!isSupabaseConfigured) {
      return mockDb.setClientBirthday?.(professionalId, whatsapp, birthday);
    }
    try {
      const { error } = await getDb()
        .from('clients')
        .update({ birthday })
        .eq('professional_id', professionalId)
        .eq('whatsapp', whatsapp);
      if (error) console.warn('[clients] Coluna birthday ausente — rode supabase/migration_v2.sql:', error.message);
    } catch (e) {
      console.warn('[clients] Falha ao gravar aniversário:', e instanceof Error ? e.message : e);
    }
  },

  createClient: async (data: Omit<Client, 'id' | 'total_appointments' | 'last_appointment_at' | 'created_at'>): Promise<Client> => {
    if (isSupabaseConfigured) {
      const { data: result, error } = await getDb()
        .from('clients')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    }
    return mockDb.createClient(data);
  },

  // Cria a cliente pelo contato WhatsApp se ainda não existir (nunca sobrescreve dados existentes).
  upsertWhatsAppClient: async (professionalId: string, phone: string, name: string): Promise<void> => {
    if (!isSupabaseConfigured) return;
    const { error } = await getDb()
      .from('clients')
      .upsert(
        { professional_id: professionalId, whatsapp: phone, name: name || phone },
        { onConflict: 'professional_id,whatsapp', ignoreDuplicates: true }
      );
    if (error) console.warn('[clients] upsertWhatsAppClient:', error.message);
  },

  // Ficha técnica / observações da cliente (requer migração v7). Retorna false se a coluna não existir.
  updateClientNotes: async (id: string, notes: string, professionalId?: string): Promise<boolean> => {
    if (!isSupabaseConfigured) {
      mockDb.updateClient(id, { notes });
      return true;
    }
    let q = getDb().from('clients').update({ notes }).eq('id', id);
    if (professionalId) q = q.eq('professional_id', professionalId);
    const { error } = await q;
    if (error) {
      console.warn('[clients] Coluna notes ausente — rode supabase/migration_v7.sql:', error.message);
      return false;
    }
    return true;
  },

  // Appointments
  getAppointmentsByProfessional: async (profId: string): Promise<Appointment[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('appointments')
        .select('*, service:services(*)')
        .eq('professional_id', profId)
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return mockDb.getAppointmentsByProfessional(profId);
  },

  // Agendamentos de UM dia específico (filtro no banco, não em JS). Usado pelo
  // cálculo de horários livres — evita carregar todo o histórico a cada consulta
  // (o bot chama isto várias vezes por mensagem). Requer índice (professional_id, date).
  getAppointmentsByProfessionalAndDate: async (profId: string, dateStr: string): Promise<Appointment[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('appointments')
        .select('*, service:services(*)')
        .eq('professional_id', profId)
        .eq('date', dateStr)
        .is('deleted_at', null)
        .neq('status', 'cancelled');
      if (error) throw error;
      return data || [];
    }
    return mockDb.getAppointmentsByProfessional(profId).filter(a => a.date === dateStr && a.status !== 'cancelled');
  },

  // Agendamentos de um INTERVALO de datas (uma consulta só). Usado para marcar de
  // uma vez os dias sem horário na página pública. Já vem sem cancelados/lixeira.
  getAppointmentsByProfessionalInRange: async (profId: string, startDate: string, endDate: string): Promise<Appointment[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('appointments')
        .select('id, date, start_time, end_time, status')
        .eq('professional_id', profId)
        .gte('date', startDate)
        .lte('date', endDate)
        .is('deleted_at', null)
        .neq('status', 'cancelled');
      if (error) throw error;
      return (data || []) as Appointment[];
    }
    return mockDb.getAppointmentsByProfessional(profId)
      .filter(a => a.date >= startDate && a.date <= endDate && a.status !== 'cancelled');
  },

  // Agendamentos na lixeira (soft-deleted) — para a tela de Lixeira
  getTrashedAppointments: async (profId: string): Promise<Appointment[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('appointments')
        .select('*, service:services(*)')
        .eq('professional_id', profId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) { if (isMissingTable(error)) return []; throw error; }
      return data || [];
    }
    return [];
  },

  getAppointmentsByClient: async (clientId: string): Promise<Appointment[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('appointments')
        .select('*, service:services(*)')
        .eq('client_id', clientId)
        .is('deleted_at', null)
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return mockDb.getAppointmentsByClient(clientId);
  },

  getAppointmentById: async (id: string): Promise<Appointment | null> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('appointments')
        .select('*, service:services(*), professional:professionals(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    return mockDb.getAppointmentById(id);
  },

  createAppointment: async (data: Omit<Appointment, 'id' | 'status' | 'created_at' | 'updated_at'>): Promise<Appointment> => {
    if (isSupabaseConfigured) {
      const nowStr = new Date().toISOString();
      const clientAdmin = getSupabaseAdmin() || supabaseAdmin || supabase;
      
      // 1. Garantir que o cliente existe
      let { data: client, error: clientErr } = await clientAdmin
        .from('clients')
        .select('*')
        .eq('professional_id', data.professional_id)
        .eq('whatsapp', data.client_whatsapp)
        .maybeSingle();

      if (clientErr) throw clientErr;

      if (!client) {
        // Criar cliente
        const { data: newClient, error: createClientErr } = await clientAdmin
          .from('clients')
          .insert({
            professional_id: data.professional_id,
            name: data.client_name,
            whatsapp: data.client_whatsapp,
            email: data.client_email,
            total_appointments: 1,
            last_appointment_at: nowStr
          })
          .select()
          .single();
        if (createClientErr) throw createClientErr;
        client = newClient;
      } else {
        // Atualizar cliente
        const { error: updateClientErr } = await clientAdmin
          .from('clients')
          .update({
            total_appointments: (client.total_appointments || 0) + 1,
            last_appointment_at: nowStr,
            name: data.client_name, // atualizar caso mude
            email: data.client_email // atualizar caso mude
          })
          .eq('id', client.id);
        if (updateClientErr) throw updateClientErr;
      }

      // 2. Criar agendamento
      const { data: appointment, error: appErr } = await clientAdmin
        .from('appointments')
        .insert({
          professional_id: data.professional_id,
          service_id: data.service_id,
          service_ids: data.service_ids && data.service_ids.length ? data.service_ids : null,
          client_id: client.id,
          client_name: data.client_name,
          client_whatsapp: data.client_whatsapp,
          client_email: data.client_email,
          date: data.date,
          start_time: data.start_time,
          end_time: data.end_time,
          status: 'pending',
          notes: data.notes,
          payment_method: data.payment_method ?? null,
        })
        .select()
        .single();
      if (appErr) throw appErr;

      // Fire-and-forget: sincronizar com Google Calendar
      syncAppointmentToGoogle(data.professional_id, appointment, 'create').catch(() => {});

      return appointment;
    }
    
    return mockDb.createAppointment(data);
  },

  updateAppointmentStatus: async (id: string, status: AppointmentStatus, cancellationReason?: string, professionalId?: string): Promise<Appointment | null> => {
    if (isSupabaseConfigured) {
      const patch: Record<string, unknown> = {
        status,
        cancellation_reason: cancellationReason || null,
        updated_at: new Date().toISOString(),
      };
      // Cancelamento: zera flags para não disparar se o agendamento for reativado
      // Reativação / confirmação: zera flags para as automações voltarem a disparar
      if (status === 'cancelled' || status === 'pending' || status === 'confirmed') {
        patch.automation_booking_sent_at = null;
        patch.automation_day_before_sent_at = null;
        patch.automation_day_of_sent_at = null;
        patch.automation_5days_sent_at = null;
      }
      let q = getDb().from('appointments').update(patch).eq('id', id);
      // Escopo por dono quando informado (chamadas de painel): impede alterar
      // agendamento de outra profissional via id arbitrário.
      if (professionalId) q = q.eq('professional_id', professionalId);
      const { data, error } = await q.select().maybeSingle();
      if (error) throw error;

      // Fire-and-forget: sincronizar com Google Calendar
      if (data && (status === 'cancelled')) {
        syncAppointmentToGoogle(data.professional_id, data, 'delete').catch(() => {});
      } else if (data) {
        syncAppointmentToGoogle(data.professional_id, data, 'update').catch(() => {});
      }

      return data;
    }
    return mockDb.updateAppointmentStatus(id, status, cancellationReason);
  },

  updateAppointment: async (
    id: string,
    patch: Partial<Pick<Appointment, 'date' | 'start_time' | 'end_time' | 'service_id' | 'service_ids' | 'notes' | 'status' | 'payment_method'>>,
    professionalId?: string
  ): Promise<Appointment | null> => {
    if (isSupabaseConfigured) {
      const dbPatch: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
      // Normaliza multi-serviço: array vazio vira NULL (usa service_id)
      if ('service_ids' in patch) {
        dbPatch.service_ids = patch.service_ids && patch.service_ids.length ? patch.service_ids : null;
      }
      // Remarcação: se data ou horário mudaram, zera automações para dispararem na nova data
      if (patch.date || patch.start_time || patch.end_time) {
        dbPatch.automation_booking_sent_at = null;
        dbPatch.automation_day_before_sent_at = null;
        dbPatch.automation_day_of_sent_at = null;
        dbPatch.automation_5days_sent_at = null;
      }
      let q = getDb().from('appointments').update(dbPatch).eq('id', id);
      if (professionalId) q = q.eq('professional_id', professionalId);
      const { data, error } = await q.select('*, service:services(*)').maybeSingle();
      if (error) throw error;

      // Fire-and-forget: sincronizar com Google Calendar
      if (data) {
        syncAppointmentToGoogle(data.professional_id, data, 'update').catch(() => {});
      }

      return data;
    }
    return null;
  },

  updateAppointmentSchedule: async (id: string, date: string, startTime: string, endTime: string, professionalId?: string): Promise<Appointment | null> => {
    if (isSupabaseConfigured) {
      let q = getDb()
        .from('appointments')
        .update({
          date,
          start_time: startTime,
          end_time: endTime,
          // Remarcação: zera todas as flags para que as automações disparem na nova data
          automation_booking_sent_at: null,
          automation_day_before_sent_at: null,
          automation_day_of_sent_at: null,
          automation_5days_sent_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (professionalId) q = q.eq('professional_id', professionalId);
      const { data, error } = await q.select().maybeSingle();
      if (error) throw error;
      return data;
    }
    return mockDb.updateAppointmentSchedule(id, date, startTime, endTime);
  },

  // Soft-delete: manda o agendamento para a lixeira (não apaga de verdade) e
  // remove a receita automática vinculada (se houver).
  deleteAppointment: async (id: string, professionalId: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb()
        .from('appointments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('professional_id', professionalId);
      if (error) throw error;
      await dbService.deleteTransactionsByAppointment(id).catch(() => {});
      return true;
    }
    return mockDb.deleteAppointment(id);
  },

  restoreAppointment: async (id: string, professionalId: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb()
        .from('appointments')
        .update({ deleted_at: null })
        .eq('id', id)
        .eq('professional_id', professionalId);
      if (error) throw error;
      // Se voltar como concluído, recria a receita automática
      await dbService.syncAppointmentRevenue(id).catch(() => {});
      return true;
    }
    return true;
  },

  // Exclusão DEFINITIVA (esvaziar a lixeira)
  purgeAppointment: async (id: string, professionalId: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb().from('appointments').delete().eq('id', id).eq('professional_id', professionalId);
      if (error) throw error;
      return true;
    }
    return mockDb.deleteAppointment(id);
  },

  // ===================== TRANSACTIONS (FINANCEIRO) =====================
  getTransactionsByProfessional: async (profId: string): Promise<Transaction[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('transactions')
        .select('*')
        .eq('professional_id', profId)
        .order('date', { ascending: false });
      if (error) {
        if (isMissingTable(error)) { warnMigration('transactions'); return []; }
        throw error;
      }
      return data || [];
    }
    return mockDb.getTransactionsByProfessional(profId);
  },

  createTransaction: async (data: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> => {
    if (isSupabaseConfigured) {
      const { data: result, error } = await getDb()
        .from('transactions')
        .insert(data)
        .select()
        .single();
      if (error) {
        if (isMissingTable(error)) throw new Error('Módulo financeiro não ativado. Rode supabase/migration_v3.sql no Supabase.');
        throw error;
      }
      return result;
    }
    return mockDb.createTransaction(data);
  },

  deleteTransaction: async (id: string, professionalId: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb().from('transactions').delete().eq('id', id).eq('professional_id', professionalId);
      if (error && !isMissingTable(error)) throw error;
      return true;
    }
    return mockDb.deleteTransaction(id);
  },

  // Remove as entradas de receita automática vinculadas a um agendamento
  deleteTransactionsByAppointment: async (appointmentId: string): Promise<void> => {
    if (!isSupabaseConfigured) return;
    const { error } = await getDb().from('transactions').delete().eq('appointment_id', appointmentId);
    if (error && !isMissingTable(error)) console.warn('[financeiro] limpar receita do agendamento:', error.message);
  },

  // Sincroniza a receita automática do agendamento com seu status:
  // status 'completed' → garante 1 entrada (soma dos serviços); outro status → remove a entrada.
  syncAppointmentRevenue: async (appointmentId: string): Promise<void> => {
    if (!isSupabaseConfigured) return;
    try {
      const appt = await dbService.getAppointmentById(appointmentId);
      if (!appt || appt.deleted_at) { await dbService.deleteTransactionsByAppointment(appointmentId); return; }

      if (appt.status !== 'completed') {
        await dbService.deleteTransactionsByAppointment(appointmentId);
        return;
      }

      // Já existe receita para este agendamento? Então não duplica.
      const { data: existing } = await getDb()
        .from('transactions').select('id').eq('appointment_id', appointmentId).limit(1);
      if (existing && existing.length) return;

      const ids = appt.service_ids && appt.service_ids.length ? appt.service_ids : [appt.service_id];
      const services = await dbService.getServicesByIds(ids);
      const totalCents = services.reduce((sum, s) => sum + (s.price_cents || 0), 0);
      if (totalCents <= 0) return;
      const serviceNames = services.map(s => s.name).join(' + ') || 'Atendimento';

      await dbService.createTransaction({
        professional_id: appt.professional_id,
        type: 'income',
        amount_cents: totalCents,
        category: 'Atendimento',
        description: `${appt.client_name} — ${serviceNames}`,
        date: appt.date,
        appointment_id: appointmentId,
      }).catch(() => {});
    } catch (e) {
      console.warn('[financeiro] syncAppointmentRevenue falhou:', e instanceof Error ? e.message : e);
    }
  },

  getServicesByIds: async (ids: string[]): Promise<Service[]> => {
    if (!ids.length) return [];
    if (isSupabaseConfigured) {
      const { data, error } = await getDb().from('services').select('*').in('id', ids);
      if (error) throw error;
      // Preserva a ordem solicitada
      const map = new Map((data || []).map((s: Service) => [s.id, s]));
      return ids.map(id => map.get(id)).filter(Boolean) as Service[];
    }
    const all = mockDb.getServicesByProfessional('');
    return ids.map(id => all.find(s => s.id === id)).filter(Boolean) as Service[];
  },

  // ===================== TASKS (NOTAS / TAREFAS) =====================
  getTasksByProfessional: async (profId: string): Promise<Task[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('tasks')
        .select('*')
        .eq('professional_id', profId)
        .order('created_at', { ascending: false });
      if (error) {
        if (isMissingTable(error)) { warnMigration('tasks'); return []; }
        throw error;
      }
      return data || [];
    }
    return mockDb.getTasksByProfessional(profId);
  },

  createTask: async (data: Omit<Task, 'id' | 'done' | 'created_at'>): Promise<Task> => {
    if (isSupabaseConfigured) {
      // due_date/due_time dependem da migração v5 — gravados em best-effort
      const { due_date, due_time, ...core } = data;
      const { data: result, error } = await getDb()
        .from('tasks')
        .insert({ ...core, done: false })
        .select()
        .single();
      if (error) {
        if (isMissingTable(error)) throw new Error('Lista de tarefas não ativada. Rode supabase/migration_v3.sql no Supabase.');
        throw error;
      }
      if (due_date !== undefined || due_time !== undefined) {
        const extra: Record<string, unknown> = {};
        if (due_date !== undefined) extra.due_date = due_date;
        if (due_time !== undefined) extra.due_time = due_time;
        const { error: e2 } = await getDb().from('tasks').update(extra).eq('id', result.id);
        if (e2) console.warn('[tasks] due_date/due_time ausentes — rode supabase/migration_v5.sql:', e2.message);
        else Object.assign(result as object, extra);
      }
      return result;
    }
    return mockDb.createTask(data);
  },

  toggleTask: async (id: string, done: boolean, professionalId?: string): Promise<Task | null> => {
    if (isSupabaseConfigured) {
      let q = getDb().from('tasks').update({ done }).eq('id', id);
      if (professionalId) q = q.eq('professional_id', professionalId);
      const { data, error } = await q.select().maybeSingle();
      if (error) { if (isMissingTable(error)) return null; throw error; }
      return data;
    }
    return mockDb.toggleTask(id, done);
  },

  // Atualiza conteúdo/horário da tarefa (due_date/due_time best-effort — migração v5)
  updateTask: async (id: string, fields: Partial<Pick<Task, 'content' | 'done' | 'due_date' | 'due_time'>>, professionalId?: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { due_date, due_time, ...core } = fields;
      if (Object.keys(core).length) {
        let q = getDb().from('tasks').update(core).eq('id', id);
        if (professionalId) q = q.eq('professional_id', professionalId);
        const { error } = await q;
        if (error && !isMissingTable(error)) throw error;
      }
      if (due_date !== undefined || due_time !== undefined) {
        const extra: Record<string, unknown> = {};
        if (due_date !== undefined) extra.due_date = due_date;
        if (due_time !== undefined) extra.due_time = due_time;
        let q = getDb().from('tasks').update(extra).eq('id', id);
        if (professionalId) q = q.eq('professional_id', professionalId);
        const { error } = await q;
        if (error && !isMissingTable(error)) console.warn('[tasks] due fields ausentes — rode supabase/migration_v5.sql:', error.message);
      }
      return true;
    }
    return mockDb.updateTask(id, fields);
  },

  deleteTask: async (id: string, professionalId: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb().from('tasks').delete().eq('id', id).eq('professional_id', professionalId);
      if (error && !isMissingTable(error)) throw error;
      return true;
    }
    return mockDb.deleteTask(id);
  },

  // Exclusão de clientes (individual / lote / todos) — agora SOFT-DELETE (vai para a lixeira)
  deleteClient: async (id: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb().from('clients').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      return true;
    }
    return mockDb.deleteClient(id);
  },

  deleteClientsByIds: async (ids: string[], professionalId: string): Promise<boolean> => {
    if (!ids.length) return true;
    if (isSupabaseConfigured) {
      const { error } = await getDb().from('clients').update({ deleted_at: new Date().toISOString() })
        .in('id', ids).eq('professional_id', professionalId);
      if (error) throw error;
      return true;
    }
    return mockDb.deleteClientsByIds(ids);
  },

  deleteAllClientsForProfessional: async (profId: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb().from('clients').update({ deleted_at: new Date().toISOString() })
        .eq('professional_id', profId).is('deleted_at', null);
      if (error) throw error;
      return true;
    }
    return mockDb.deleteAllClientsForProfessional(profId);
  },

  restoreClients: async (ids: string[], professionalId: string): Promise<boolean> => {
    if (!ids.length) return true;
    if (isSupabaseConfigured) {
      const { error } = await getDb().from('clients').update({ deleted_at: null })
        .in('id', ids).eq('professional_id', professionalId);
      if (error) throw error;
      return true;
    }
    return true;
  },

  // Exclusão DEFINITIVA de clientes (esvaziar a lixeira)
  purgeClients: async (ids: string[], professionalId: string): Promise<boolean> => {
    if (!ids.length) return true;
    if (isSupabaseConfigured) {
      const { error } = await getDb().from('clients').delete().in('id', ids).eq('professional_id', professionalId);
      if (error) throw error;
      return true;
    }
    return mockDb.deleteClientsByIds(ids);
  },

  // ===================== FIXED EXPENSES (CONTAS FIXAS) =====================
  getFixedExpensesByProfessional: async (profId: string): Promise<FixedExpense[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('fixed_expenses')
        .select('*')
        .eq('professional_id', profId)
        .order('name', { ascending: true });
      if (error) {
        if (isMissingTable(error)) { warnMigration('fixed_expenses'); return []; }
        throw error;
      }
      return data || [];
    }
    return mockDb.getFixedExpensesByProfessional(profId);
  },

  createFixedExpense: async (data: Omit<FixedExpense, 'id' | 'active' | 'created_at'>): Promise<FixedExpense> => {
    if (isSupabaseConfigured) {
      const { data: result, error } = await getDb()
        .from('fixed_expenses')
        .insert({ ...data, active: true })
        .select()
        .single();
      if (error) {
        if (isMissingTable(error)) throw new Error('Contas fixas não ativadas. Rode supabase/migration_v3.sql no Supabase.');
        throw error;
      }
      return result;
    }
    return mockDb.createFixedExpense(data);
  },

  deleteFixedExpense: async (id: string, professionalId: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb().from('fixed_expenses').delete().eq('id', id).eq('professional_id', professionalId);
      if (error && !isMissingTable(error)) throw error;
      return true;
    }
    return mockDb.deleteFixedExpense(id);
  },

  // ===================== ADMIN (LEITURAS GLOBAIS DA PLATAFORMA) =====================
  // Estatísticas de armazenamento do banco (tamanho total + maiores tabelas).
  // Retorna null se a função get_db_stats não existir (rode migration_v21).
  getDatabaseStats: async (): Promise<{ dbSizeBytes: number; tables: { name: string; bytes: number }[] } | null> => {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await getDb().rpc('get_db_stats');
    if (error) {
      console.warn('[admin] get_db_stats indisponível — rode supabase/migration_v21_admin_stats.sql:', error.message);
      return null;
    }
    if (!data) return null;
    const d = data as { db_size_bytes?: number | string; tables?: { name: string; bytes: number | string }[] };
    return {
      dbSizeBytes: Number(d.db_size_bytes) || 0,
      tables: (d.tables || []).map(t => ({ name: t.name, bytes: Number(t.bytes) || 0 })),
    };
  },

  getAllAppointments: async (): Promise<Appointment[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('appointments')
        .select('*, service:services(*)')
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return mockDb.getAllAppointments();
  },

  getAllClients: async (): Promise<Client[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb().from('clients').select('*').is('deleted_at', null).order('name');
      if (error) throw error;
      return data || [];
    }
    return mockDb.getAllClients();
  },

  getAllTransactions: async (): Promise<Transaction[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb().from('transactions').select('*').order('date', { ascending: false });
      if (error) { if (isMissingTable(error)) { warnMigration('transactions'); return []; } throw error; }
      return data || [];
    }
    return mockDb.getAllTransactions();
  },

  // ===================== SALÕES =====================
  getSalons: async (): Promise<Salon[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb().from('salons').select('*').order('name');
      if (error) { if (isMissingTable(error)) { warnMigration('salons'); return []; } throw error; }
      return data || [];
    }
    return mockDb.getSalons();
  },

  getSalonById: async (id: string): Promise<Salon | null> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb().from('salons').select('*').eq('id', id).maybeSingle();
      if (error) { if (isMissingTable(error)) return null; throw error; }
      return data;
    }
    return mockDb.getSalonById(id);
  },

  createSalon: async (name: string): Promise<Salon> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb().from('salons').insert({ name }).select().single();
      if (error) {
        if (isMissingTable(error)) throw new Error('Grupos não ativados. Rode supabase/migration_v6.sql no Supabase.');
        throw error;
      }
      return data;
    }
    return mockDb.createSalon(name);
  },

  setProfessionalSalon: async (professionalId: string, salonId: string | null): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb().from('professionals').update({ salon_id: salonId }).eq('id', professionalId);
      if (error) throw error;
      return true;
    }
    return mockDb.setProfessionalSalon(professionalId, salonId);
  },

  // Move a profissional para a LIXEIRA (soft-delete): preserva todos os dados e o
  // login; só some das listas ativas e da página pública. Reversível com restore.
  softDeleteProfessional: async (id: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb().from('professionals').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) {
        if (error.code === '42703') throw new Error('Rode supabase/migration_v23_prof_trash.sql no Supabase para ativar a lixeira.');
        throw error;
      }
      return true;
    }
    return true;
  },

  // Restaura uma profissional da lixeira.
  restoreProfessional: async (id: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb().from('professionals').update({ deleted_at: null }).eq('id', id);
      if (error) throw error;
      return true;
    }
    return true;
  },

  // Exclui a profissional e TODOS os dados vinculados (cascade) + perfis de login
  deleteProfessional: async (id: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      // profiles.professional_id é ON DELETE SET NULL — removemos os perfis manualmente
      await getDb().from('profiles').delete().eq('professional_id', id);
      const { error } = await getDb().from('professionals').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    return mockDb.deleteProfessional(id);
  },

  // ===================== LISTA DE ESPERA =====================
  getWaitlistByProfessional: async (profId: string): Promise<WaitlistEntry[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('waitlist_entries')
        .select('*')
        .eq('professional_id', profId)
        .order('created_at', { ascending: false });
      if (error) {
        if (isMissingTable(error)) { warnMigration('waitlist_entries'); return []; }
        throw error;
      }
      return data || [];
    }
    return mockDb.getWaitlistByProfessional(profId);
  },

  getWaitlistEntryById: async (id: string): Promise<WaitlistEntry | null> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb().from('waitlist_entries').select('*').eq('id', id).maybeSingle();
      if (error) { if (isMissingTable(error)) return null; throw error; }
      return data;
    }
    return mockDb.getWaitlistEntryById(id);
  },

  createWaitlistEntry: async (data: Omit<WaitlistEntry, 'id' | 'created_at' | 'status'> & { status?: WaitlistStatus }): Promise<WaitlistEntry> => {
    if (isSupabaseConfigured) {
      const { data: result, error } = await getDb()
        .from('waitlist_entries')
        .insert(data)
        .select()
        .single();
      if (error) {
        if (isMissingTable(error)) throw new Error('Lista de espera não ativada. Rode supabase/migration_v7.sql no Supabase.');
        throw error;
      }
      return result;
    }
    return mockDb.createWaitlistEntry(data);
  },

  updateWaitlistStatus: async (id: string, status: WaitlistStatus): Promise<WaitlistEntry | null> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('waitlist_entries')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return mockDb.updateWaitlistStatus(id, status);
  },

  deleteWaitlistEntry: async (id: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb().from('waitlist_entries').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    return mockDb.deleteWaitlistEntry(id);
  },

  // ===================== PUSH NOTIFICATIONS =====================
  getPushSubscriptionsByProfessional: async (profId: string): Promise<any[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb().from('push_subscriptions').select('*').eq('professional_id', profId);
      if (error) { if (isMissingTable(error)) { warnMigration('push_subscriptions'); return []; } throw error; }
      return data || [];
    }
    return mockDb.getPushSubscriptionsByProfessional(profId);
  },

  savePushSubscription: async (data: { professional_id: string; endpoint: string; auth: string; p256dh: string }): Promise<any> => {
    if (isSupabaseConfigured) {
      // Usar upsert baseado no endpoint
      const { data: result, error } = await getDb()
        .from('push_subscriptions')
        .upsert(data, { onConflict: 'endpoint' })
        .select()
        .single();
      if (error) {
        if (isMissingTable(error)) throw new Error('Notificações não ativadas. Rode supabase/migration_push.sql no Supabase.');
        throw error;
      }
      return result;
    }
    return mockDb.savePushSubscription(data);
  },

  removePushSubscription: async (endpoint: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb().from('push_subscriptions').delete().eq('endpoint', endpoint);
      if (error && !isMissingTable(error)) throw error;
      return true;
    }
    return mockDb.removePushSubscription(endpoint);
  },

  // ── WhatsApp Bot ──────────────────────────────────────────────────────────

  getAllWhatsAppSettingsForCron: async (): Promise<WhatsAppSettings[]> => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await getDb()
      .from('whatsapp_settings')
      .select('*')
      .not('uazapi_url', 'is', null)
      .not('uazapi_token', 'is', null);
    if (error) return [];
    return data || [];
  },

  // TODAS as configurações de WhatsApp (inclusive não configuradas) — para o
  // painel admin medir a saúde do bot/automações por profissional.
  getAllWhatsAppSettings: async (): Promise<WhatsAppSettings[]> => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await getDb().from('whatsapp_settings').select('*');
    if (error) return [];
    return data || [];
  },

  // Registros na lixeira (soft-deleted) em TODA a rede — ocupam espaço no banco
  // até serem apagados de vez. Usado pelo card "Lixeira da rede" do admin.
  getNetworkTrashStats: async (): Promise<{ appointments: number; clients: number }> => {
    if (!isSupabaseConfigured) return { appointments: 0, clients: 0 };
    const countTrashed = async (table: string): Promise<number> => {
      const { count, error } = await getDb()
        .from(table)
        .select('id', { count: 'exact', head: true })
        .not('deleted_at', 'is', null);
      if (error) return 0;
      return count || 0;
    };
    const [appointments, clients] = await Promise.all([countTrashed('appointments'), countTrashed('clients')]);
    return { appointments, clients };
  },

  // Esvazia a lixeira da rede: apaga DEFINITIVAMENTE os registros soft-deleted
  // (libera espaço). Irreversível. Retorna quantos foram removidos.
  purgeNetworkTrash: async (): Promise<{ appointments: number; clients: number }> => {
    if (!isSupabaseConfigured) return { appointments: 0, clients: 0 };
    const purge = async (table: string): Promise<number> => {
      const { data, error } = await getDb().from(table).delete().not('deleted_at', 'is', null).select('id');
      if (error) { console.warn(`[admin] purgeNetworkTrash ${table}:`, error.message); return 0; }
      return data?.length ?? 0;
    };
    // Agendamentos primeiro (podem referenciar clients); depois clientes.
    const appointments = await purge('appointments');
    const clients = await purge('clients');
    return { appointments, clients };
  },

  // Total de conversas pausadas (clientes esperando atendimento humano) em TODA a
  // rede — usado no painel admin. Ignora os registros de diagnóstico (_debug_).
  getNetworkPendingConversationsCount: async (): Promise<number> => {
    if (!isSupabaseConfigured) return 0;
    const { count, error } = await getDb()
      .from('whatsapp_conversations')
      .select('id', { count: 'exact', head: true })
      .eq('bot_paused', true)
      .not('client_phone', 'like', '_debug_%');
    if (error) return 0;
    return count || 0;
  },

  markReminderSent: async (appointmentId: string, type: 'booking' | 'day_before' | 'day_of' | '5days'): Promise<void> => {
    const col = type === 'booking'
      ? 'automation_booking_sent_at'
      : type === 'day_before'
        ? 'automation_day_before_sent_at'
        : type === '5days'
          ? 'automation_5days_sent_at'
          : 'automation_day_of_sent_at';
    await getDb()
      .from('appointments')
      .update({ [col]: new Date().toISOString() })
      .eq('id', appointmentId);
  },

  /** Marca que o follow-up de "cliente sem retorno" foi enviado para este número. */
  markFollowupSent: async (professionalId: string, clientWhatsapp: string): Promise<void> => {
    await getDb()
      .from('clients')
      .update({ followup_sent_at: new Date().toISOString() })
      .eq('professional_id', professionalId)
      .eq('whatsapp', clientWhatsapp);
  },

  getWhatsAppSettings: async (professionalId: string): Promise<WhatsAppSettings | null> => {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await getDb()
      .from('whatsapp_settings')
      .select('*')
      .eq('professional_id', professionalId)
      .maybeSingle();
    if (error) {
      if (isMissingTable(error)) { warnMigration('whatsapp_settings'); return null; }
      throw error;
    }
    return data;
  },

  upsertWhatsAppSettings: async (
    professionalId: string,
    patch: Partial<Omit<WhatsAppSettings, 'id' | 'professional_id' | 'created_at' | 'updated_at' | 'webhook_secret'>>
  ): Promise<WhatsAppSettings> => {
    const { data, error } = await getDb()
      .from('whatsapp_settings')
      .upsert(
        { ...patch, professional_id: professionalId, updated_at: new Date().toISOString() },
        { onConflict: 'professional_id' }
      )
      .select()
      .single();
    if (error) {
      if (isMissingTable(error)) throw new Error('Rode supabase/migration_v8.sql no Supabase para ativar o bot WhatsApp.');
      if (error.code === '42703') throw new Error('Falta rodar uma migração no Supabase (migration_v16.sql para as automações 5 dias/follow-up; migration_v18.sql para a lista de números bloqueados).');
      throw error;
    }
    return data;
  },

  getWhatsAppConversation: async (
    professionalId: string,
    clientPhone: string
  ): Promise<WhatsAppConversation | null> => {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await getDb()
      .from('whatsapp_conversations')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('client_phone', clientPhone)
      .maybeSingle();
    if (error) {
      if (isMissingTable(error)) return null;
      throw error;
    }
    return data;
  },

  upsertWhatsAppConversation: async (
    professionalId: string,
    clientPhone: string,
    messages: WhatsAppConversation['messages'],
    clientSummary?: string,
    lastMessageAt?: number,
    botPaused?: boolean
  ): Promise<void> => {
    const payload: Record<string, unknown> = {
      professional_id: professionalId,
      client_phone: clientPhone,
      messages: capMessages(messages),
      last_message_at: lastMessageAt ? new Date(lastMessageAt).toISOString() : new Date().toISOString(),
    };
    // bot_paused só é sobrescrito quando explicitamente passado.
    // Sem isso, setBotPaused(true) seria anulado pelo save do histórico logo depois.
    if (botPaused !== undefined) payload.bot_paused = botPaused;
    if (clientSummary !== undefined) payload.client_summary = clientSummary;
    const { error } = await getDb()
      .from('whatsapp_conversations')
      .upsert(payload, { onConflict: 'professional_id,client_phone' });
    if (error && !isMissingTable(error)) throw error;
  },

  pauseWhatsAppConversation: async (
    professionalId: string,
    clientPhone: string
  ): Promise<void> => {
    const { error } = await getDb()
      .from('whatsapp_conversations')
      .update({ bot_paused: true })
      .eq('professional_id', professionalId)
      .eq('client_phone', clientPhone);
    if (error && !isMissingTable(error)) throw error;
  },

  setBotPaused: async (professionalId: string, clientPhone: string, paused: boolean): Promise<void> => {
    const { error } = await getDb()
      .from('whatsapp_conversations')
      .update({ bot_paused: paused })
      .eq('professional_id', professionalId)
      .eq('client_phone', clientPhone);
    if (error && !isMissingTable(error)) throw error;
  },

  setBotCooldown: async (professionalId: string, clientPhone: string, minutes: number): Promise<void> => {
    const until = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    // Tenta atualizar registro existente
    const { data, error: updErr } = await getDb()
      .from('whatsapp_conversations')
      .update({ bot_cooldown_until: until })
      .eq('professional_id', professionalId)
      .eq('client_phone', clientPhone)
      .select('id');
    if (updErr && !isMissingTable(updErr)) return;
    // Se não existia registro, cria um mínimo para guardar o cooldown
    if (!data || data.length === 0) {
      await getDb()
        .from('whatsapp_conversations')
        .insert({
          professional_id: professionalId,
          client_phone: clientPhone,
          messages: [],
          bot_paused: false,
          bot_cooldown_until: until,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single()
        .then(() => {})
        .catch(() => {});
    }
  },

  getUpcomingAppointmentsByPhone: async (professionalId: string, clientPhone: string): Promise<Appointment[]> => {
    if (!isSupabaseConfigured) return [];
    const today = new Date().toISOString().slice(0, 10);
    // Tenta os dois formatos: com DDI (5511...) e sem DDI (11...) para retrocompat
    const digits = clientPhone.replace(/\D/g, '');
    const withDDI = digits.startsWith('55') ? digits : '55' + digits;
    const withoutDDI = digits.startsWith('55') ? digits.slice(2) : digits;
    const phones = Array.from(new Set([withDDI, withoutDDI]));
    const { data, error } = await getDb()
      .from('appointments')
      .select('*, service:services(*)')
      .eq('professional_id', professionalId)
      .in('client_whatsapp', phones)
      .is('deleted_at', null)
      .neq('status', 'cancelled')
      .gte('date', today)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(3);
    if (error) return [];
    return data || [];
  },

  // Retorna TODOS os agendamentos da cliente (passado + futuro, qualquer status),
  // para o bot conseguir responder qualquer pergunta da cliente sobre a agenda dela.
  getAllAppointmentsByPhone: async (professionalId: string, clientPhone: string): Promise<Appointment[]> => {
    if (!isSupabaseConfigured) return [];
    const digits = clientPhone.replace(/\D/g, '');
    const withDDI = digits.startsWith('55') ? digits : '55' + digits;
    const withoutDDI = digits.startsWith('55') ? digits.slice(2) : digits;
    const phones = Array.from(new Set([withDDI, withoutDDI]));
    const { data, error } = await getDb()
      .from('appointments')
      .select('*, service:services(*)')
      .eq('professional_id', professionalId)
      .in('client_whatsapp', phones)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(50);
    if (error) return [];
    return data || [];
  },

  // Apaga TODAS as conversas do WhatsApp da profissional (histórico, resumos, pausas e
  // cooldowns), inclusive os registros de diagnóstico "_debug_". Usado para testar o bot do zero.
  clearAllWhatsAppConversations: async (professionalId: string): Promise<number> => {
    if (!isSupabaseConfigured) return 0;
    const { data, error } = await getDb()
      .from('whatsapp_conversations')
      .delete()
      .eq('professional_id', professionalId)
      .select('id');
    if (error) {
      if (isMissingTable(error)) return 0;
      throw error;
    }
    return data?.length ?? 0;
  },

  // Adiciona uma mensagem enviada automaticamente ao histórico da conversa.
  // Usa UPDATE (não upsert que resetaria bot_paused) e cria o registro se não existir.
  appendAutomatedMessage: async (professionalId: string, clientPhone: string, text: string): Promise<void> => {
    if (!isSupabaseConfigured) return;
    try {
      const conv = await dbService.getWhatsAppConversation(professionalId, clientPhone);
      const messages = capMessages([
        ...(conv?.messages || []),
        { role: 'assistant' as const, content: text, at: Date.now() },
      ]);
      const now = new Date().toISOString();
      if (conv) {
        await getDb()
          .from('whatsapp_conversations')
          .update({ messages, last_message_at: now })
          .eq('professional_id', professionalId)
          .eq('client_phone', clientPhone);
      } else {
        await getDb()
          .from('whatsapp_conversations')
          .insert({
            professional_id: professionalId,
            client_phone: clientPhone,
            messages,
            bot_paused: false,
            last_message_at: now,
          });
      }
    } catch { /* best-effort */ }
  },

  getAllWhatsAppConversations: async (professionalId: string): Promise<WhatsAppConversation[]> => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await getDb()
      .from('whatsapp_conversations')
      .select('*')
      .eq('professional_id', professionalId)
      .not('client_phone', 'like', '_debug_%')
      .order('last_message_at', { ascending: false })
      .limit(50);
    if (error) {
      if (isMissingTable(error)) return [];
      throw error;
    }
    return data || [];
  },

  getPausedConversations: async (professionalId: string): Promise<Array<WhatsAppConversation & { client_name?: string }>> => {
    if (!isSupabaseConfigured) return [];
    const { data: convs, error } = await getDb()
      .from('whatsapp_conversations')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('bot_paused', true)
      .not('client_phone', 'like', '_debug_%')
      .order('last_message_at', { ascending: false });
    if (error) {
      if (isMissingTable(error)) return [];
      return [];
    }
    if (!convs || convs.length === 0) return [];
    const phones = convs.map((c: WhatsAppConversation) => c.client_phone);
    const { data: clients } = await getDb()
      .from('clients')
      .select('whatsapp, name')
      .eq('professional_id', professionalId)
      .in('whatsapp', phones);
    const nameMap = new Map((clients || []).map((c: { whatsapp: string; name: string }) => [c.whatsapp, c.name]));
    return convs.map((c: WhatsAppConversation) => ({ ...c, client_name: nameMap.get(c.client_phone) as string | undefined }));
  },

  // --- Google Calendar ---
  getGoogleCalendarConnection: async (professionalId: string): Promise<GoogleCalendarConnection | null> => {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await getDb()
      .from('google_calendar_connections')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('enabled', true)
      .maybeSingle();
    
    if (error) {
      if (isMissingTable(error)) return null;
      console.error('[db.getGoogleCalendarConnection] Erro:', error);
      return null;
    }
    return data;
  },

  // --- Fichas de anamnese (requer migração v29) ---
  getAnamnesisForms: async (professionalId: string): Promise<AnamnesisForm[]> => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await getDb()
      .from('anamnesis_forms')
      .select('*')
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false });
    if (error) {
      if (isMissingTable(error)) { warnMigration('anamnesis_forms'); return []; }
      throw error;
    }
    return data || [];
  },

  getAnamnesisFormById: async (id: string, professionalId: string): Promise<AnamnesisForm | null> => {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await getDb()
      .from('anamnesis_forms')
      .select('*')
      .eq('id', id)
      .eq('professional_id', professionalId)
      .maybeSingle();
    if (error) {
      if (isMissingTable(error)) return null;
      throw error;
    }
    return data;
  },

  createAnamnesisForm: async (
    data: Omit<AnamnesisForm, 'id' | 'created_at' | 'updated_at'>
  ): Promise<AnamnesisForm> => {
    const { data: created, error } = await getDb()
      .from('anamnesis_forms')
      .insert(data)
      .select()
      .single();
    if (error) {
      if (isMissingTable(error)) throw new Error('Rode supabase/migration_v29_anamnesis.sql no Supabase para ativar as fichas de anamnese.');
      throw error;
    }
    return created;
  },

  updateAnamnesisForm: async (
    id: string,
    professionalId: string,
    patch: Partial<Pick<AnamnesisForm, 'title' | 'description' | 'questions' | 'design'>>
  ): Promise<AnamnesisForm> => {
    const { data, error } = await getDb()
      .from('anamnesis_forms')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('professional_id', professionalId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteAnamnesisForm: async (id: string, professionalId: string): Promise<void> => {
    const { error } = await getDb()
      .from('anamnesis_forms')
      .delete()
      .eq('id', id)
      .eq('professional_id', professionalId);
    if (error) throw error;
  },

  getAnamnesisResponses: async (professionalId: string): Promise<AnamnesisResponse[]> => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await getDb()
      .from('anamnesis_responses')
      .select('*')
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) {
      if (isMissingTable(error)) return [];
      throw error;
    }
    return data || [];
  },

  /** Busca pelo token do link público — usada pela página /ficha/[token] e pelo PDF. */
  getAnamnesisResponseByToken: async (token: string): Promise<AnamnesisResponse | null> => {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await getDb()
      .from('anamnesis_responses')
      .select('*')
      .eq('token', token)
      .maybeSingle();
    if (error) {
      if (isMissingTable(error)) return null;
      throw error;
    }
    return data;
  },

  createAnamnesisResponse: async (
    data: Omit<AnamnesisResponse, 'id' | 'created_at'>
  ): Promise<AnamnesisResponse> => {
    const { data: created, error } = await getDb()
      .from('anamnesis_responses')
      .insert(data)
      .select()
      .single();
    if (error) {
      if (isMissingTable(error)) throw new Error('Rode supabase/migration_v29_anamnesis.sql no Supabase para ativar as fichas de anamnese.');
      throw error;
    }
    return created;
  },

  /** Grava as respostas da cliente e marca como concluída (escrita pública via token). */
  completeAnamnesisResponse: async (
    token: string,
    answers: AnamnesisResponse['answers'],
    signature: string | null,
    clientName?: string
  ): Promise<AnamnesisResponse | null> => {
    const patch: Record<string, unknown> = {
      answers,
      signature,
      status: 'completed',
      completed_at: new Date().toISOString(),
    };
    if (clientName) patch.client_name = clientName;
    const { data, error } = await getDb()
      .from('anamnesis_responses')
      .update(patch)
      .eq('token', token)
      .eq('status', 'pending') // só conclui uma vez — reenvio não sobrescreve
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  markAnamnesisPdfSent: async (id: string): Promise<void> => {
    try {
      await getDb()
        .from('anamnesis_responses')
        .update({ pdf_sent_at: new Date().toISOString() })
        .eq('id', id);
    } catch { /* best-effort */ }
  },

  deleteAnamnesisResponse: async (id: string, professionalId: string): Promise<void> => {
    const { error } = await getDb()
      .from('anamnesis_responses')
      .delete()
      .eq('id', id)
      .eq('professional_id', professionalId);
    if (error) throw error;
  },
};
export default dbService;

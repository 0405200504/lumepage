import { isSupabaseConfigured, supabase, supabaseAdmin, getSupabaseAdmin } from './client';
import { mockDb } from './mockDb';
import {
  Professional, Profile, Service, AvailabilityRule,
  TimeBlock, Setting, Client, Appointment, AppointmentStatus,
  Transaction, Task, FixedExpense, Salon, WaitlistEntry, WaitlistStatus,
  WhatsAppSettings, WhatsAppConversation
} from '@/types/database';

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

export const dbService = {
  // Professionals
  getProfessionals: async (): Promise<Professional[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('professionals')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    }
    return mockDb.getProfessionals();
  },

  getProfessionalBySlug: async (slug: string): Promise<Professional | null> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('professionals')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
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
      const { data: result, error } = await getDb()
        .from('professionals')
        .upsert({ ...data, updated_at: new Date().toISOString() })
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
      if (error) throw error;
      return result;
    }
    return mockDb.createService(data);
  },

  upsertService: async (data: Partial<Service> & { id: string; professional_id: string }): Promise<Service> => {
    if (isSupabaseConfigured) {
      // Proteção: se o id não for um UUID válido, remove para o banco gerar (evita erro 22P02)
      const payload: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };
      if (!isUuid(data.id)) delete payload.id;
      const { data: result, error } = await getDb()
        .from('services')
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return result;
    }
    return mockDb.upsertService(data);
  },

  deleteService: async (id: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb()
        .from('services')
        .delete()
        .eq('id', id);
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

  deleteTimeBlock: async (id: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb()
        .from('time_blocks')
        .delete()
        .eq('id', id);
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
      // Campos opcionais que dependem de migração — gravados em separado (best-effort)
      const { requires_deposit, deposit_instructions, booking_theme, public_slots_limit, ...core } = data as Partial<Setting> & { professional_id: string };
      const { data: result, error } = await getDb()
        .from('settings')
        .upsert(core, { onConflict: 'professional_id' })
        .select()
        .single();
      if (error) throw error;

      if (requires_deposit !== undefined || deposit_instructions !== undefined || booking_theme !== undefined) {
        const extras: Record<string, unknown> = {};
        if (requires_deposit !== undefined) extras.requires_deposit = requires_deposit;
        if (deposit_instructions !== undefined) extras.deposit_instructions = deposit_instructions;
        if (booking_theme !== undefined) extras.booking_theme = booking_theme;
        const { error: extraErr } = await getDb()
          .from('settings')
          .update(extras)
          .eq('professional_id', data.professional_id);
        if (extraErr) {
          console.warn('[settings] Colunas de sinal ausentes — rode supabase/migration_v2.sql:', extraErr.message);
        } else {
          Object.assign(result as object, extras);
        }
      }

      // Limite de horários públicos (migração v7) — best-effort separado
      if (public_slots_limit !== undefined) {
        const { error: limitErr } = await getDb()
          .from('settings')
          .update({ public_slots_limit })
          .eq('professional_id', data.professional_id);
        if (limitErr) {
          console.warn('[settings] Coluna public_slots_limit ausente — rode supabase/migration_v7.sql:', limitErr.message);
        } else {
          (result as Record<string, unknown>).public_slots_limit = public_slots_limit;
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
        .order('name');
      if (error) throw error;
      return data || [];
    }
    return mockDb.getClientsByProfessional(profId);
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
  updateClientNotes: async (id: string, notes: string): Promise<boolean> => {
    if (!isSupabaseConfigured) {
      mockDb.updateClient(id, { notes });
      return true;
    }
    const { error } = await getDb()
      .from('clients')
      .update({ notes })
      .eq('id', id);
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
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return mockDb.getAppointmentsByProfessional(profId);
  },

  getAppointmentsByClient: async (clientId: string): Promise<Appointment[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('appointments')
        .select('*, service:services(*)')
        .eq('client_id', clientId)
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
          client_id: client.id,
          client_name: data.client_name,
          client_whatsapp: data.client_whatsapp,
          client_email: data.client_email,
          date: data.date,
          start_time: data.start_time,
          end_time: data.end_time,
          status: 'pending',
          notes: data.notes
        })
        .select()
        .single();
      if (appErr) throw appErr;

      return appointment;
    }
    
    return mockDb.createAppointment(data);
  },

  updateAppointmentStatus: async (id: string, status: AppointmentStatus, cancellationReason?: string): Promise<Appointment | null> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('appointments')
        .update({ 
          status, 
          cancellation_reason: cancellationReason || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return mockDb.updateAppointmentStatus(id, status, cancellationReason);
  },

  updateAppointment: async (
    id: string,
    patch: Partial<Pick<Appointment, 'date' | 'start_time' | 'end_time' | 'service_id' | 'notes' | 'status'>>
  ): Promise<Appointment | null> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('appointments')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, service:services(*)')
        .single();
      if (error) throw error;
      return data;
    }
    return null;
  },

  updateAppointmentSchedule: async (id: string, date: string, startTime: string, endTime: string): Promise<Appointment | null> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('appointments')
        .update({
          date,
          start_time: startTime,
          end_time: endTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return mockDb.updateAppointmentSchedule(id, date, startTime, endTime);
  },

  deleteAppointment: async (id: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb()
        .from('appointments')
        .delete()
        .eq('id', id);
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

  deleteTransaction: async (id: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb().from('transactions').delete().eq('id', id);
      if (error && !isMissingTable(error)) throw error;
      return true;
    }
    return mockDb.deleteTransaction(id);
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

  toggleTask: async (id: string, done: boolean): Promise<Task | null> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb().from('tasks').update({ done }).eq('id', id).select().single();
      if (error) { if (isMissingTable(error)) return null; throw error; }
      return data;
    }
    return mockDb.toggleTask(id, done);
  },

  // Atualiza conteúdo/horário da tarefa (due_date/due_time best-effort — migração v5)
  updateTask: async (id: string, fields: Partial<Pick<Task, 'content' | 'done' | 'due_date' | 'due_time'>>): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { due_date, due_time, ...core } = fields;
      if (Object.keys(core).length) {
        const { error } = await getDb().from('tasks').update(core).eq('id', id);
        if (error && !isMissingTable(error)) throw error;
      }
      if (due_date !== undefined || due_time !== undefined) {
        const extra: Record<string, unknown> = {};
        if (due_date !== undefined) extra.due_date = due_date;
        if (due_time !== undefined) extra.due_time = due_time;
        const { error } = await getDb().from('tasks').update(extra).eq('id', id);
        if (error && !isMissingTable(error)) console.warn('[tasks] due fields ausentes — rode supabase/migration_v5.sql:', error.message);
      }
      return true;
    }
    return mockDb.updateTask(id, fields);
  },

  deleteTask: async (id: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb().from('tasks').delete().eq('id', id);
      if (error && !isMissingTable(error)) throw error;
      return true;
    }
    return mockDb.deleteTask(id);
  },

  // Exclusão de clientes (individual / lote / todos) — edição em lote
  deleteClient: async (id: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb().from('clients').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    return mockDb.deleteClient(id);
  },

  deleteClientsByIds: async (ids: string[]): Promise<boolean> => {
    if (!ids.length) return true;
    if (isSupabaseConfigured) {
      const { error } = await getDb().from('clients').delete().in('id', ids);
      if (error) throw error;
      return true;
    }
    return mockDb.deleteClientsByIds(ids);
  },

  deleteAllClientsForProfessional: async (profId: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb().from('clients').delete().eq('professional_id', profId);
      if (error) throw error;
      return true;
    }
    return mockDb.deleteAllClientsForProfessional(profId);
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

  deleteFixedExpense: async (id: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await getDb().from('fixed_expenses').delete().eq('id', id);
      if (error && !isMissingTable(error)) throw error;
      return true;
    }
    return mockDb.deleteFixedExpense(id);
  },

  // ===================== ADMIN (LEITURAS GLOBAIS DA PLATAFORMA) =====================
  getAllAppointments: async (): Promise<Appointment[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb()
        .from('appointments')
        .select('*, service:services(*)')
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return mockDb.getAllAppointments();
  },

  getAllClients: async (): Promise<Client[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await getDb().from('clients').select('*').order('name');
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

  markReminderSent: async (appointmentId: string, type: 'booking' | 'day_before' | 'day_of'): Promise<void> => {
    const col = type === 'booking'
      ? 'automation_booking_sent_at'
      : type === 'day_before'
        ? 'automation_day_before_sent_at'
        : 'automation_day_of_sent_at';
    await getDb()
      .from('appointments')
      .update({ [col]: new Date().toISOString() })
      .eq('id', appointmentId);
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
    clientSummary?: string
  ): Promise<void> => {
    const payload: Record<string, unknown> = {
      professional_id: professionalId,
      client_phone: clientPhone,
      messages,
      bot_paused: false,
      last_message_at: new Date().toISOString(),
    };
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
};
export default dbService;

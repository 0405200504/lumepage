import { isSupabaseConfigured, supabase, supabaseAdmin, getSupabaseAdmin } from './client';
import { mockDb } from './mockDb';
import { 
  Professional, Profile, Service, AvailabilityRule, 
  TimeBlock, Setting, Client, Appointment, AppointmentStatus
} from '@/types/database';

export const dbService = {
  // Professionals
  getProfessionals: async (): Promise<Professional[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
      const { data: result, error } = await supabase
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      if (error) throw error;
      return data || [];
    }
    return mockDb.getProfiles();
  },

  getProfileByEmail: async (email: string): Promise<Profile | null> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    return mockDb.getServiceById(id);
  },

  upsertService: async (data: Partial<Service> & { id: string; professional_id: string }): Promise<Service> => {
    if (isSupabaseConfigured) {
      const { data: result, error } = await supabase
        .from('services')
        .upsert({ ...data, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return result;
    }
    return mockDb.upsertService(data);
  },

  deleteService: async (id: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await supabase
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
      const { data, error } = await supabase
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
      const { data: result, error } = await supabase
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
      const { data, error } = await supabase
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
      const { data: result, error } = await supabase
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
      const { error } = await supabase
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
      const { data, error } = await supabase
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
      const { data: result, error } = await supabase
        .from('settings')
        .upsert(data, { onConflict: 'professional_id' })
        .select()
        .single();
      if (error) throw error;
      return result;
    }
    return mockDb.upsertSettings(data);
  },

  // Clients
  getClientsByProfessional: async (profId: string): Promise<Client[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
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
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    return mockDb.getClientById(id);
  },

  createClient: async (data: Omit<Client, 'id' | 'total_appointments' | 'last_appointment_at' | 'created_at'>): Promise<Client> => {
    if (isSupabaseConfigured) {
      const { data: result, error } = await supabase
        .from('clients')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    }
    return mockDb.createClient(data);
  },

  // Appointments
  getAppointmentsByProfessional: async (profId: string): Promise<Appointment[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
  }
};
export default dbService;

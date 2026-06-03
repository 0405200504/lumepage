import { 
  Professional, Profile, Service, AvailabilityRule, 
  TimeBlock, Setting, Client, Appointment, AppointmentStatus, BlockType
} from '@/types/database';

// Declarar tipo global para persistência em memória durante o dev server
declare global {
  var __mockDb: {
    professionals: Professional[];
    profiles: Profile[];
    services: Service[];
    availabilityRules: AvailabilityRule[];
    timeBlocks: TimeBlock[];
    settings: Setting[];
    clients: Client[];
    appointments: Appointment[];
  } | undefined;
}

const DEFAULT_PROF_ID = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';

// Inicializar dados padrão se o banco simulado não existir
if (!globalThis.__mockDb) {
  const nowStr = new Date().toISOString();
  
  globalThis.__mockDb = {
    professionals: [
      {
        id: DEFAULT_PROF_ID,
        owner_user_id: null,
        name: 'Amanda Costa',
        brand_name: 'Amanda Costa Estética',
        slug: 'amanda-costa',
        email: 'amanda@estetica.com',
        whatsapp: '11999999999',
        instagram: '@amandacosta.estetica',
        logo_url: null,
        profile_image_url: null,
        primary_color: '#500b18', // Bordô Lume
        secondary_color: '#e3bc8f', // Champanhe Lume
        address: 'Av. Paulista, 1000 - Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        description: 'Especialista em limpeza de pele, estética facial e cuidado personalizado.',
        public_bio: 'Ofereço tratamentos faciais e corporais personalizados para realçar sua beleza natural e proporcionar momentos de relaxamento e autocuidado.',
        status: 'active',
        created_at: nowStr,
        updated_at: nowStr
      }
    ],
    profiles: [
      {
        id: 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
        auth_user_id: null,
        name: 'Admin Lume',
        email: 'admin@lume.com',
        role: 'super_admin',
        professional_id: null,
        created_at: nowStr,
        updated_at: nowStr
      },
      {
        id: 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3',
        auth_user_id: null,
        name: 'Amanda Costa',
        email: 'amanda@estetica.com',
        role: 'professional',
        professional_id: DEFAULT_PROF_ID,
        created_at: nowStr,
        updated_at: nowStr
      }
    ],
    services: [
      {
        id: 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4',
        professional_id: DEFAULT_PROF_ID,
        name: 'Limpeza de Pele Profunda',
        description: 'Tratamento completo para remoção de cravos, impurezas e células mortas, com nutrição e hidratação profunda da pele.',
        duration_minutes: 90,
        price_cents: 15000, // R$ 150,00
        image_url: null,
        is_active: true,
        created_at: nowStr,
        updated_at: nowStr
      },
      {
        id: 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5',
        professional_id: DEFAULT_PROF_ID,
        name: 'Design de Sobrancelhas',
        description: 'Modelagem de sobrancelhas personalizada de acordo com a harmonia e formato do seu rosto.',
        duration_minutes: 45,
        price_cents: 8000, // R$ 80,00
        image_url: null,
        is_active: true,
        created_at: nowStr,
        updated_at: nowStr
      },
      {
        id: 'f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6',
        professional_id: DEFAULT_PROF_ID,
        name: 'Massagem Modeladora',
        description: 'Técnica manual com movimentos rápidos e firmes que auxiliam na redução de medidas e melhora do contorno corporal.',
        duration_minutes: 60,
        price_cents: 12000, // R$ 120,00
        image_url: null,
        is_active: true,
        created_at: nowStr,
        updated_at: nowStr
      }
    ],
    availabilityRules: [
      // Segunda a Sexta: 09:00h às 18:00h (almoço 12h-13h)
      { id: '1-1', professional_id: DEFAULT_PROF_ID, weekday: 1, start_time: '09:00', end_time: '18:00', break_start: '12:00', break_end: '13:00', slot_interval_minutes: 30, buffer_minutes: 15, is_active: true, created_at: nowStr, updated_at: nowStr },
      { id: '1-2', professional_id: DEFAULT_PROF_ID, weekday: 2, start_time: '09:00', end_time: '18:00', break_start: '12:00', break_end: '13:00', slot_interval_minutes: 30, buffer_minutes: 15, is_active: true, created_at: nowStr, updated_at: nowStr },
      { id: '1-3', professional_id: DEFAULT_PROF_ID, weekday: 3, start_time: '09:00', end_time: '18:00', break_start: '12:00', break_end: '13:00', slot_interval_minutes: 30, buffer_minutes: 15, is_active: true, created_at: nowStr, updated_at: nowStr },
      { id: '1-4', professional_id: DEFAULT_PROF_ID, weekday: 4, start_time: '09:00', end_time: '18:00', break_start: '12:00', break_end: '13:00', slot_interval_minutes: 30, buffer_minutes: 15, is_active: true, created_at: nowStr, updated_at: nowStr },
      { id: '1-5', professional_id: DEFAULT_PROF_ID, weekday: 5, start_time: '09:00', end_time: '18:00', break_start: '12:00', break_end: '13:00', slot_interval_minutes: 30, buffer_minutes: 15, is_active: true, created_at: nowStr, updated_at: nowStr },
      // Sábado: 08:00h às 13:00h
      { id: '1-6', professional_id: DEFAULT_PROF_ID, weekday: 6, start_time: '08:00', end_time: '13:00', break_start: null, break_end: null, slot_interval_minutes: 30, buffer_minutes: 15, is_active: true, created_at: nowStr, updated_at: nowStr },
      // Domingo: Inativo
      { id: '1-0', professional_id: DEFAULT_PROF_ID, weekday: 0, start_time: '09:00', end_time: '13:00', break_start: null, break_end: null, slot_interval_minutes: 30, buffer_minutes: 15, is_active: false, created_at: nowStr, updated_at: nowStr }
    ],
    timeBlocks: [],
    settings: [
      {
        id: 's1',
        professional_id: DEFAULT_PROF_ID,
        confirmation_mode: 'manual',
        min_notice_hours: 3,
        max_days_ahead: 30,
        default_slot_interval_minutes: 30,
        default_buffer_minutes: 15,
        whatsapp_confirmation_message: 'Oi, {nome}! Tudo bem? Passando para confirmar seu agendamento de {servico} no dia {data} às {horario}.',
        whatsapp_cancel_message: 'Oi, {nome}! Seu agendamento de {servico} no dia {data} às {horario} precisou ser cancelado. Motivo: {motivo}.',
        show_price_public: true,
        created_at: nowStr,
        updated_at: nowStr
      }
    ],
    clients: [
      {
        id: '77777777-7777-7777-7777-777777777777',
        professional_id: DEFAULT_PROF_ID,
        name: 'Juliana Silva',
        whatsapp: '11988888888',
        email: 'juliana@gmail.com',
        total_appointments: 2,
        last_appointment_at: nowStr,
        created_at: nowStr
      },
      {
        id: '88888888-8888-8888-8888-888888888888',
        professional_id: DEFAULT_PROF_ID,
        name: 'Beatriz Santos',
        whatsapp: '11977777777',
        email: 'beatriz@hotmail.com',
        total_appointments: 1,
        last_appointment_at: nowStr,
        created_at: nowStr
      }
    ],
    appointments: []
  };

  // Agendamentos simulados iniciais para hoje e amanhã
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

  globalThis.__mockDb.appointments.push(
    {
      id: 'app1',
      professional_id: DEFAULT_PROF_ID,
      service_id: 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', // Design Sobrancelhas
      client_id: '77777777-7777-7777-7777-777777777777',
      client_name: 'Juliana Silva',
      client_whatsapp: '11988888888',
      client_email: 'juliana@gmail.com',
      date: todayStr,
      start_time: '10:00',
      end_time: '10:45',
      status: 'pending',
      notes: 'Gostaria de ver opções com henna se possível.',
      cancellation_reason: null,
      created_at: nowStr,
      updated_at: nowStr
    },
    {
      id: 'app2',
      professional_id: DEFAULT_PROF_ID,
      service_id: 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', // Limpeza de Pele
      client_id: '88888888-8888-8888-8888-888888888888',
      client_name: 'Beatriz Santos',
      client_whatsapp: '11977777777',
      client_email: 'beatriz@hotmail.com',
      date: todayStr,
      start_time: '14:00',
      end_time: '15:30',
      status: 'confirmed',
      notes: 'Primeira vez fazendo limpeza profunda.',
      cancellation_reason: null,
      created_at: nowStr,
      updated_at: nowStr
    },
    {
      id: 'app3',
      professional_id: DEFAULT_PROF_ID,
      service_id: 'f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6', // Massagem
      client_id: '77777777-7777-7777-7777-777777777777',
      client_name: 'Juliana Silva',
      client_whatsapp: '11988888888',
      client_email: 'juliana@gmail.com',
      date: tomorrowStr,
      start_time: '11:00',
      end_time: '12:00',
      status: 'confirmed',
      notes: null,
      cancellation_reason: null,
      created_at: nowStr,
      updated_at: nowStr
    }
  );
}

const mockData = globalThis.__mockDb!;

export const mockDb = {
  // Professionals
  getProfessionals: () => mockData.professionals,
  getProfessionalBySlug: (slug: string) => mockData.professionals.find(p => p.slug === slug) || null,
  getProfessionalById: (id: string) => mockData.professionals.find(p => p.id === id) || null,
  upsertProfessional: (data: Partial<Professional> & { id: string }) => {
    const idx = mockData.professionals.findIndex(p => p.id === data.id);
    const updated = {
      ...(idx >= 0 ? mockData.professionals[idx] : {}),
      ...data,
      updated_at: new Date().toISOString()
    } as Professional;
    
    if (idx >= 0) {
      mockData.professionals[idx] = updated;
    } else {
      mockData.professionals.push(updated);
    }
    return updated;
  },
  createProfessional: (data: Omit<Professional, 'created_at' | 'updated_at'>) => {
    const nowStr = new Date().toISOString();
    const newProf: Professional = {
      ...data,
      created_at: nowStr,
      updated_at: nowStr
    };
    mockData.professionals.push(newProf);
    
    // Auto-criar configurações padrão para o profissional
    const newSettings: Setting = {
      id: 's_' + newProf.id.substring(0, 6),
      professional_id: newProf.id,
      confirmation_mode: 'manual',
      min_notice_hours: 3,
      max_days_ahead: 30,
      default_slot_interval_minutes: 30,
      default_buffer_minutes: 15,
      whatsapp_confirmation_message: 'Oi, {nome}! Tudo bem? Passando para confirmar seu agendamento de {servico} no dia {data} às {horario}.',
      whatsapp_cancel_message: 'Oi, {nome}! Seu agendamento de {servico} no dia {data} às {horario} precisou ser cancelado. Motivo: {motivo}.',
      show_price_public: true,
      created_at: nowStr,
      updated_at: nowStr
    };
    mockData.settings.push(newSettings);

    // Auto-criar regras de disponibilidade padrão (Seg-Sex 9-18, Sab 8-13)
    for (let weekday = 0; weekday <= 6; weekday++) {
      mockData.availabilityRules.push({
        id: `rule_${newProf.id.substring(0, 4)}_${weekday}`,
        professional_id: newProf.id,
        weekday,
        start_time: weekday === 6 ? '08:00' : '09:00',
        end_time: weekday === 6 ? '13:00' : '18:00',
        break_start: weekday === 6 ? null : '12:00',
        break_end: weekday === 6 ? null : '13:00',
        slot_interval_minutes: 30,
        buffer_minutes: 15,
        is_active: weekday !== 0, // Inativo no Domingo
        created_at: nowStr,
        updated_at: nowStr
      });
    }

    return newProf;
  },

  // Profiles
  getProfiles: () => mockData.profiles,
  getProfileByEmail: (email: string) => mockData.profiles.find(p => p.email.toLowerCase() === email.toLowerCase()) || null,
  getProfileByAuthUserId: (id: string) => mockData.profiles.find(p => p.auth_user_id === id) || null,
  createProfile: (data: Omit<Profile, 'created_at' | 'updated_at'>) => {
    const nowStr = new Date().toISOString();
    const newProf: Profile = {
      ...data,
      created_at: nowStr,
      updated_at: nowStr
    };
    mockData.profiles.push(newProf);
    return newProf;
  },

  // Services
  getServices: () => mockData.services,
  getServicesByProfessional: (profId: string) => mockData.services.filter(s => s.professional_id === profId),
  getServiceById: (id: string) => mockData.services.find(s => s.id === id) || null,
  upsertService: (data: Partial<Service> & { id: string; professional_id: string }) => {
    const idx = mockData.services.findIndex(s => s.id === data.id);
    const now = new Date().toISOString();
    if (idx >= 0) {
      mockData.services[idx] = {
        ...mockData.services[idx],
        ...data,
        updated_at: now
      } as Service;
      return mockData.services[idx];
    } else {
      const newService = {
        name: '',
        description: null,
        duration_minutes: 60,
        price_cents: 0,
        is_active: true,
        ...data,
        created_at: now,
        updated_at: now
      } as Service;
      mockData.services.push(newService);
      return newService;
    }
  },
  deleteService: (id: string) => {
    mockData.services = mockData.services.filter(s => s.id !== id);
    return true;
  },

  // AvailabilityRules
  getAvailabilityRules: () => mockData.availabilityRules,
  getAvailabilityRulesByProfessional: (profId: string) => mockData.availabilityRules.filter(r => r.professional_id === profId),
  upsertAvailabilityRule: (data: Partial<AvailabilityRule> & { professional_id: string; weekday: number }) => {
    const idx = mockData.availabilityRules.findIndex(r => r.professional_id === data.professional_id && r.weekday === data.weekday);
    const now = new Date().toISOString();
    if (idx >= 0) {
      mockData.availabilityRules[idx] = {
        ...mockData.availabilityRules[idx],
        ...data,
        updated_at: now
      } as AvailabilityRule;
      return mockData.availabilityRules[idx];
    } else {
      const newRule = {
        id: `${data.professional_id}_${data.weekday}_${Math.random()}`,
        start_time: '09:00',
        end_time: '18:00',
        break_start: null,
        break_end: null,
        slot_interval_minutes: 30,
        buffer_minutes: 0,
        is_active: true,
        ...data,
        created_at: now,
        updated_at: now
      } as AvailabilityRule;
      mockData.availabilityRules.push(newRule);
      return newRule;
    }
  },

  // TimeBlocks
  getTimeBlocks: () => mockData.timeBlocks,
  getTimeBlocksByProfessional: (profId: string) => mockData.timeBlocks.filter(b => b.professional_id === profId),
  createTimeBlock: (data: Omit<TimeBlock, 'id' | 'created_at'>) => {
    const newBlock: TimeBlock = {
      id: 'block_' + Math.random().toString(36).substr(2, 9),
      ...data,
      created_at: new Date().toISOString()
    };
    mockData.timeBlocks.push(newBlock);
    return newBlock;
  },
  deleteTimeBlock: (id: string) => {
    mockData.timeBlocks = mockData.timeBlocks.filter(b => b.id !== id);
    return true;
  },

  // Settings
  getSettingsByProfessional: (profId: string) => mockData.settings.find(s => s.professional_id === profId) || null,
  upsertSettings: (data: Partial<Setting> & { professional_id: string }) => {
    const idx = mockData.settings.findIndex(s => s.professional_id === data.professional_id);
    const now = new Date().toISOString();
    if (idx >= 0) {
      mockData.settings[idx] = {
        ...mockData.settings[idx],
        ...data,
        updated_at: now
      } as Setting;
      return mockData.settings[idx];
    } else {
      const newSetting = {
        id: 'set_' + Math.random().toString(36).substr(2, 9),
        confirmation_mode: 'manual',
        min_notice_hours: 3,
        max_days_ahead: 30,
        default_slot_interval_minutes: 30,
        default_buffer_minutes: 15,
        whatsapp_confirmation_message: 'Oi, {nome}! Tudo bem? Passando para confirmar seu agendamento de {servico} no dia {data} às {horario}.',
        whatsapp_cancel_message: 'Oi, {nome}! Seu agendamento de {servico} no dia {data} às {horario} precisou ser cancelado. Motivo: {motivo}.',
        show_price_public: true,
        ...data,
        created_at: now,
        updated_at: now
      } as Setting;
      mockData.settings.push(newSetting);
      return newSetting;
    }
  },

  // Clients
  getClientsByProfessional: (profId: string) => mockData.clients.filter(c => c.professional_id === profId),
  getClientById: (id: string) => mockData.clients.find(c => c.id === id) || null,
  getClientByWhatsapp: (profId: string, whatsapp: string) => mockData.clients.find(c => c.professional_id === profId && c.whatsapp === whatsapp) || null,
  createClient: (data: Omit<Client, 'id' | 'total_appointments' | 'last_appointment_at' | 'created_at'>) => {
    const newClient: Client = {
      id: 'client_' + Math.random().toString(36).substr(2, 9),
      total_appointments: 0,
      last_appointment_at: null,
      ...data,
      created_at: new Date().toISOString()
    };
    mockData.clients.push(newClient);
    return newClient;
  },
  updateClient: (id: string, data: Partial<Client>) => {
    const idx = mockData.clients.findIndex(c => c.id === id);
    if (idx >= 0) {
      mockData.clients[idx] = {
        ...mockData.clients[idx],
        ...data,
        updated_at: new Date().toISOString()
      };
      return mockData.clients[idx];
    }
    return null;
  },

  // Appointments
  getAppointmentsByProfessional: (profId: string) => {
    return mockData.appointments
      .filter(a => a.professional_id === profId)
      .map(a => ({
        ...a,
        service: mockData.services.find(s => s.id === a.service_id)
      }));
  },
  getAppointmentsByClient: (clientId: string) => mockData.appointments.filter(a => a.client_id === clientId),
  getAppointmentById: (id: string) => {
    const app = mockData.appointments.find(a => a.id === id);
    if (!app) return null;
    return {
      ...app,
      service: mockData.services.find(s => s.id === app.service_id),
      professional: mockData.professionals.find(p => p.id === app.professional_id)
    };
  },
  createAppointment: (data: Omit<Appointment, 'id' | 'status' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const newApp: Appointment = {
      id: 'app_' + Math.random().toString(36).substr(2, 9),
      status: 'pending',
      ...data,
      created_at: now,
      updated_at: now
    };
    mockData.appointments.push(newApp);
    
    // Atualizar dados de estatísticas do cliente associado
    let client = mockData.clients.find(c => c.professional_id === data.professional_id && c.whatsapp === data.client_whatsapp);
    if (!client) {
      client = {
        id: 'client_' + Math.random().toString(36).substr(2, 9),
        professional_id: data.professional_id,
        name: data.client_name,
        whatsapp: data.client_whatsapp,
        email: data.client_email,
        total_appointments: 1,
        last_appointment_at: now,
        created_at: now
      };
      mockData.clients.push(client);
    } else {
      client.total_appointments += 1;
      client.last_appointment_at = now;
    }
    
    newApp.client_id = client.id;
    return newApp;
  },
  updateAppointmentStatus: (id: string, status: AppointmentStatus, cancellationReason?: string) => {
    const idx = mockData.appointments.findIndex(a => a.id === id);
    if (idx >= 0) {
      mockData.appointments[idx] = {
        ...mockData.appointments[idx],
        status,
        cancellation_reason: cancellationReason || null,
        updated_at: new Date().toISOString()
      };
      return mockData.appointments[idx];
    }
    return null;
  }
};
export default mockDb;

export type UserRole = 'super_admin' | 'professional';
export type ProfessionalStatus = 'active' | 'paused' | 'cancelled';
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type BlockType = 'full_day' | 'custom_time';
export type ConfirmationMode = 'manual' | 'automatic';

export interface Salon {
  id: string;
  name: string;
  created_at: string;
}

export interface Professional {
  id: string;
  owner_user_id: string | null;
  salon_id?: string | null; // salão a que pertence (requer migração v6)
  name: string;
  brand_name: string;
  slug: string;
  email: string;
  whatsapp: string;
  instagram: string | null;
  logo_url: string | null;
  profile_image_url: string | null;
  primary_color: string;
  secondary_color: string;
  address: string | null;
  city: string | null;
  state: string | null;
  description: string | null;
  public_bio: string | null;
  status: ProfessionalStatus;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  auth_user_id: string | null;
  name: string;
  email: string;
  role: UserRole;
  professional_id: string | null;
  salon_id?: string | null;          // salão gerenciado (requer migração v6)
  is_salon_manager?: boolean;        // gerente de salão (requer migração v6)
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  professional_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  image_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityRule {
  id: string;
  professional_id: string;
  weekday: number; // 0 a 6
  start_time: string; // Ex: "09:00:00" ou "09:00"
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  slot_interval_minutes: number;
  buffer_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeBlock {
  id: string;
  professional_id: string;
  date: string; // "YYYY-MM-DD"
  start_time: string | null; // NULL se for o dia inteiro
  end_time: string | null;
  reason: string | null;
  block_type: BlockType;
  created_at: string;
  updated_at?: string;
}

export interface Setting {
  id: string;
  professional_id: string;
  confirmation_mode: ConfirmationMode;
  min_notice_hours: number;
  max_days_ahead: number;
  default_slot_interval_minutes: number;
  default_buffer_minutes: number;
  whatsapp_confirmation_message: string;
  whatsapp_cancel_message: string;
  show_price_public: boolean;
  requires_deposit?: boolean; // exige sinal/antecipação (opcional — requer migração v2)
  deposit_instructions?: string | null; // instruções de sinal exibidas no agendamento
  booking_theme?: string | null; // tema decorativo do popup (sparkles/stars/flowers/hearts/none)
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  professional_id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  birthday?: string | null; // "YYYY-MM-DD" (opcional — requer migração v2)
  total_appointments: number;
  last_appointment_at: string | null;
  created_at: string;
  updated_at?: string;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  professional_id: string;
  type: TransactionType;
  amount_cents: number;
  category: string;
  description: string | null;
  date: string; // "YYYY-MM-DD"
  created_at: string;
}

export interface Task {
  id: string;
  professional_id: string;
  content: string;
  done: boolean;
  due_date?: string | null;  // "YYYY-MM-DD" — agenda (requer migração v5)
  due_time?: string | null;  // "HH:MM" — agenda (requer migração v5)
  created_at: string;
}

export interface FixedExpense {
  id: string;
  professional_id: string;
  name: string;
  amount_cents: number;
  active: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  professional_id: string;
  service_id: string;
  client_id: string | null;
  client_name: string;
  client_whatsapp: string;
  client_email: string | null;
  date: string; // "YYYY-MM-DD"
  start_time: string; // "HH:MM:SS"
  end_time: string;
  status: AppointmentStatus;
  notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  service?: Service; // Relacionamento incluído em SELECTs
  professional?: Professional;
}

export interface PushSubscriptionRow {
  id: string;
  professional_id: string;
  endpoint: string;
  auth: string;
  p256dh: string;
  created_at: string;
}

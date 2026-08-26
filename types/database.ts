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
  deleted_at?: string | null; // lixeira (soft-delete) — requer migração v23
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  hubla_subscription_id?: string | null;
  subscription_plan?: 'start' | 'pro' | 'premium' | null;
  subscription_ends_at?: string | null; // vencimento do acesso pago (admin) — requer migração v28
  onboarding_completed_at?: string | null; // null = ainda falta completar o cadastro (requer migração v38)
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
  /** Custo variável (insumos) por atendimento, em centavos. Alimenta o DRE.
   *  Requer migração v24; default 0 (fallback gracioso se a coluna não existe). */
  cost_cents?: number;
  image_url?: string | null;
  is_active: boolean;
  /** Aparece no agendamento público da cliente (site) e na lista que o bot oferece.
   *  false = serviço só para uso interno da profissional (não aparece para a cliente). */
  client_visible: boolean;
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
  google_event_id?: string | null; // bloqueio espelhado do Google (requer migração v38)
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
  public_slots_limit?: number; // 0/undefined = mostrar todos; N = mostrar até N horários por dia na página pública (requer migração v7)
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
  notes?: string | null; // ficha técnica / observações gerais da cliente (requer migração v7)
  total_appointments: number;
  last_appointment_at: string | null;
  followup_sent_at?: string | null; // último follow-up de "cliente sem retorno" enviado (requer migração v16)
  deleted_at?: string | null; // lixeira (soft-delete)
  created_at: string;
  updated_at?: string;
}

export type WaitlistStatus = 'waiting' | 'contacted' | 'scheduled' | 'cancelled' | 'no_response';

export interface WaitlistEntry {
  id: string;
  professional_id: string;
  client_name: string;
  client_whatsapp: string;
  service_id?: string | null;
  service_name?: string | null;
  desired_date?: string | null; // "YYYY-MM-DD"
  desired_period?: string | null; // texto livre: "manhã", "sábado", etc.
  time_preference?: string | null; // ex.: "depois das 18h"
  notes?: string | null;
  status: WaitlistStatus;
  created_at: string;
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
  appointment_id?: string | null; // entrada automática vinculada a um agendamento concluído
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
  service_ids?: string[] | null; // multi-serviço (NULL = usa service_id). service_id = service_ids[0]
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
  payment_method?: string | null;
  deleted_at?: string | null; // lixeira (soft-delete)
  google_event_id?: string | null; // ID do evento no Google Calendar (sync bidirecional)
  created_at: string;
  updated_at: string;
  automation_booking_sent_at?: string | null;
  automation_day_before_sent_at?: string | null;
  automation_day_of_sent_at?: string | null;
  automation_5days_sent_at?: string | null;
  service?: Service; // Relacionamento (serviço primário) incluído em SELECTs
  services?: Service[]; // Todos os serviços do agendamento (multi-serviço)
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

export interface WhatsAppSettings {
  id: string;
  professional_id: string;
  uazapi_url: string;
  uazapi_token: string;
  webhook_secret: string;
  bot_enabled: boolean;
  confirmation_enabled: boolean;
  bot_persona: string | null;
  stop_keyword: string;
  booking_url: string | null;
  automation_booking_enabled: boolean;
  automation_booking_message: string | null;
  automation_booking_delay_minutes: number;
  automation_day_before_enabled: boolean;
  automation_day_before_message: string | null;
  automation_day_before_time: string;
  automation_day_of_enabled: boolean;
  automation_day_of_message: string | null;
  automation_day_of_time: string;
  // Lembrete 5 dias antes do agendamento
  automation_5days_enabled: boolean;
  automation_5days_message: string | null;
  automation_5days_time: string;
  // Follow-up de cliente sem retorno há N dias (padrão 30)
  automation_followup_enabled: boolean;
  automation_followup_days: number;
  automation_followup_message: string | null;
  automation_followup_time: string;
  // Números (somente dígitos, DDI 55) que o bot deve IGNORAR — não responde a eles
  bot_blocked_numbers?: string[] | null;
  custom_variables?: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppConversation {
  id: string;
  professional_id: string;
  client_phone: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; at: number }>;
  bot_paused: boolean;
  bot_cooldown_until?: string | null;
  client_summary?: string | null;
  last_message_at: string;
  created_at: string;
}

// ===================== FICHA DE ANAMNESE (requer migração v29) =====================

export type AnamnesisQuestionType = 'text' | 'textarea' | 'yesno' | 'select' | 'multiselect' | 'date' | 'number';

export interface AnamnesisQuestion {
  id: string;
  label: string;
  type: AnamnesisQuestionType;
  options?: string[]; // para select/multiselect
  required?: boolean;
}

export interface AnamnesisDesign {
  accent?: string;    // cor de destaque do link público e do PDF (hex)
  showLogo?: boolean; // exibe o nome/marca da profissional no topo
}

export interface AnamnesisForm {
  id: string;
  professional_id: string;
  title: string;
  description: string | null;
  questions: AnamnesisQuestion[];
  design: AnamnesisDesign;
  created_at: string;
  updated_at: string;
}

export type AnamnesisResponseStatus = 'pending' | 'completed';

export interface AnamnesisAnswer {
  questionId: string;
  answer: string | string[];
}

export interface AnamnesisResponse {
  id: string;
  form_id: string;
  professional_id: string;
  client_id: string | null;
  client_name: string;
  client_whatsapp: string;
  token: string;
  status: AnamnesisResponseStatus;
  questions_snapshot: AnamnesisQuestion[];
  design_snapshot: AnamnesisDesign;
  form_title: string;
  answers: AnamnesisAnswer[];
  signature: string | null;
  pdf_sent_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface GoogleCalendarConnection {
  id: string;
  professional_id: string;
  google_email: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  calendar_id: string;
  sync_channel_id: string | null;
  sync_resource_id: string | null;
  sync_expiration: string | null;
  last_sync_token: string | null;
  webhook_token?: string | null;   // segredo do canal de push (requer migração v38)
  last_error?: string | null;      // último erro de sync (requer migração v38)
  last_synced_at?: string | null;  // requer migração v38
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

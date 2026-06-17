-- Migration v10: Automações de WhatsApp (confirmação + lembretes)

-- Colunas de automação na tabela de configurações do WhatsApp
ALTER TABLE public.whatsapp_settings
  ADD COLUMN IF NOT EXISTS automation_booking_enabled       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS automation_booking_message       TEXT    DEFAULT 'Oi, {nome}! 😊 Seu agendamento de {servico} foi confirmado para {data} às {horario}. Te esperamos!',
  ADD COLUMN IF NOT EXISTS automation_booking_delay_minutes INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS automation_day_before_enabled    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS automation_day_before_message    TEXT    DEFAULT 'Olá, {nome}! Lembrete: amanhã você tem {servico} às {horario} com {profissional}. Até lá! 💛',
  ADD COLUMN IF NOT EXISTS automation_day_before_time       TIME    DEFAULT '10:00',
  ADD COLUMN IF NOT EXISTS automation_day_of_enabled        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS automation_day_of_message        TEXT    DEFAULT 'Bom dia, {nome}! 🌸 Hoje é o dia do seu {servico} às {horario}. Te esperamos!',
  ADD COLUMN IF NOT EXISTS automation_day_of_time           TIME    DEFAULT '08:00';

-- Controle de quais automações já foram enviadas por agendamento
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS automation_booking_sent_at    TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS automation_day_before_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS automation_day_of_sent_at     TIMESTAMP WITH TIME ZONE;

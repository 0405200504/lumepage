-- =====================================================================
-- LUME · Migração v16
-- 1) Corrige bloqueio de horário que não salvava (faltava time_blocks.block_type)
-- 2) Duas novas automações de WhatsApp:
--    - lembrete 5 dias antes do agendamento
--    - follow-up de cliente sem retorno há N dias (padrão 30)
-- Rode UMA vez no Supabase (SQL Editor). Idempotente.
-- =====================================================================

-- 1) Tipo de bloqueio (full_day | custom_time). Sem isso, o INSERT do bloqueio
--    falhava (coluna inexistente) e nada salvava.
ALTER TABLE public.time_blocks
  ADD COLUMN IF NOT EXISTS block_type TEXT NOT NULL DEFAULT 'full_day';

-- Bloqueios antigos com faixa de horário viram 'custom_time'.
UPDATE public.time_blocks
  SET block_type = 'custom_time'
  WHERE start_time IS NOT NULL AND end_time IS NOT NULL AND block_type = 'full_day';

-- 2) Novas automações nas configurações do WhatsApp
ALTER TABLE public.whatsapp_settings
  ADD COLUMN IF NOT EXISTS automation_5days_enabled    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS automation_5days_message    TEXT    DEFAULT 'Oi, {nome}! 😊 Faltam 5 dias para o seu {servico} no dia {data} às {horario}. Já está reservado pra você! Qualquer imprevisto, é só me avisar. 💛',
  ADD COLUMN IF NOT EXISTS automation_5days_time       TIME    DEFAULT '10:00',
  ADD COLUMN IF NOT EXISTS automation_followup_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS automation_followup_days    INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS automation_followup_message TEXT    DEFAULT 'Oi, {nome}! 💛 Senti sua falta por aqui. Já faz um tempinho desde o seu último {servico} — que tal agendar um horário pra se cuidar? Estou à disposição!',
  ADD COLUMN IF NOT EXISTS automation_followup_time    TIME    DEFAULT '10:00';

-- Flag de envio do lembrete "5 dias antes" por agendamento
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS automation_5days_sent_at TIMESTAMP WITH TIME ZONE;

-- Controle do follow-up por cliente (evita reenvio; é zerado quando a cliente
-- volta a agendar, pois passa a valer a data do novo atendimento).
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS followup_sent_at TIMESTAMP WITH TIME ZONE;

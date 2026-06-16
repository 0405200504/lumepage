-- v9: resumo por cliente nas conversas WhatsApp (memória do bot entre sessões)
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS client_summary TEXT;

-- v9b: link de agendamento customizável por profissional
ALTER TABLE public.whatsapp_settings
  ADD COLUMN IF NOT EXISTS booking_url TEXT;

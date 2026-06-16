-- v9: resumo por cliente nas conversas WhatsApp (memória do bot entre sessões)
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS client_summary TEXT;

-- Migration v13: cooldown do bot após mensagens automáticas
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS bot_cooldown_until TIMESTAMP WITH TIME ZONE;

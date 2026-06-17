-- Migration v11: variáveis personalizadas nas automações de WhatsApp
ALTER TABLE public.whatsapp_settings
  ADD COLUMN IF NOT EXISTS custom_variables JSONB DEFAULT '{}';

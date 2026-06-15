-- =====================================================================
-- LUME · Migração v8
-- 1) Configurações do bot WhatsApp por profissional (whatsapp_settings)
-- 2) Histórico de conversas do bot (whatsapp_conversations)
-- Rode UMA vez no Supabase (SQL Editor). Idempotente.
-- =====================================================================

-- 1) Configurações do bot WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID UNIQUE NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    uazapi_url TEXT NOT NULL DEFAULT '',
    uazapi_token TEXT NOT NULL DEFAULT '',
    webhook_secret TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    bot_enabled BOOLEAN NOT NULL DEFAULT false,
    confirmation_enabled BOOLEAN NOT NULL DEFAULT true,
    bot_persona TEXT,
    stop_keyword TEXT NOT NULL DEFAULT '#humano',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2) Histórico de conversas (mantém contexto para o Gemini)
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    client_phone TEXT NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]'::JSONB,
    bot_paused BOOLEAN NOT NULL DEFAULT false,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(professional_id, client_phone)
);

CREATE INDEX IF NOT EXISTS idx_wa_conv_prof ON public.whatsapp_conversations(professional_id, last_message_at DESC);

-- RLS: acesso via service_role (mesmo padrão das demais tabelas)
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service Role Full Access WA Settings" ON public.whatsapp_settings;
CREATE POLICY "Service Role Full Access WA Settings" ON public.whatsapp_settings
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Full Access WA Conv" ON public.whatsapp_conversations;
CREATE POLICY "Service Role Full Access WA Conv" ON public.whatsapp_conversations
    FOR ALL USING (true) WITH CHECK (true);

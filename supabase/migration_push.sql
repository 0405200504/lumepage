-- ==========================================
-- MIGRATION: Push Notifications (Web Push)
-- ==========================================

-- 1. Criação da tabela push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    auth TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_push_subs_prof_id ON public.push_subscriptions(professional_id);

-- 3. Habilitar RLS (Segurança)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de acesso
-- Somente leitura e escrita pelo service_role (via Server Actions / API routes)
CREATE POLICY "Service Role Full Access Push Subs" ON public.push_subscriptions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- =====================================================================
-- LUME · Migração v7
-- 1) Limite de horários exibidos na página pública (settings.public_slots_limit)
-- 2) Ficha técnica da cliente (clients.notes)
-- 3) Lista de espera (waitlist_entries)
-- Rode UMA vez no Supabase (SQL Editor). Idempotente.
-- =====================================================================

-- 1) Limite de horários públicos. 0 (ou NULL) = mostrar todos.
ALTER TABLE settings ADD COLUMN IF NOT EXISTS public_slots_limit INTEGER DEFAULT 0;

-- 2) Ficha técnica / observações gerais da cliente (persistente, por cliente).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3) Lista de espera
CREATE TABLE IF NOT EXISTS public.waitlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    client_whatsapp TEXT NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    service_name TEXT,
    desired_date DATE,
    desired_period TEXT,          -- ex.: "manhã", "tarde", "sábado", texto livre
    time_preference TEXT,         -- ex.: "depois das 18h"
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'waiting', -- waiting | contacted | scheduled | cancelled | no_response
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_waitlist_prof ON public.waitlist_entries(professional_id, status);

ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

-- Acesso via service_role (Server Actions / API) — mesmo padrão das demais tabelas do app.
DROP POLICY IF EXISTS "Service Role Full Access Waitlist" ON public.waitlist_entries;
CREATE POLICY "Service Role Full Access Waitlist" ON public.waitlist_entries
    FOR ALL
    USING (true)
    WITH CHECK (true);

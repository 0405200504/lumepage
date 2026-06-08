-- =====================================================================
-- LUME · Migração v6 — Salões (gerente que administra várias profissionais)
-- Rode UMA vez no Supabase (SQL Editor). Idempotente.
-- =====================================================================

CREATE TABLE IF NOT EXISTS salons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Profissional pertence a um salão (opcional)
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS salon_id UUID REFERENCES salons(id) ON DELETE SET NULL;

-- Perfil pode ser gerente de um salão (1 login que administra todas as profissionais)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS salon_id UUID REFERENCES salons(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_salon_manager BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_professionals_salon ON professionals(salon_id);

ALTER TABLE salons ENABLE ROW LEVEL SECURITY;

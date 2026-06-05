-- =====================================================================
-- LUME · Migração v2 — features de retenção e anti no-show
-- Rode UMA vez no Supabase (SQL Editor). É idempotente (IF NOT EXISTS).
-- Sem rodar isto, o sistema continua funcionando: estes campos são
-- gravados em modo "best-effort" e simplesmente não persistem até a migração.
-- =====================================================================

-- Aniversário da cliente (retenção / mimo de aniversário)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS birthday DATE;

-- Sinal / antecipação (anti no-show) por profissional
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS requires_deposit BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS deposit_instructions TEXT;

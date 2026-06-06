-- =====================================================================
-- LUME · Migração v4 — tema decorativo do popup de agendamento
-- Rode UMA vez no Supabase (SQL Editor). Idempotente.
-- Sem rodar, o app funciona; o tema apenas não persiste (usa o padrão "Brilhos").
-- =====================================================================

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS booking_theme TEXT DEFAULT 'sparkles';

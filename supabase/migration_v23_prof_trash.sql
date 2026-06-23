-- =====================================================================
-- LUME · Migração v23 — Lixeira de profissionais (soft-delete)
--
-- Antes, excluir uma profissional era IRREVERSÍVEL (apagava login + todos os dados
-- em cascata). Agora a exclusão vira "mover para a lixeira" (soft-delete): os dados
-- ficam preservados e dá para restaurar. A exclusão definitiva só acontece a partir
-- da lixeira, com confirmação.
--
-- Rode UMA vez no SQL Editor do Supabase. Idempotente.
-- =====================================================================

alter table public.professionals
  add column if not exists deleted_at timestamptz;

-- Índice parcial para listar rápido só as ativas (deleted_at is null).
create index if not exists idx_professionals_not_deleted
  on public.professionals(id) where deleted_at is null;

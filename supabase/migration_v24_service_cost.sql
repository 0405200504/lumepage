-- =====================================================================
-- LUME · Migração v24 — Custo (insumos) por serviço
--
-- Adiciona o custo variável de cada serviço (em centavos). Esse valor alimenta
-- o DRE simplificado do Financeiro: receita bruta → custos variáveis → lucro.
--
-- É opcional: enquanto a coluna não existir, o sistema assume custo 0 e tudo
-- continua funcionando (fallback gracioso). Depois de rodar, a profissional
-- pode informar o custo de insumos de cada serviço na tela de Serviços.
--
-- Rode UMA vez no SQL Editor do Supabase. Idempotente.
-- =====================================================================

alter table public.services
  add column if not exists cost_cents integer not null default 0;

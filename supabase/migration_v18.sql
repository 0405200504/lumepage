-- =====================================================================
-- LUME · Migração v18 — Lista de números que o bot deve ignorar
--
-- Permite à profissional cadastrar números específicos para os quais o bot do
-- WhatsApp NÃO deve responder (ex.: contatos pessoais, fornecedores, parceiros).
-- Os números ficam num array de texto (somente dígitos, com DDI 55).
--
-- Rode UMA vez no Supabase (SQL Editor). Idempotente.
-- =====================================================================

ALTER TABLE public.whatsapp_settings
  ADD COLUMN IF NOT EXISTS bot_blocked_numbers TEXT[] DEFAULT '{}';

-- ============================================================================
-- Migration v19 — Endurecimento de RLS (fecha vazamento de PII via anon key)
-- ============================================================================
-- CONTEXTO: o app acessa o banco SEMPRE pelo servidor com a service_role (que
-- ignora RLS). Nenhuma página usa a anon key para ler/inserir agendamentos ou
-- clientes. Porém as policies abaixo permitiam, com a anon key (que é PÚBLICA,
-- embarcada no front), baixar nome/telefone/e-mail de TODAS as clientes e inserir
-- registros em nome de qualquer profissional. Esta migration remove esses buracos.
--
-- Rode no SQL Editor do Supabase. É idempotente.
-- ============================================================================

-- 1. APPOINTMENTS — remove leitura/insert público (vazamento de PII + spam direto no banco).
--    A validação de slot e a criação de agendamento já são feitas no servidor (service_role).
DROP POLICY IF EXISTS "Public read for slot validation" ON appointments;
DROP POLICY IF EXISTS "Public insert for appointments" ON appointments;

-- 2. CLIENTS — remove insert anônimo irrestrito (CHECK true).
DROP POLICY IF EXISTS "Public insert for clients" ON clients;

-- 3. Garante RLS habilitada nas tabelas que surgiram depois do policies.sql original.
--    Sem policy + RLS habilitada = a anon key não acessa nada (fail-closed). O app
--    continua funcionando porque usa service_role no servidor.
ALTER TABLE IF EXISTS transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fixed_expenses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS waitlist_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS whatsapp_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS push_subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS salons                ENABLE ROW LEVEL SECURITY;

-- 4. (Opcional, recomendado) Confirme depois de rodar:
--    SELECT tablename, policyname, cmd, qual FROM pg_policies ORDER BY tablename;
--    Nenhuma policy de appointments/clients deve permitir SELECT/INSERT público.

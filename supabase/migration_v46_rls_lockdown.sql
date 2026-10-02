-- ============================================================================
-- Migration v46 — Fecha as policies de RLS herdadas do policies.sql original
-- ============================================================================
-- CONTEXTO: o app fala com o banco SEMPRE pelo servidor, com a service_role
-- (que ignora RLS). O navegador só usa o Supabase para AUTENTICAÇÃO (login com
-- senha e Google) — nenhuma tela lê ou grava tabela com a anon key.
--
-- Mesmo assim, as policies do policies.sql continuavam valendo para a anon key
-- (pública, embarcada no front) e para o JWT de qualquer usuária logada:
--
--   * "Public read for active professionals" → qualquer pessoa, só com a anon
--     key, lista e-mail, WhatsApp, endereço e dados de assinatura de TODAS as
--     profissionais ativas (PII).
--   * "Users can update their own profile" → a usuária edita a PRÓPRIA linha de
--     profiles sem restrição de coluna: troca role para 'super_admin' ou aponta
--     professional_id para outra conta. No próximo login o cookie nasce com
--     esse papel — escalada para admin da plataforma.
--   * "Professionals can read/update their own data" (FOR ALL em professionals)
--     → a usuária edita subscription_status/subscription_plan/subscription_ends_at
--     e se dá Premium vitalício sem pagar.
--   * "Authenticated users can read profiles" → quem cria conta lê e-mail e papel
--     de todos os perfis.
--   * "professionals_own_gcal" (v25) → a usuária lê os próprios tokens OAuth do
--     Google direto do banco (o app nunca precisou disso).
--   * "Service Role Full Access …" (v7, v8, migration_push) → o nome promete
--     service_role, mas são `FOR ALL USING (true) WITH CHECK (true)` SEM
--     `TO service_role`: valem para anon e authenticated. Com a anon key
--     qualquer pessoa lê e grava whatsapp_settings (URL e TOKEN da instância
--     uazapi de cada profissional, mensagens do bot), whatsapp_conversations
--     (histórico das clientes), waitlist_entries e push_subscriptions.
--     A service_role ignora RLS, então essas policies nunca foram necessárias.
--
-- RLS continua LIGADA em todas as tabelas; sem policy, anon/authenticated não
-- acessam nada (fail-closed). O app não muda: service_role ignora RLS.
--
-- Mantida: "lume-sites public read" em storage.objects (imagens públicas do site).
--
-- Rode no SQL Editor do Supabase. Idempotente.
-- ============================================================================

-- professionals
DROP POLICY IF EXISTS "Super admins can do everything on professionals" ON public.professionals;
DROP POLICY IF EXISTS "Public read for active professionals"             ON public.professionals;
DROP POLICY IF EXISTS "Professionals can read/update their own data"     ON public.professionals;

-- profiles
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile"    ON public.profiles;
DROP POLICY IF EXISTS "Super admins can manage profiles"      ON public.profiles;

-- services
DROP POLICY IF EXISTS "Super admins can do everything on services" ON public.services;
DROP POLICY IF EXISTS "Public read for active services"             ON public.services;
DROP POLICY IF EXISTS "Professionals can manage their own services" ON public.services;

-- availability_rules
DROP POLICY IF EXISTS "Super admins can do everything on availability rules" ON public.availability_rules;
DROP POLICY IF EXISTS "Public read for availability rules"                    ON public.availability_rules;
DROP POLICY IF EXISTS "Professionals can manage their availability"           ON public.availability_rules;

-- time_blocks
DROP POLICY IF EXISTS "Super admins can do everything on time blocks" ON public.time_blocks;
DROP POLICY IF EXISTS "Public read for time blocks"                    ON public.time_blocks;
DROP POLICY IF EXISTS "Professionals can manage their time blocks"     ON public.time_blocks;

-- settings
DROP POLICY IF EXISTS "Super admins can do everything on settings" ON public.settings;
DROP POLICY IF EXISTS "Public read for settings"                    ON public.settings;
DROP POLICY IF EXISTS "Professionals can manage their settings"     ON public.settings;

-- clients (as públicas já caíram na v19)
DROP POLICY IF EXISTS "Super admins can do everything on clients" ON public.clients;
DROP POLICY IF EXISTS "Professionals can manage their clients"     ON public.clients;

-- appointments (as públicas já caíram na v19)
DROP POLICY IF EXISTS "Super admins can do everything on appointments" ON public.appointments;
DROP POLICY IF EXISTS "Professionals can manage their appointments"     ON public.appointments;

-- google_calendar_connections (v25)
DROP POLICY IF EXISTS "professionals_own_gcal" ON public.google_calendar_connections;

-- "Service Role Full Access" sem TO service_role = acesso total para a anon key.
DROP POLICY IF EXISTS "Service Role Full Access Push Subs"   ON public.push_subscriptions;
DROP POLICY IF EXISTS "Service Role Full Access Waitlist"    ON public.waitlist_entries;
DROP POLICY IF EXISTS "Service Role Full Access WA Settings" ON public.whatsapp_settings;
DROP POLICY IF EXISTS "Service Role Full Access WA Conv"     ON public.whatsapp_conversations;

-- Garante RLS ligada (já estava; reforço idempotente).
ALTER TABLE IF EXISTS public.professionals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.services                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.availability_rules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.time_blocks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.push_subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.waitlist_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_conversations  ENABLE ROW LEVEL SECURITY;

-- get_db_stats (v21) é SECURITY DEFINER e o Postgres dá EXECUTE a todo mundo
-- por padrão: qualquer visitante, com a anon key, via /rest/v1/rpc/get_db_stats,
-- via o tamanho do banco e das tabelas. Só o /admin usa, pelo servidor.
DO $$
BEGIN
  IF to_regprocedure('public.get_db_stats()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.get_db_stats() FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.get_db_stats() TO service_role;
  END IF;
END $$;

-- Conferência depois de rodar — NENHUMA policy deve sobrar no schema public:
--   SELECT tablename, policyname, roles, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY 1, 2;
-- E o teste definitivo, com a ANON KEY (a do front), tem que devolver [] :
--   curl "$SUPABASE_URL/rest/v1/professionals?select=id&limit=1" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"

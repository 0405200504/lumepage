-- =====================================================================
-- v35 · Índices para os filtros novos do painel admin (FASE 6)
-- =====================================================================
-- As telas do /admin passaram a filtrar e paginar no banco. Sem estes índices o
-- Postgres faz seq scan em appointments/clients a cada troca de filtro.
-- Idempotente e seguro de rodar em produção (CREATE INDEX IF NOT EXISTS).

CREATE INDEX IF NOT EXISTS idx_appt_date_desc         ON public.appointments (date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appt_prof_date         ON public.appointments (professional_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appt_status_date       ON public.appointments (status, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appt_client_phone      ON public.appointments (client_whatsapp) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appt_created_at        ON public.appointments (created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clients_prof_name      ON public.clients (professional_id, name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_whatsapp       ON public.clients (whatsapp) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_created_at     ON public.clients (created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_prof_status            ON public.professionals (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_prof_subscription      ON public.professionals (subscription_status, subscription_ends_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conv_paused_last       ON public.whatsapp_conversations (bot_paused, last_message_at);

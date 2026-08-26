-- =============================================================
-- Migração v38 — Google Agenda (sync confiável) + onboarding
-- =============================================================
-- Roda depois da v25 (google_calendar_connections). Idempotente.

-- ─── 1. Bloqueios vindos do Google ────────────────────────────
-- Antes o sync criava time_blocks sem guardar de qual evento vieram, e a
-- remoção procurava em `appointments` — ou seja: evento apagado no Google
-- deixava o horário bloqueado para sempre na Lume. Agora cada bloqueio
-- carrega o id do evento e o sync consegue atualizar/remover pelo id.
ALTER TABLE time_blocks
  ADD COLUMN IF NOT EXISTS google_event_id TEXT;

CREATE INDEX IF NOT EXISTS idx_time_blocks_google_event
  ON time_blocks(professional_id, google_event_id)
  WHERE google_event_id IS NOT NULL;

-- ─── 2. Token do webhook do Google ────────────────────────────
-- O endpoint /api/google/webhook aceitava qualquer POST que trouxesse um
-- channel-id conhecido. O Google devolve este token no header
-- X-Goog-Channel-Token; guardamos aqui para conferir na chegada.
ALTER TABLE google_calendar_connections
  ADD COLUMN IF NOT EXISTS webhook_token TEXT;

-- Último erro de sync (aparece nas configurações quando a conexão cai).
ALTER TABLE google_calendar_connections
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- ─── 3. Onboarding da conta ───────────────────────────────────
-- Quem entra com Google não passa pelo formulário de cadastro: chega sem
-- nome do negócio, sem WhatsApp e com um slug gerado. Esta coluna marca
-- quem já completou esses dados; quem está NULL é levado para /bem-vinda.
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Contas que já existem e já têm WhatsApp preenchido não devem ver o
-- onboarding — marca como concluído retroativamente.
UPDATE professionals
   SET onboarding_completed_at = COALESCE(onboarding_completed_at, created_at, now())
 WHERE onboarding_completed_at IS NULL
   AND COALESCE(whatsapp, '') <> '';

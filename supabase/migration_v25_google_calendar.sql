-- =============================================================
-- Migração v25 — Google Calendar Integration
-- =============================================================

-- Tabela de conexões Google Calendar por profissional
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  calendar_id TEXT DEFAULT 'primary',
  sync_channel_id TEXT,
  sync_resource_id TEXT,
  sync_expiration TIMESTAMPTZ,
  last_sync_token TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(professional_id)
);

-- Coluna para mapear agendamento ↔ evento do Google
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- RLS
ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "professionals_own_gcal"
  ON google_calendar_connections
  FOR ALL
  USING (professional_id IN (
    SELECT p.id FROM professionals p
    JOIN profiles pr ON pr.professional_id = p.id
    WHERE pr.auth_user_id = auth.uid()
  ));

-- Índice para busca rápida por google_event_id
CREATE INDEX IF NOT EXISTS idx_appointments_google_event_id
  ON appointments(google_event_id) WHERE google_event_id IS NOT NULL;

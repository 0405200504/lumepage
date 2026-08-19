-- =====================================================================
-- v34 · Avisos para a base e configurações globais (FASE 4)
-- =====================================================================
-- Idempotente. Sem ela: /admin/broadcast e /admin/settings avisam que a migration
-- falta e continuam abrindo (nada quebra no resto do app).

-- Avisos in-app que o admin publica para as profissionais.
CREATE TABLE IF NOT EXISTS public.admin_notices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  level       TEXT NOT NULL DEFAULT 'info',   -- info | warn | success
  audience    TEXT NOT NULL DEFAULT 'all',    -- all | active | trialing | no_bot
  active      BOOLEAN NOT NULL DEFAULT true,
  starts_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at     TIMESTAMPTZ,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notices_active ON public.admin_notices (active, starts_at DESC);

-- Configurações globais da plataforma (chave/valor).
CREATE TABLE IF NOT EXISTS public.app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.admin_notices IS 'Avisos in-app publicados pelo admin para as profissionais.';
COMMENT ON TABLE public.app_settings IS 'Configurações globais da plataforma (chave/valor), editadas em /admin/settings.';

-- =====================================================================
-- v33 · Planos e histórico de assinatura
-- =====================================================================
-- Hoje o plano vive em três colunas de `professionals` (subscription_plan,
-- subscription_status, subscription_ends_at). Isso continua sendo a FONTE que o app
-- lê para liberar recursos — não mexemos nisso para não quebrar entitlements.
--
-- O que falta e esta migration entrega:
--   `plans`               → catálogo editável (nome, preço, ciclo, limites)
--   `subscription_events` → histórico: quem mudou o quê, quando e por quê
--
-- Idempotente. Sem ela, o /admin/plans mostra o catálogo embutido em código e as
-- mudanças de plano continuam funcionando, só não guardam histórico.

CREATE TABLE IF NOT EXISTS public.plans (
  key            TEXT PRIMARY KEY,              -- 'start' | 'pro' | 'premium' (bate com o enum atual)
  name           TEXT NOT NULL,
  price_cents    INTEGER NOT NULL DEFAULT 0,
  billing_cycle  TEXT NOT NULL DEFAULT 'monthly', -- monthly | yearly
  description    TEXT,
  features       JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id    UUID NOT NULL,
  plan_key           TEXT,
  status             TEXT,
  current_period_end TIMESTAMPTZ,
  note               TEXT,
  changed_by         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_events_prof ON public.subscription_events (professional_id, created_at DESC);

-- Catálogo inicial: os três planos que o código já conhece. Preços são chute inicial —
-- edite em /admin/plans, é para isso que a tabela existe.
INSERT INTO public.plans (key, name, price_cents, billing_cycle, description, sort_order) VALUES
  ('start',   'Start',   4900,  'monthly', 'Agenda, serviços e link público.',            1),
  ('pro',     'Pro',     9900,  'monthly', 'Tudo do Start + financeiro, CRM e vendas.',   2),
  ('premium', 'Premium', 14900, 'monthly', 'Tudo do Pro + bot de WhatsApp e Minha Página.', 3)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.plans IS 'Catálogo de planos do SaaS (editável em /admin/plans).';
COMMENT ON TABLE public.subscription_events IS 'Histórico de mudanças de plano feitas pelo admin.';

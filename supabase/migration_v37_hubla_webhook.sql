-- =====================================================================
-- v37 · Log e deduplicação do webhook da Hubla
-- =====================================================================
-- A Hubla reenvia o mesmo aviso em retentativa (5 vezes) e no reprocessamento
-- manual do painel. `idempotency_key` é PRIMARY KEY: o segundo insert falha e o
-- webhook para ali, sem ativar/cancelar duas vezes.
--
-- Serve também de conciliação: quando alguém paga com um e-mail diferente do
-- cadastro, o evento fica aqui com result = 'unmatched' e o payload inteiro.
--
-- Idempotente. Sem ela o webhook continua funcionando (o código detecta a tabela
-- ausente pelo código 42P01), só perde histórico e proteção contra duplicidade.

CREATE TABLE IF NOT EXISTS public.hubla_webhook_events (
  idempotency_key  TEXT PRIMARY KEY,           -- header x-hubla-idempotency
  event_type       TEXT,                       -- invoice.payment_succeeded, ...
  email            TEXT,
  subscription_id  TEXT,
  invoice_id       TEXT,
  professional_id  UUID,                       -- conta encontrada (null = órfão)
  result           TEXT,                       -- activated | revoked | past_due | unmatched | error: ...
  payload          JSONB,
  received_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hubla_events_prof
  ON public.hubla_webhook_events (professional_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_hubla_events_email
  ON public.hubla_webhook_events (lower(email));

-- Pagamentos que não encontraram dona — é a fila de conciliação manual.
CREATE INDEX IF NOT EXISTS idx_hubla_events_unmatched
  ON public.hubla_webhook_events (received_at DESC)
  WHERE result = 'unmatched';

-- Só o service_role (server) escreve e lê. Nenhuma policy = nenhum acesso via
-- anon/authenticated, que é exatamente o que queremos: o payload traz CPF,
-- endereço de cobrança e valores.
ALTER TABLE public.hubla_webhook_events ENABLE ROW LEVEL SECURITY;

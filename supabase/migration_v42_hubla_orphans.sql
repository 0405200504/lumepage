-- =====================================================================
-- v42 · Compras órfãs da Hubla — e-mail de boas-vindas sem duplicar
-- =====================================================================
-- Compra órfã = pagou na Hubla e não existe conta com aquele e-mail. Os eventos
-- continuam em `hubla_webhook_events` com result = 'unmatched' (v37); esta
-- tabela só guarda QUEM já recebeu o e-mail "falta criar sua conta".
--
-- Por que uma tabela: uma venda chega em até três avisos quase simultâneos
-- (invoice.payment_succeeded, subscription.activated, customer.member_added),
-- cada um numa função serverless diferente. `email` é PRIMARY KEY: o primeiro
-- insert ganha e manda o e-mail; os outros batem no 23505 e ficam quietos.
--
-- Idempotente. Sem ela o webhook continua mandando o e-mail, só que apenas no
-- `invoice.payment_succeeded` (um por cobrança) e sem o "enviado em" no admin.

CREATE TABLE IF NOT EXISTS public.hubla_orphan_notices (
  email          TEXT PRIMARY KEY,                    -- e-mail do comprador, minúsculo
  first_sent_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sent_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_count     INTEGER NOT NULL DEFAULT 1,
  sent_by        TEXT                                  -- 'webhook' ou e-mail do admin que reenviou
);

-- Mesma regra da v37: só o service_role lê e escreve.
ALTER TABLE public.hubla_orphan_notices ENABLE ROW LEVEL SECURITY;

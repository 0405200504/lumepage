-- =====================================================================
-- v44 · Notificação de faturamento do fim do dia (e da semana)
-- =====================================================================
-- "Parabéns, Fulana! Hoje você faturou R$ X" sai pelo cron de 5 em 5 min
-- (/api/cron/reminders) a partir das 21h. Esta tabela guarda QUEM já recebeu
-- o resumo de cada dia: a primeira passada insere e envia, as outras batem na
-- PRIMARY KEY e ficam quietas.
--
-- kind: 'day' (hoje) ou 'week' (domingo a sábado, enviado no sábado).
-- period: o dia do envio.
--
-- Idempotente. Sem ela o resumo fica desligado (o app não arrisca mandar a
-- mesma notificação a cada 5 minutos). O "Novo agendamento!" não depende dela.

CREATE TABLE IF NOT EXISTS public.push_digests (
  professional_id  UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  kind             TEXT NOT NULL CHECK (kind IN ('day', 'week')),
  period           DATE NOT NULL,
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (professional_id, kind, period)
);

CREATE INDEX IF NOT EXISTS idx_push_digests_period ON public.push_digests(period);

-- Só o service_role lê e escreve.
ALTER TABLE public.push_digests ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';

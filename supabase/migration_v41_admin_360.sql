-- =====================================================================
-- v41 · Controle 360 do admin: CRM de contas, tarefas e adiamento de alertas
-- =====================================================================
-- O admin passa a ter, por conta: responsável, etiquetas, próximo contato,
-- motivo de cancelamento e notas de suporte. E para si: tarefas com prazo
-- (criadas à mão ou a partir de um alerta) e a possibilidade de adiar um alerta
-- por alguns dias sem perdê-lo de vista.
--
-- Idempotente. Sem ela o /admin continua abrindo: cada bloco avisa que a
-- migration falta e segue só-leitura (mesmo padrão das v32/v33/v34).

-- ─── 1. Metadados de CRM por conta ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_account_meta (
  professional_id  UUID PRIMARY KEY,
  owner_email      TEXT,                         -- quem da Lume cuida desta conta
  tags             TEXT[] NOT NULL DEFAULT '{}', -- 'vip', 'indicação', 'churn-risk'…
  next_follow_up   DATE,                         -- próximo contato combinado
  churn_reason     TEXT,                         -- preenchido ao cancelar
  updated_by       TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_meta_follow_up
  ON public.admin_account_meta (next_follow_up)
  WHERE next_follow_up IS NOT NULL;

-- ─── 2. Notas de suporte ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_notes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id  UUID NOT NULL,
  admin_email      TEXT,
  body             TEXT NOT NULL,
  pinned           BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notes_prof
  ON public.admin_notes (professional_id, pinned DESC, created_at DESC);

-- ─── 3. Tarefas do admin ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  professional_id  UUID,                         -- opcional: tarefa ligada a uma conta
  due_date         DATE,
  done_at          TIMESTAMPTZ,
  created_by       TEXT,
  source           TEXT,                         -- 'manual' | 'alert:<id>'
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_tasks_open
  ON public.admin_tasks (due_date, created_at)
  WHERE done_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_admin_tasks_prof
  ON public.admin_tasks (professional_id, created_at DESC);

-- ─── 4. Alertas adiados ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_alert_snoozes (
  key          TEXT PRIMARY KEY,                 -- id do alerta (lib/admin/alerts.ts)
  until        TIMESTAMPTZ NOT NULL,
  admin_email  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mesma postura das demais tabelas do admin: RLS ligado e NENHUMA policy.
-- Só a service-role (o servidor) lê e escreve.
ALTER TABLE public.admin_account_meta  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_alert_snoozes ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.admin_account_meta  IS 'CRM do admin por conta: responsável, etiquetas, próximo contato, motivo de churn.';
COMMENT ON TABLE public.admin_notes         IS 'Notas de suporte do admin sobre uma conta.';
COMMENT ON TABLE public.admin_tasks         IS 'Tarefas do admin (manuais ou criadas a partir de alertas).';
COMMENT ON TABLE public.admin_alert_snoozes IS 'Alertas do admin adiados por alguns dias.';

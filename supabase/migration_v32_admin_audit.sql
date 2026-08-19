-- =====================================================================
-- v32 · Trilha de auditoria do painel administrativo
-- =====================================================================
-- Motivo: o servidor fala com o banco pela service-role key e não há RLS em
-- runtime. Sem log, uma ação destrutiva do admin (pausar conta, esvaziar lixeira,
-- excluir profissional, mudar plano) não deixa rastro nenhum.
--
-- Idempotente: pode rodar de novo sem erro.
-- Enquanto esta migration não for aplicada, o app continua funcionando — o
-- logAdminAction() detecta a tabela ausente e apenas avisa no console.

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     TEXT,                    -- profile_id de quem agiu
  admin_email  TEXT,
  action       TEXT NOT NULL,           -- ex.: 'professional.status.update'
  entity_type  TEXT,                    -- ex.: 'professional', 'salon', 'subscription'
  entity_id    TEXT,
  before       JSONB,                   -- estado anterior (só os campos tocados)
  after        JSONB,                   -- estado novo
  ip           TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Consultas da tela /admin/logs: por período, por admin, por entidade.
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin      ON public.admin_audit_log (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_entity     ON public.admin_audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action     ON public.admin_audit_log (action, created_at DESC);

-- Mesma postura das demais tabelas (v19): RLS ligado e NENHUMA policy.
-- O acesso é exclusivo da service-role, que ignora RLS. Cliente anônimo não lê nada.
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.admin_audit_log IS
  'Trilha de auditoria do /admin. Escrita por lib/audit.ts em toda action mutante.';

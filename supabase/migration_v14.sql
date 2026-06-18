-- Migration v14: multi-serviço por agendamento, lixeira (soft-delete) de
-- agendamentos e clientes, e receita automática vinculada ao agendamento.

-- Multi-serviço: NULL = usa a coluna service_id (retrocompatível)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS service_ids uuid[];

-- Lixeira (soft-delete)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Receita automática: entrada do Financeiro vinculada ao agendamento concluído
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL;

-- Índices para acelerar as leituras que ignoram a lixeira
CREATE INDEX IF NOT EXISTS idx_appts_not_deleted
  ON public.appointments(professional_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_not_deleted
  ON public.clients(professional_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_appointment
  ON public.transactions(appointment_id);

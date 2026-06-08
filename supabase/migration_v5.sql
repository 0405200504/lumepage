-- =====================================================================
-- LUME · Migração v5 — tarefas com data/horário (aparecem na Agenda)
-- Rode UMA vez no Supabase (SQL Editor). Idempotente.
-- Sem rodar, as tarefas continuam funcionando como lista; só não recebem
-- data/horário nem aparecem na agenda até a ativação.
-- =====================================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_time TIME;
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(professional_id, due_date);

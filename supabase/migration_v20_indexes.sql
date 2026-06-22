-- ============================================================================
-- Migration v20 — Índices de performance
-- ============================================================================
-- A query mais quente do sistema (cálculo de horários livres) filtra agendamentos
-- por (professional_id, date). O bot do WhatsApp chama isso várias vezes por
-- mensagem. Sem um índice composto, o Postgres varre as linhas da profissional a
-- cada consulta. Estes índices tornam a leitura por dia O(log n).
--
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================================

-- Agendamentos por profissional + data (ignorando a lixeira) — usado por
-- getAppointmentsByProfessionalAndDate e pelo cálculo de slots.
CREATE INDEX IF NOT EXISTS idx_appts_prof_date
  ON appointments(professional_id, date)
  WHERE deleted_at IS NULL;

-- Serviços por profissional (listagens do painel, agendamento, bot).
CREATE INDEX IF NOT EXISTS idx_services_prof
  ON services(professional_id);

-- Regras de disponibilidade por profissional (cálculo de slots).
CREATE INDEX IF NOT EXISTS idx_availability_prof
  ON availability_rules(professional_id);

-- Bloqueios por profissional + data (cálculo de slots).
CREATE INDEX IF NOT EXISTS idx_timeblocks_prof_date
  ON time_blocks(professional_id, date);

-- Busca de agendamentos da cliente pelo telefone (bot / automações).
CREATE INDEX IF NOT EXISTS idx_appts_prof_phone
  ON appointments(professional_id, client_whatsapp)
  WHERE deleted_at IS NULL;

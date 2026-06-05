-- =====================================================================
-- LUME · Migração v3 — CRM 360 (financeiro + tarefas) e features v2
-- Rode UMA vez no Supabase (SQL Editor). Idempotente — inclui tudo da v2.
-- Sem rodar, o app continua funcionando; os módulos financeiro/tarefas
-- apenas aparecem vazios até a ativação.
-- =====================================================================

-- ---- v2: colunas opcionais (retenção / anti no-show) ----
ALTER TABLE clients  ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS requires_deposit BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS deposit_instructions TEXT;

-- ---- v3: financeiro ----
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount_cents INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Geral',
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_transactions_prof ON transactions(professional_id, date DESC);

-- ---- v3: tarefas / notas ----
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tasks_prof ON tasks(professional_id, created_at DESC);

-- ---- v3: contas fixas mensais (entram automaticamente em todo mês) ----
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_fixed_prof ON fixed_expenses(professional_id);

-- ---- RLS: o app acessa via service-role (autorização na camada de actions) ----
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;

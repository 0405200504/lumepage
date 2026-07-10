-- =====================================================================
-- LUME · Migração v29 — Fichas de Anamnese
--
-- Cria o módulo de fichas de anamnese:
--   • anamnesis_forms      → modelos de ficha da profissional (perguntas em JSONB)
--   • anamnesis_responses  → envios/respostas de clientes (link público por token)
--
-- Fluxo: a profissional monta a ficha (do zero ou a partir de um modelo
-- pronto), envia um link único para a cliente, a cliente responde pelo
-- celular e o sistema gera o PDF para as duas — com envio automático do
-- PDF no WhatsApp da cliente ao concluir (se o WhatsApp estiver conectado).
--
-- É opcional: enquanto as tabelas não existirem, o app mostra um aviso
-- pedindo para rodar esta migração (fallback gracioso).
--
-- Rode UMA vez no SQL Editor do Supabase. Idempotente.
-- =====================================================================

create table if not exists public.anamnesis_forms (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  title text not null,
  description text,
  -- Perguntas: [{ id, label, type: 'text'|'textarea'|'yesno'|'select'|'multiselect'|'date'|'number', options: text[], required: bool }]
  questions jsonb not null default '[]'::jsonb,
  -- Aparência do link público e do PDF: { accent: '#8c2438', showLogo: bool }
  design jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.anamnesis_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.anamnesis_forms(id) on delete cascade,
  professional_id uuid not null references public.professionals(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null default '',
  client_whatsapp text not null default '',
  -- Token do link público (/ficha/<token>) — longo e aleatório, não adivinhável
  token text not null unique,
  status text not null default 'pending' check (status in ('pending','completed')),
  -- Snapshot das perguntas no momento do envio (editar o modelo não corrompe respostas antigas)
  questions_snapshot jsonb not null default '[]'::jsonb,
  design_snapshot jsonb not null default '{}'::jsonb,
  form_title text not null default '',
  -- Respostas: [{ questionId, answer }] (answer: string ou string[])
  answers jsonb not null default '[]'::jsonb,
  -- Assinatura digitada pela cliente ao confirmar a veracidade das respostas
  signature text,
  pdf_sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_anamnesis_forms_professional
  on public.anamnesis_forms (professional_id);

create index if not exists idx_anamnesis_responses_professional
  on public.anamnesis_responses (professional_id, created_at desc);

create index if not exists idx_anamnesis_responses_token
  on public.anamnesis_responses (token);

-- RLS: como todo o app, o acesso é feito pelo service-role no servidor;
-- bloqueia acesso direto anônimo.
alter table public.anamnesis_forms enable row level security;
alter table public.anamnesis_responses enable row level security;

-- ============================================================================
-- v48 · "Quero mais clientes" (assessoria de aquisição)
-- ============================================================================
-- Uma linha por profissional. Começa BLOQUEADA: a aba mostra a vitrine da
-- assessoria e o botão para agendar a call. Só o admin libera (depois do
-- pagamento). Liberada, guarda a jornada da profissional:
--   intake     respostas do formulário (o que o Lume ainda não sabia)
--   assets     fotos e vídeos enviados (caminho no bucket privado + autorização)
--   diagnosis  diagnóstico do Instagram e do Google (nota por item + tutorial)
--   plan       estruturação: 3 serviços, ofertas aprovadas, verba, raio, X1
--   meta       conta de anúncios, Página e Instagram DELA que o robô da Lume
--              opera (ela compartilha com o Gerenciador da Lume como parceira;
--              o robô vincula sozinho; o admin pode trocar)
--   robo       onde o robô de anúncios está com essa conta (etapa, mensagem,
--              avisos já mandados, pausado pelo admin)
--
-- Segurança (regra do projeto desde a v46): RLS ligada e NENHUMA policy. Todo
-- acesso passa pelo servidor com service-role, depois de authorizeProfessional.
-- As fotos ficam em bucket PRIVADO (podem ter rosto de cliente): o painel lê
-- por URL assinada de curta duração.
-- ============================================================================

create table if not exists public.growth_programs (
  professional_id uuid primary key references public.professionals(id) on delete cascade,
  status          text not null default 'bloqueado' check (status in ('bloqueado', 'liberado')),
  unlocked_at     timestamptz,
  unlocked_by     text,
  intake          jsonb not null default '{}'::jsonb,
  assets          jsonb not null default '[]'::jsonb,
  diagnosis       jsonb,
  plan            jsonb,
  meta            jsonb,
  robo            jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Quem rodou uma versão anterior desta migração ganha a coluna nova aqui.
alter table public.growth_programs add column if not exists meta jsonb;
alter table public.growth_programs add column if not exists robo jsonb;

alter table public.growth_programs enable row level security;

create index if not exists growth_programs_status_idx on public.growth_programs (status);

-- Bucket privado das fotos e vídeos (até 50 MB por arquivo: vídeo curto do atendimento).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lume-growth', 'lume-growth', false, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
on conflict (id) do nothing;

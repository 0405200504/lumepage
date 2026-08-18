-- =====================================================================
-- LUME · Migração v30 — "Minha Página" (site/link na bio multi-tenant)
--
-- Cria UMA tabela nova (professional_sites) que guarda SOMENTE a
-- apresentação da página pública da profissional:
--   • template_id      → qual dos templates de código será renderizado
--   • draft_config     → rascunho (o que a profissional está editando)
--   • published_config → o que está no ar (usado pela página pública)
--
-- O que NÃO entra aqui (continua na sua tabela de origem, fonte única
-- da verdade): serviços, clientes, agendamentos, disponibilidade,
-- financeiro, configurações de agenda. A página pública LÊ esses dados
-- dos módulos existentes.
--
-- O slug da página também NÃO é novo: reusa professionals.slug, o mesmo
-- que já serve /agendar/<slug>. Assim /marianails e /agendar/marianails
-- apontam para a mesma profissional, sem duplicidade.
--
-- É opcional: enquanto a tabela não existir, o app mostra um aviso
-- pedindo para rodar esta migração (fallback gracioso, nada quebra).
--
-- Rode UMA vez no SQL Editor do Supabase. Idempotente.
-- =====================================================================

create table if not exists public.professional_sites (
  id uuid primary key default gen_random_uuid(),
  -- Tenant: a MESMA entidade usada por todo o resto do sistema.
  professional_id uuid not null unique
    references public.professionals(id) on delete cascade,
  -- Template escolhido (id textual do registro em lib/site/templates.ts)
  template_id text not null default 'editorial-nude',
  -- 'draft' = nunca publicada | 'published' = no ar | 'unpublished' = tirada do ar
  status text not null default 'draft'
    check (status in ('draft', 'published', 'unpublished')),
  -- Conteúdo da página (SiteConfig). Só apresentação — nunca dados de negócio.
  draft_config jsonb not null default '{}'::jsonb,
  published_config jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_professional_sites_professional
  on public.professional_sites (professional_id);

-- Busca da página pública: só interessa quem está publicado.
create index if not exists idx_professional_sites_published
  on public.professional_sites (status) where status = 'published';

-- updated_at automático (a função já existe desde o schema.sql original).
do $$
begin
  if exists (select 1 from pg_proc where proname = 'update_modified_column') then
    drop trigger if exists update_professional_sites_modtime on public.professional_sites;
    create trigger update_professional_sites_modtime
      before update on public.professional_sites
      for each row execute procedure update_modified_column();
  end if;
end $$;

-- RLS: como todo o app, o acesso é feito pelo service-role no servidor.
-- Sem policy + RLS ligada = a anon key (pública, embarcada no front) não lê
-- nem escreve nada aqui. O isolamento real é feito nas server actions.
alter table public.professional_sites enable row level security;

-- =====================================================================
-- Storage: bucket das imagens da página (logo, foto, galeria, antes/depois).
-- Arquivos ficam SEMPRE em <professional_id>/... — um prefixo por tenant.
-- Upload/remoção só acontecem pelo servidor (service-role); a leitura é
-- pública porque as imagens aparecem na página pública.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lume-sites',
  'lume-sites',
  true,
  5242880, -- 5 MB por arquivo
  array['image/jpeg','image/png','image/webp','image/avif','image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif','image/gif'];

-- Leitura pública das imagens do bucket (só SELECT, só deste bucket).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'lume-sites public read'
  ) then
    create policy "lume-sites public read"
      on storage.objects for select
      using (bucket_id = 'lume-sites');
  end if;
end $$;

-- Conferência depois de rodar:
--   select id, public from storage.buckets where id = 'lume-sites';
--   select count(*) from public.professional_sites;

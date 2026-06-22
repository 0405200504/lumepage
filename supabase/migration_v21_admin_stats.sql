-- ============================================================================
-- Migration v21 — Estatísticas de armazenamento para o painel Super Admin
-- ============================================================================
-- Cria uma função que retorna o tamanho total do banco + o tamanho das maiores
-- tabelas. Usada pelo card de "Armazenamento" no painel admin para mostrar quanto
-- do plano Free (500 MB) já foi usado.
--
-- Rode no SQL Editor do Supabase. Idempotente.
-- ============================================================================

create or replace function public.get_db_stats()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'db_size_bytes', pg_database_size(current_database()),
    'tables', (
      select coalesce(jsonb_agg(jsonb_build_object('name', name, 'bytes', bytes)), '[]'::jsonb)
      from (
        select c.relname as name, pg_total_relation_size(c.oid) as bytes
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
        order by pg_total_relation_size(c.oid) desc
        limit 8
      ) top_tables
    )
  );
$$;

grant execute on function public.get_db_stats() to service_role, authenticated;

-- =====================================================================
-- LUME · Migração v39 — pg_cron do sync com o Google Agenda
--
-- O push do Google (webhook) cobre o dia a dia, mas o canal expira em 7 dias
-- e às vezes uma notificação se perde. Este job roda /api/cron/google-sync a
-- cada 15 min: refaz o sync incremental e renova o canal antes de expirar.
--
-- ⚠️ ANTES DE RODAR, troque:
--    - 'https://SEU_DOMINIO' pelo domínio real do app (o mesmo NEXT_PUBLIC_APP_URL)
--    - 'COLE_AQUI_O_CRON_SECRET' pelo valor real do CRON_SECRET
-- Rode UMA vez no SQL Editor do Supabase. Idempotente.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'lume-google-sync') then
    perform cron.unschedule('lume-google-sync');
  end if;
end $$;

select cron.schedule(
  'lume-google-sync',
  '*/15 * * * *',
  $$
    select net.http_get(
      url := 'https://SEU_DOMINIO/api/cron/google-sync',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || 'COLE_AQUI_O_CRON_SECRET'
      )
    )
  $$
);

-- Conferência (opcional):
-- select jobid, jobname, schedule, active from cron.job where jobname = 'lume-google-sync';

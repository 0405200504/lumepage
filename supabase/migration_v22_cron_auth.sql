-- =====================================================================
-- LUME · Migração v22 — pg_cron das automações COM autenticação
--
-- PROBLEMA: o endpoint /api/cron/reminders virou fail-closed (exige CRON_SECRET).
-- O pg_cron da v17 chamava SEM cabeçalho Authorization → 401 → automáticas paradas.
-- (O cron do GitHub Actions é instável/atrasado, então não dá pra depender só dele.)
--
-- SOLUÇÃO: reagenda o job do pg_cron enviando o header Authorization: Bearer <CRON_SECRET>,
-- com o MESMO valor que está em CRON_SECRET na Vercel. Dispara a cada 5 min, confiável.
--
-- ⚠️ TROQUE 'COLE_AQUI_O_CRON_SECRET' pelo valor real do CRON_SECRET da Vercel
--    (o mesmo que está no GitHub Secrets). Rode UMA vez no SQL Editor do Supabase.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove o agendamento anterior (sem header) para não duplicar
do $$
begin
  if exists (select 1 from cron.job where jobname = 'lume-reminders') then
    perform cron.unschedule('lume-reminders');
  end if;
end $$;

-- Reagenda a cada 5 minutos, AGORA enviando o secret no cabeçalho Authorization.
select cron.schedule(
  'lume-reminders',
  '*/5 * * * *',
  $$
    select net.http_get(
      url := 'https://lume-agendamentos.vercel.app/api/cron/reminders',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || 'COLE_AQUI_O_CRON_SECRET'
      )
    )
  $$
);

-- Conferência (opcional): lista o job agendado
-- select jobid, jobname, schedule, active from cron.job where jobname = 'lume-reminders';

-- Ver as últimas execuções e o status HTTP retornado (útil para depurar):
-- select status, status_code, error_msg, created
--   from net._http_response order by created desc limit 5;

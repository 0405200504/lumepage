-- =====================================================================
-- LUME · Migração v17 — Agendador das automações (pg_cron no Supabase)
--
-- PROBLEMA: as mensagens automáticas (confirmação, 5 dias antes, dia anterior,
-- no dia, follow-up) são enviadas pela rota /api/cron/reminders. Essa rota só
-- envia quando é CHAMADA — e não havia ninguém a chamando periodicamente, então
-- nada era disparado sozinho.
--
-- SOLUÇÃO: o próprio Supabase passa a chamar a rota a cada 5 minutos, usando as
-- extensões pg_cron (agendador) + pg_net (requisição HTTP). Não depende do
-- GitHub nem do plano da Vercel.
--
-- Rode UMA vez no Supabase (SQL Editor). Idempotente.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove um agendamento anterior com o mesmo nome (evita duplicar ao rodar de novo)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'lume-reminders') then
    perform cron.unschedule('lume-reminders');
  end if;
end $$;

-- Agenda a chamada a cada 5 minutos.
-- Obs.: o endpoint hoje é aberto. Se um dia você definir CRON_SECRET na Vercel,
-- troque a linha do net.http_get por uma versão com cabeçalho Authorization
-- (Bearer <secret>) — peça que eu te passo a versão pronta.
select cron.schedule(
  'lume-reminders',
  '*/5 * * * *',
  $$ select net.http_get(url := 'https://lume-agendamentos.vercel.app/api/cron/reminders') $$
);

-- Conferência: lista o job agendado
-- select jobid, jobname, schedule, active from cron.job where jobname = 'lume-reminders';

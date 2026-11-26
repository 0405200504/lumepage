-- ════════════════════════════════════════════════════════════════════════════
-- v49 · As mensagens automáticas passam a ser disparadas pelo próprio banco
-- ════════════════════════════════════════════════════════════════════════════
-- Lembretes e confirmações do WhatsApp só saem quando alguém chama
-- /api/cron/reminders. Quem chamava era o agendamento do GitHub Actions ("a
-- cada 5 minutos"), que na prática rodava 2 ou 3 vezes por dia: em 27 dias
-- medidos (20/10 a 26/11/2026), o lembrete das 06:00 nunca saiu em até 10 min,
-- e a mediana de atraso foi de quase 3 horas.
--
-- Aqui o pg_cron do Supabase passa a chamar a rota a cada 5 minutos, com um
-- segredo gerado neste banco — o mesmo esquema da guarda da voz (v43). Não
-- depende do CRON_SECRET, que na Vercel é "sensível" e ninguém consegue ler.
--
-- O agendamento do GitHub pode continuar ligado como reserva: a coluna
-- locked_until é a trava que impede duas rodadas ao mesmo tempo (sem ela, as
-- duas mandariam a mesma mensagem).
--
-- Precisa do código que aceita este segredo (lib/cron/scheduler.ts) já no ar.
-- Pode rodar de novo sem medo: não troca o segredo nem duplica o job.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.lume_cron (
  name         text primary key,
  -- Segredo que o job manda no cabeçalho Authorization. Só o service_role lê.
  token        text not null,
  -- Trava: enquanto for maior que agora, há uma rodada em andamento.
  locked_until timestamptz not null default to_timestamp(0),
  -- Início da última rodada. O admin avisa quando passa de 20 min.
  last_run_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- RLS ligada e nenhuma policy: anon e authenticated não leem nem escrevem.
alter table public.lume_cron enable row level security;

insert into public.lume_cron (name, token)
values ('reminders', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (name) do nothing;

do $$
declare
  t text;
begin
  select token into t from public.lume_cron where name = 'reminders';
  if exists (select 1 from cron.job where jobname = 'lume-reminders') then
    perform cron.unschedule('lume-reminders');
  end if;
  perform cron.schedule(
    'lume-reminders',
    '*/5 * * * *',
    format(
      -- A rodada pode levar até 60 s; sem o timeout, o pg_net desiste em 5 s
      -- e registra erro mesmo com a rota tendo funcionado.
      $cmd$select net.http_get(url := %L, headers := jsonb_build_object('Authorization', %L), timeout_milliseconds := 60000)$cmd$,
      -- Se o domínio do Lume mudar, troque aqui e rode de novo.
      'https://www.lumepage.com.br/api/cron/reminders',
      'Bearer ' || t
    )
  );
end $$;

-- A API REST só enxerga a tabela nova depois disto.
notify pgrst, 'reload schema';

-- Conferência (opcional), uns 6 minutos depois de rodar:
-- select jobname, schedule, active from cron.job where jobname = 'lume-reminders';
-- select name, last_run_at, locked_until from public.lume_cron;
-- select status_code, left(content, 200), created from net._http_response order by created desc limit 5;

-- =====================================================================
-- LUME · Migração v42 — teto de gasto de IA por profissional (R$/mês)
--
-- Toda chamada à IA da assistente (chat de texto, ditado e conversa por
-- voz) soma o custo REAL em ai_usage_monthly. Quando a profissional chega
-- ao teto do mês (AI_MONTHLY_BUDGET_BRL, padrão R$ 10), a assistente para
-- de responder até o dia 1º. As conversas por voz ficam em ai_voice_calls,
-- com prazo: o servidor encerra a chamada na OpenAI quando ele vence.
--
-- Sem esta migração a conversa por voz fica DESLIGADA (o teto não teria
-- onde ser contado). O chat de texto continua funcionando.
--
-- ⚠️ ANTES DE RODAR, troque no fim do arquivo:
--    - 'https://SEU_DOMINIO' pelo domínio real do app (o mesmo NEXT_PUBLIC_APP_URL)
--    - 'COLE_AQUI_O_CRON_SECRET' pelo valor real do CRON_SECRET
-- Rode UMA vez no SQL Editor do Supabase. Idempotente.
-- =====================================================================

-- Gasto do mês, em micro-dólares (US$ 1 = 1.000.000), por profissional.
create table if not exists public.ai_usage_monthly (
  professional_id uuid not null,
  month text not null,                         -- 'YYYY-MM' no fuso de São Paulo
  cost_usd_micros bigint not null default 0,
  voice_seconds integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (professional_id, month)
);

-- Conversas por voz: uma linha por chamada na OpenAI Realtime.
create table if not exists public.ai_voice_calls (
  call_id text primary key,
  professional_id uuid not null,
  month text not null,
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  ended_at timestamptz,
  charged_usd_micros bigint not null default 0,
  status text not null default 'active' check (status in ('active', 'ended'))
);
create index if not exists ai_voice_calls_active_idx on public.ai_voice_calls (status, deadline_at);
create index if not exists ai_voice_calls_prof_idx on public.ai_voice_calls (professional_id, status);

-- Só o servidor (service_role) lê e escreve. RLS ligado e nenhuma política:
-- o app no navegador não enxerga nem altera o próprio gasto.
alter table public.ai_usage_monthly enable row level security;
alter table public.ai_voice_calls enable row level security;

-- Soma custo (e segundos de voz) ao mês, de forma atômica. Devolve o total do mês.
create or replace function public.lume_add_ai_usage(
  p_professional uuid, p_month text, p_cost_micros bigint, p_voice_seconds integer default 0
) returns bigint
language sql
as $$
  insert into public.ai_usage_monthly (professional_id, month, cost_usd_micros, voice_seconds, updated_at)
  values (p_professional, p_month, greatest(p_cost_micros, 0), greatest(p_voice_seconds, 0), now())
  on conflict (professional_id, month) do update
    set cost_usd_micros = public.ai_usage_monthly.cost_usd_micros + greatest(excluded.cost_usd_micros, 0),
        voice_seconds   = public.ai_usage_monthly.voice_seconds + greatest(excluded.voice_seconds, 0),
        updated_at      = now()
  returning cost_usd_micros;
$$;

-- Cobra o consumo de UMA resposta da voz na chamada e no mês. Devolve o total do mês.
create or replace function public.lume_charge_voice_call(p_call_id text, p_cost_micros bigint)
returns bigint
language plpgsql
as $$
declare
  c public.ai_voice_calls;
begin
  update public.ai_voice_calls
     set charged_usd_micros = charged_usd_micros + greatest(p_cost_micros, 0)
   where call_id = p_call_id
  returning * into c;
  if not found then
    return null;
  end if;
  return public.lume_add_ai_usage(c.professional_id, c.month, greatest(p_cost_micros, 0), 0);
end;
$$;

-- Encerra a chamada UMA vez só (o fim pelo app e a guarda podem chegar
-- juntos). Cobra o mínimo por tempo se o consumo informado ficou abaixo dele
-- — é o que pega um app adulterado que parou de informar o consumo.
create or replace function public.lume_finish_voice_call(p_call_id text, p_floor_micros bigint, p_seconds integer)
returns boolean
language plpgsql
as $$
declare
  c public.ai_voice_calls;
  extra bigint;
begin
  update public.ai_voice_calls
     set status = 'ended', ended_at = now()
   where call_id = p_call_id and status = 'active'
  returning * into c;
  if not found then
    return false;
  end if;
  extra := greatest(coalesce(p_floor_micros, 0) - c.charged_usd_micros, 0);
  update public.ai_voice_calls set charged_usd_micros = charged_usd_micros + extra where call_id = p_call_id;
  perform public.lume_add_ai_usage(c.professional_id, c.month, extra, greatest(coalesce(p_seconds, 0), 0));
  return true;
end;
$$;

-- Guarda da voz: a cada minuto, encerra na OpenAI as chamadas que passaram do prazo.
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'lume-voice-guard') then
    perform cron.unschedule('lume-voice-guard');
  end if;
end $$;

select cron.schedule(
  'lume-voice-guard',
  '* * * * *',
  $$
    select net.http_get(
      url := 'https://SEU_DOMINIO/api/cron/voice-guard',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || 'COLE_AQUI_O_CRON_SECRET'
      )
    )
  $$
);

-- Conferência (opcional):
-- select * from public.ai_usage_monthly order by updated_at desc limit 20;
-- select jobid, jobname, schedule, active from cron.job where jobname = 'lume-voice-guard';

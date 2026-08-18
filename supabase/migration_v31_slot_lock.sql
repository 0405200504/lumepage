-- =====================================================================
-- LUME · Migração v31 — Trava de concorrência no agendamento público
--
-- PROBLEMA QUE ISTO RESOLVE
-- Hoje o agendamento público faz duas operações separadas:
--     1. "o horário das 14h ainda está livre?"   → sim
--     2. INSERT do agendamento
-- Entre 1 e 2 existe uma janela de milissegundos. Se duas clientes tocarem
-- em "Confirmar" ao mesmo tempo, AS DUAS passam pela checagem antes de
-- qualquer INSERT acontecer — e as duas conseguem as 14h. Quem descobre o
-- problema é a profissional, com duas clientes na porta no mesmo horário.
--
-- COMO ESTA MIGRAÇÃO RESOLVE
-- A função abaixo faz a checagem E a inserção dentro da MESMA transação,
-- protegida por um advisory lock com escopo de (profissional, dia). Duas
-- tentativas para a mesma profissional no mesmo dia entram em fila: a
-- segunda só roda depois que a primeira gravou, então ela enxerga o
-- agendamento recém-criado e é recusada com "LUME_SLOT_TAKEN".
-- Profissionais diferentes (ou dias diferentes) nunca se esperam.
--
-- POR QUE NÃO UMA CONSTRAINT DE EXCLUSÃO NO BANCO
-- Porque a profissional PODE, de propósito, encaixar duas clientes no mesmo
-- horário pelo painel (o `allowOverlap` do agendamento manual). Uma
-- constraint proibiria isso e quebraria um recurso que já funciona. O lock
-- protege só o caminho público, que é onde a corrida existe.
--
-- É opcional: enquanto esta função não existir, o app detecta a ausência e
-- volta ao comportamento atual (checagem + insert), sem quebrar nada.
--
-- Rode UMA vez no SQL Editor do Supabase. Idempotente.
-- =====================================================================

create or replace function public.lume_claim_slot(
  p_professional_id  uuid,
  p_service_id       uuid,
  p_service_ids      uuid[],
  p_client_id        uuid,
  p_client_name      text,
  p_client_whatsapp  text,
  p_client_email     text,
  p_date             date,
  p_start_time       time,
  p_end_time         time,
  p_notes            text,
  p_payment_method   text,
  p_buffer_minutes   integer default 0
)
returns public.appointments
language plpgsql
as $$
declare
  v_row      public.appointments;
  v_start    integer := floor(extract(epoch from p_start_time) / 60);
  v_end      integer := floor(extract(epoch from p_end_time) / 60);
  v_conflict boolean;
begin
  -- Fila por (profissional, dia). O lock é da TRANSAÇÃO: sai sozinho no commit
  -- ou no rollback, então não há risco de travar a agenda se algo falhar.
  perform pg_advisory_xact_lock(hashtext(p_professional_id::text || ':' || p_date::text));

  -- Mesma regra de sobreposição do motor de horários (lib/appointments/slots.ts):
  -- o intervalo reservado de um agendamento é [início, término + buffer].
  -- A conta é feita em MINUTOS para não estourar a meia-noite ao somar o buffer
  -- (23:30 + 60min viraria 00:30 se somássemos direto em `time`).
  select exists (
    select 1
    from public.appointments a
    where a.professional_id = p_professional_id
      and a.date = p_date
      and a.status <> 'cancelled'
      and a.deleted_at is null
      and v_start < (floor(extract(epoch from a.end_time) / 60) + p_buffer_minutes)
      and floor(extract(epoch from a.start_time) / 60) < v_end
  ) into v_conflict;

  if v_conflict then
    -- Código próprio: a aplicação reconhece e mostra "esse horário acabou de
    -- ser reservado", nunca um erro técnico para a cliente.
    raise exception 'LUME_SLOT_TAKEN' using errcode = 'P0001';
  end if;

  insert into public.appointments (
    professional_id, service_id, service_ids, client_id,
    client_name, client_whatsapp, client_email,
    date, start_time, end_time, status, notes, payment_method
  ) values (
    p_professional_id, p_service_id,
    case when p_service_ids is null or cardinality(p_service_ids) = 0 then null else p_service_ids end,
    p_client_id,
    p_client_name, p_client_whatsapp, p_client_email,
    p_date, p_start_time, p_end_time, 'pending', p_notes, p_payment_method
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- Só o servidor (service-role) chama esta função. Fechar para anon/authenticated
-- evita que alguém com a chave pública — que é embarcada no front — crie
-- agendamento direto pela API, pulando captcha e rate-limit.
revoke execute on function public.lume_claim_slot(
  uuid, uuid, uuid[], uuid, text, text, text, date, time, time, text, text, integer
) from public, anon, authenticated;

grant execute on function public.lume_claim_slot(
  uuid, uuid, uuid[], uuid, text, text, text, date, time, time, text, text, integer
) to service_role;

-- Conferência depois de rodar:
--   select proname from pg_proc where proname = 'lume_claim_slot';

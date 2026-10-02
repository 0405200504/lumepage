-- =====================================================================
-- LUME · Migração v45 — caixa de entrada do WhatsApp com histórico próprio
--
-- A uazapi guarda as mensagens por só 7 DIAS e as mídias por 2 dias. Para a
-- aba WhatsApp mostrar pelo menos 30 dias de cada conversa (e as fotos
-- continuarem abrindo), o Lume passa a guardar:
--   • cada mensagem que chega pelo webhook (recebida OU enviada, de qualquer
--     tipo) em whatsapp_inbox_messages;
--   • os recibos de entrega/leitura (evento messages_update) no campo status;
--   • uma cópia da mídia no bucket PRIVADO whatsapp-media.
--
-- Sem esta migração a aba continua funcionando, mas limitada ao que a uazapi
-- ainda tem (7 dias) e sem as fotos antigas.
-- Rode UMA vez no SQL Editor do Supabase. Idempotente.
-- =====================================================================

create table if not exists public.whatsapp_inbox_messages (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  chatid          text not null,                 -- JID: 5511999999999@s.whatsapp.net ou grupo@g.us
  messageid       text not null,                 -- id da mensagem no WhatsApp
  uazapi_id       text,                          -- id interno da uazapi (r + hex)
  from_me         boolean not null default false,
  is_group        boolean not null default false,
  kind            text not null default 'text',  -- text|image|video|audio|document|sticker|location|contact|poll|call|other
  raw_type        text,                          -- messageType original da uazapi
  text            text not null default '',
  sender_jid      text,
  sender_name     text,
  "timestamp"     bigint not null,               -- milissegundos
  status          text,                          -- pending|sent|delivered|read|played|failed
  has_media       boolean not null default false,
  mimetype        text,
  media_path      text,                          -- caminho no bucket whatsapp-media (quando copiada)
  media_error     text,                          -- último motivo de a cópia ter falhado
  quoted_id       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (professional_id, messageid)
);

create index if not exists whatsapp_inbox_messages_chat_idx
  on public.whatsapp_inbox_messages (professional_id, chatid, "timestamp" desc);

create index if not exists whatsapp_inbox_messages_age_idx
  on public.whatsapp_inbox_messages ("timestamp");

-- RLS ligada e sem policy: só o service-role (servidor) lê e escreve, como
-- nas demais tabelas do WhatsApp. O isolamento por profissional é feito nas
-- server actions.
alter table public.whatsapp_inbox_messages enable row level security;

-- =====================================================================
-- Storage: cópia das mídias (foto, áudio, vídeo, documento, figurinha).
-- Bucket PRIVADO: o painel recebe uma URL assinada de 1 hora pelo servidor.
-- Arquivos ficam SEMPRE em <professional_id>/<chat>/<messageid>.<ext>.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('whatsapp-media', 'whatsapp-media', false, 26214400) -- 25 MB por arquivo
on conflict (id) do update
  set public = false,
      file_size_limit = 26214400;

-- Conferência depois de rodar:
--   select count(*) from public.whatsapp_inbox_messages;
--   select id, public from storage.buckets where id = 'whatsapp-media';

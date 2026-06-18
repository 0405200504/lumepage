-- Migration v15: visibilidade do serviço para a cliente.
-- Serviços com client_visible = false aparecem apenas no painel da profissional
-- (uso interno e agendamento manual), mas NÃO no agendamento público da cliente
-- nem na lista que o bot de WhatsApp oferece.

-- DEFAULT true = retrocompatível: serviços existentes continuam visíveis para a cliente.
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS client_visible boolean NOT NULL DEFAULT true;

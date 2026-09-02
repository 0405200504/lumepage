-- Migração v40 — o tutorial de boas-vindas passa a ser da CONTA, não do aparelho
--
-- O tour guardava "já vi" só no localStorage do navegador. Resultado: a mesma
-- profissional entrava pelo celular depois de ter feito o tour no computador
-- (ou trocava de aparelho, ou limpava os dados do navegador) e o sistema a
-- tratava como se fosse a primeira vez. Agora a marca fica no banco.
--
-- Rodar no SQL Editor do Supabase. É idempotente.

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS tour_completed_at TIMESTAMPTZ;

-- Toda conta que já existe neste banco já passou do primeiro login — o tour
-- não deve reaparecer para ninguém delas em aparelho nenhum. Quem quiser
-- rever continua tendo o "?" na barra do topo.
--
-- A conta demo fica de fora de propósito: ela é a vitrine, e cada visitante
-- que entra com ela precisa ver o tour como se fosse a primeira vez.
UPDATE professionals
   SET tour_completed_at = COALESCE(tour_completed_at, created_at, now())
 WHERE tour_completed_at IS NULL
   AND id <> 'deadbeef-0000-4000-a000-000000000001';

-- A partir daqui, conta nova nasce com NULL: vê o tour uma vez, no primeiro
-- login, em qualquer aparelho — e nunca mais.

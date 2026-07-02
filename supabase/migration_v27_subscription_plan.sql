-- Adicionar enum e coluna para definir qual é o plano da profissional.
-- Idempotente: pode rodar de novo sem erro (o tipo/coluna só são criados se faltarem).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan_type') THEN
    CREATE TYPE subscription_plan_type AS ENUM ('start', 'pro', 'premium');
  END IF;
END $$;

ALTER TABLE public.professionals
ADD COLUMN IF NOT EXISTS subscription_plan subscription_plan_type;

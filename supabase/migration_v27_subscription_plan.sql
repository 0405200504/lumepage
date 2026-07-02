-- Adicionar enum e coluna para definir qual é o plano da profissional
CREATE TYPE subscription_plan_type AS ENUM ('start', 'pro', 'premium');

ALTER TABLE public.professionals
ADD COLUMN subscription_plan subscription_plan_type;

-- Criação do tipo ENUM para o status da assinatura
CREATE TYPE subscription_status_type AS ENUM ('trialing', 'active', 'past_due', 'canceled');

-- Adicionando colunas na tabela professionals
ALTER TABLE public.professionals
ADD COLUMN subscription_status subscription_status_type DEFAULT 'trialing',
ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + interval '7 days'),
ADD COLUMN hubla_subscription_id TEXT;

-- Atualizar o status dos profissionais antigos para 'active' se preferir não dar trial para quem já existe,
-- mas por padrão eles receberão 7 dias a partir de agora devido ao DEFAULT.
-- Se quiser que eles sejam ativos por padrão, descomente a linha abaixo:
-- UPDATE public.professionals SET subscription_status = 'active';

-- Nota: A partir de agora, qualquer novo cadastro pela página /register
-- já vai cair automaticamente no plano 'trialing' com 7 dias de validade.

-- Vencimento do acesso pago, definido/liberado manualmente pelo admin.
-- Usado para mostrar "quanto falta pra vencer" e bloquear (paywall) quando expira.
-- NÃO afeta contas legadas (o app trata contas criadas antes do marco como acesso cheio).

ALTER TABLE public.professionals
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

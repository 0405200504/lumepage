-- Migration v12: forma de pagamento nos agendamentos
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

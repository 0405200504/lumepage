-- =====================================================================
-- v36 · Acesso das profissionais (aba "Acesso" do /admin)
-- =====================================================================
-- O que este arquivo cria:
--   1. profiles.must_change_password / password_set_at  — troca forçada e "senha
--      definida em" (o GoTrue não expõe essa data por API).
--   2. public.access_tokens   — links de uso único (link mágico e redefinição).
--   3. public.access_events   — histórico de login/tentativa por conta.
--   4. public.admin_auth_access_info() — RPC SECURITY DEFINER que lê o schema
--      `auth` (users / identities / sessions) e devolve SÓ metadado de acesso.
--      NUNCA devolve encrypted_password: a senha não é legível por ninguém.
--
-- Idempotente. Enquanto não for aplicada, a aba Acesso continua abrindo — cada
-- bloco degrada para "indisponível" e avisa qual migration rodar.

-- ─────────────────────────── 1. profiles ───────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.must_change_password IS
  'true = senha temporária definida pelo suporte; o login força a troca antes de liberar o painel.';
COMMENT ON COLUMN public.profiles.password_set_at IS
  'Quando a senha foi definida pela última vez. Só a DATA — o valor nunca é guardado aqui nem em lugar nenhum.';

-- ─────────────────────── 2. Links de uso único ───────────────────────
-- Guardamos apenas o SHA-256 do token. Quem tiver o banco não consegue montar
-- o link de volta; a URL só existe uma vez, na tela de quem gerou.
CREATE TABLE IF NOT EXISTS public.access_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL,
  profile_id      TEXT,
  kind            TEXT NOT NULL CHECK (kind IN ('magic', 'reset')),
  token_hash      TEXT NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  used_at         TIMESTAMPTZ,
  used_ip         TEXT,
  created_by      TEXT,                 -- e-mail do admin que gerou
  created_ip      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_tokens_hash ON public.access_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_access_tokens_prof ON public.access_tokens (professional_id, created_at DESC);

ALTER TABLE public.access_tokens ENABLE ROW LEVEL SECURITY;  -- sem policy: só service-role

COMMENT ON TABLE public.access_tokens IS
  'Links de acesso de uso único (mágico/redefinição). Guarda o hash do token, nunca o token.';

-- ─────────────────────── 3. Histórico de acesso ───────────────────────
CREATE TABLE IF NOT EXISTS public.access_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID,
  email           TEXT,
  -- 'password' | 'google' | 'magic' | 'impersonation' | 'temp_password'
  method          TEXT NOT NULL,
  success         BOOLEAN NOT NULL DEFAULT TRUE,
  ip              TEXT,
  user_agent      TEXT,
  /** Preenchido quando quem entrou foi o suporte da Lume. */
  impersonated_by TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_events_prof    ON public.access_events (professional_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_events_created ON public.access_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_events_email   ON public.access_events (email, created_at DESC);

ALTER TABLE public.access_events ENABLE ROW LEVEL SECURITY;  -- sem policy: só service-role

COMMENT ON TABLE public.access_events IS
  'Histórico de entradas na conta (senha, Google, link mágico, suporte). Nunca guarda credencial.';

-- ─────────────────── 4. Metadado de acesso do GoTrue ───────────────────
-- PostgREST não enxerga o schema `auth`. Esta função SECURITY DEFINER é a única
-- porta — e por construção só devolve colunas não-secretas. `encrypted_password`
-- entra apenas como o booleano has_password.
CREATE OR REPLACE FUNCTION public.admin_auth_access_info(p_uids UUID[])
RETURNS TABLE (
  user_id            UUID,
  email              TEXT,
  created_at         TIMESTAMPTZ,
  last_sign_in_at    TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ,
  banned_until       TIMESTAMPTZ,
  has_password       BOOLEAN,
  providers          TEXT[],
  active_sessions    INTEGER,
  last_session_at    TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT
    u.id,
    u.email::TEXT,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at,
    u.banned_until,
    (u.encrypted_password IS NOT NULL AND u.encrypted_password <> '') AS has_password,
    COALESCE(
      (SELECT array_agg(DISTINCT i.provider ORDER BY i.provider)
         FROM auth.identities i WHERE i.user_id = u.id),
      ARRAY[]::TEXT[]
    ) AS providers,
    COALESCE((SELECT COUNT(*) FROM auth.sessions s WHERE s.user_id = u.id), 0)::INTEGER AS active_sessions,
    (SELECT MAX(s.updated_at) FROM auth.sessions s WHERE s.user_id = u.id) AS last_session_at
  FROM auth.users u
  WHERE u.id = ANY(p_uids);
$$;

REVOKE ALL ON FUNCTION public.admin_auth_access_info(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_auth_access_info(UUID[]) TO service_role;

COMMENT ON FUNCTION public.admin_auth_access_info(UUID[]) IS
  'Metadado de acesso do GoTrue para o /admin. Só service-role. Nunca devolve a senha (hash ou não).';

-- Encerrar todas as sessões de uma conta (o SDK não expõe isso por user_id).
CREATE OR REPLACE FUNCTION public.admin_revoke_sessions(p_uid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  removed INTEGER;
BEGIN
  DELETE FROM auth.sessions WHERE user_id = p_uid;
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_sessions(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_sessions(UUID) TO service_role;

COMMENT ON FUNCTION public.admin_revoke_sessions(UUID) IS
  'Derruba todas as sessões ativas de um usuário do GoTrue. Usada pelo botão "Encerrar todas as sessões".';

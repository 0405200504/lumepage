-- =====================================================================
-- LUME · Criar SUPER ADMIN
-- Sua conta já foi criada e validada via API. Use este SQL apenas se
-- quiser recriar ou adicionar OUTRO super admin (basta trocar os 3 valores).
-- Roda no SQL Editor do Supabase. Idempotente (não duplica se já existir).
-- =====================================================================

DO $$
DECLARE
  v_email    text := 'seu-email@exemplo.com';   -- troque pelo e-mail do admin
  v_password text := 'TROQUE_POR_UMA_SENHA';     -- troque por uma senha forte
  v_name     text := 'Nome do Admin';            -- troque pelo nome
  v_uid      uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = v_email;

  -- 1) Cria o usuário de autenticação (se ainda não existir)
  IF v_uid IS NULL THEN
    v_uid := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      v_email, crypt(v_password, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', v_name)
    );

    -- Identidade de e-mail (necessária para login por senha)
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_uid, v_email,
      jsonb_build_object('sub', v_uid::text, 'email', v_email),
      'email', now(), now(), now()
    );
  ELSE
    -- Já existe: garante senha e confirmação
    UPDATE auth.users
      SET encrypted_password = crypt(v_password, gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now())
      WHERE id = v_uid;
  END IF;

  -- 2) Garante o perfil como super_admin
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = v_email) THEN
    UPDATE public.profiles
      SET role = 'super_admin', name = v_name, auth_user_id = v_uid, professional_id = NULL
      WHERE email = v_email;
  ELSE
    INSERT INTO public.profiles (auth_user_id, name, email, role, professional_id)
    VALUES (v_uid, v_name, v_email, 'super_admin', NULL);
  END IF;
END $$;

-- Observação: se a função crypt()/gen_salt() não for encontrada, rode antes:
--   CREATE EXTENSION IF NOT EXISTS pgcrypto;

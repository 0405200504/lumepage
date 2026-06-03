-- Habilitar a extensão uuid-ossp para geração de IDs UUIDv4 se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Limpar tabelas e tipos se já existirem, garantindo uma execução limpa
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS time_blocks CASCADE;
DROP TABLE IF EXISTS availability_rules CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS professionals CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS professional_status CASCADE;
DROP TYPE IF EXISTS appointment_status CASCADE;
DROP TYPE IF EXISTS confirmation_mode CASCADE;

-- Criar tipos ENUM para status e roles
CREATE TYPE user_role AS ENUM ('super_admin', 'professional');
CREATE TYPE professional_status AS ENUM ('active', 'paused', 'cancelled');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE confirmation_mode AS ENUM ('manual', 'automatic');

-- 1. Tabela: professionals
CREATE TABLE professionals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID, -- Associado opcionalmente ao auth.users do Supabase
    name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(50) NOT NULL,
    instagram VARCHAR(100),
    logo_url TEXT,
    profile_image_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#13372f',
    secondary_color VARCHAR(7) DEFAULT '#cbe978',
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    description TEXT,
    public_bio TEXT,
    status professional_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela: profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE, -- Relacionado ao auth.users do Supabase se integrado
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'professional',
    professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela: services
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    price_cents INTEGER NOT NULL DEFAULT 0, -- Armazenado em centavos (ex: R$150,00 = 15000)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela: availability_rules (Configuração semanal de agenda)
CREATE TABLE availability_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
    weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6), -- 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    start_time TIME NOT NULL, -- Ex: "09:00:00"
    end_time TIME NOT NULL, -- Ex: "18:00:00"
    break_start TIME, -- Ex: "12:00:00" (Almoço)
    break_end TIME, -- Ex: "13:00:00"
    slot_interval_minutes INTEGER DEFAULT 30,
    buffer_minutes INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (professional_id, weekday)
);

-- 5. Tabela: time_blocks (Folgas ou bloqueios pontuais)
CREATE TABLE time_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME, -- NULL se for o dia inteiro
    end_time TIME,   -- NULL se for o dia inteiro
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabela: settings (Configurações comerciais adicionais de cada profissional)
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE UNIQUE,
    confirmation_mode confirmation_mode DEFAULT 'manual',
    min_notice_hours INTEGER DEFAULT 3,
    max_days_ahead INTEGER DEFAULT 30,
    default_slot_interval_minutes INTEGER DEFAULT 30,
    default_buffer_minutes INTEGER DEFAULT 15,
    show_price_public BOOLEAN DEFAULT TRUE,
    whatsapp_confirmation_message TEXT,
    whatsapp_cancel_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabela: clients (Banco de clientes integrados de cada profissional)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    total_appointments INTEGER DEFAULT 0,
    last_appointment_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (professional_id, whatsapp)
);

-- 8. Tabela: appointments (Agendamentos da plataforma)
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    client_whatsapp VARCHAR(50) NOT NULL,
    client_email VARCHAR(255),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status appointment_status DEFAULT 'pending',
    notes TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Função de atualização automática do updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers de updated_at para as tabelas principais
CREATE TRIGGER update_professionals_modtime BEFORE UPDATE ON professionals FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_services_modtime BEFORE UPDATE ON services FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_availability_rules_modtime BEFORE UPDATE ON availability_rules FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_settings_modtime BEFORE UPDATE ON settings FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_appointments_modtime BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ========================================================
-- SINCRONIZAÇÃO AUTOMÁTICA DE USUÁRIOS DO SUPABASE AUTH
-- ========================================================

-- Função que gerencia o vínculo ou criação de perfis após registro no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_professional_id UUID;
BEGIN
    -- Tenta obter o professional_id a partir do metadata do usuário
    IF NEW.raw_user_meta_data ? 'professional_id' THEN
        v_professional_id := (NEW.raw_user_meta_data->>'professional_id')::UUID;
    END IF;

    -- Se já existir um perfil com esse email (por exemplo, semeado via seed.sql), vincula o auth_user_id e professional_id
    IF EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email) THEN
        UPDATE public.profiles
        SET 
            auth_user_id = NEW.id,
            professional_id = COALESCE(profiles.professional_id, v_professional_id)
        WHERE email = NEW.email;
    ELSE
        -- Caso contrário, cria um novo perfil de professional
        INSERT INTO public.profiles (auth_user_id, name, email, role, professional_id)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
            NEW.email,
            'professional',
            v_professional_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger disparado ao inserir um usuário na tabela auth.users do Supabase
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

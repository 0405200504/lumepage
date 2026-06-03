-- Habilitar RLS em todas as tabelas
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para obter a role do usuário atual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Função auxiliar para obter o professional_id do usuário atual
CREATE OR REPLACE FUNCTION get_user_professional_id()
RETURNS UUID AS $$
  SELECT professional_id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ========================================================
-- POLÍTICAS PARA PROFILES
-- ========================================================
-- Leitura de perfis para usuários autenticados (evita recursão)
CREATE POLICY "Authenticated users can read profiles" 
ON profiles FOR SELECT 
USING (auth.role() = 'authenticated');

-- Usuários podem atualizar seus próprios perfis
CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Super admin pode gerenciar qualquer perfil (evita recursão)
CREATE POLICY "Super admins can manage profiles" 
ON profiles FOR ALL 
USING (auth.jwt() ->> 'email' = 'admin@lume.com')
WITH CHECK (auth.jwt() ->> 'email' = 'admin@lume.com');

-- ========================================================
-- POLÍTICAS PARA PROFESSIONALS
-- ========================================================
-- Super Admin pode fazer tudo
CREATE POLICY "Super admins can do everything on professionals" 
ON professionals FOR ALL 
USING (get_user_role() = 'super_admin');

-- Leitura pública para profissionais ativos
CREATE POLICY "Public read for active professionals" 
ON professionals FOR SELECT 
USING (status = 'active');

-- Profissionais podem ver e atualizar seus próprios dados
CREATE POLICY "Professionals can read/update their own data" 
ON professionals FOR ALL 
USING (id = get_user_professional_id())
WITH CHECK (id = get_user_professional_id());

-- ========================================================
-- POLÍTICAS PARA SERVICES
-- ========================================================
-- Super Admin pode fazer tudo
CREATE POLICY "Super admins can do everything on services" 
ON services FOR ALL 
USING (get_user_role() = 'super_admin');

-- Leitura pública para serviços ativos
CREATE POLICY "Public read for active services" 
ON services FOR SELECT 
USING (
    is_active = TRUE AND 
    EXISTS (SELECT 1 FROM professionals WHERE id = services.professional_id AND status = 'active')
);

-- Profissionais podem gerenciar seus próprios serviços
CREATE POLICY "Professionals can manage their own services" 
ON services FOR ALL 
USING (professional_id = get_user_professional_id())
WITH CHECK (professional_id = get_user_professional_id());

-- ========================================================
-- POLÍTICAS PARA AVAILABILITY_RULES
-- ========================================================
-- Super Admin pode fazer tudo
CREATE POLICY "Super admins can do everything on availability rules" 
ON availability_rules FOR ALL 
USING (get_user_role() = 'super_admin');

-- Leitura pública das regras de disponibilidade
CREATE POLICY "Public read for availability rules" 
ON availability_rules FOR SELECT 
USING (
    is_active = TRUE AND 
    EXISTS (SELECT 1 FROM professionals WHERE id = availability_rules.professional_id AND status = 'active')
);

-- Profissionais podem gerenciar sua disponibilidade
CREATE POLICY "Professionals can manage their availability" 
ON availability_rules FOR ALL 
USING (professional_id = get_user_professional_id())
WITH CHECK (professional_id = get_user_professional_id());

-- ========================================================
-- POLÍTICAS PARA TIME_BLOCKS
-- ========================================================
-- Super Admin pode fazer tudo
CREATE POLICY "Super admins can do everything on time blocks" 
ON time_blocks FOR ALL 
USING (get_user_role() = 'super_admin');

-- Leitura pública para bloqueios ativos
CREATE POLICY "Public read for time blocks" 
ON time_blocks FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM professionals WHERE id = time_blocks.professional_id AND status = 'active')
);

-- Profissionais podem gerenciar seus bloqueios
CREATE POLICY "Professionals can manage their time blocks" 
ON time_blocks FOR ALL 
USING (professional_id = get_user_professional_id())
WITH CHECK (professional_id = get_user_professional_id());

-- ========================================================
-- POLÍTICAS PARA SETTINGS
-- ========================================================
-- Super Admin pode fazer tudo
CREATE POLICY "Super admins can do everything on settings" 
ON settings FOR ALL 
USING (get_user_role() = 'super_admin');

-- Leitura pública básica de configurações
CREATE POLICY "Public read for settings" 
ON settings FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM professionals WHERE id = settings.professional_id AND status = 'active')
);

-- Profissionais podem atualizar suas configurações
CREATE POLICY "Professionals can manage their settings" 
ON settings FOR ALL 
USING (professional_id = get_user_professional_id())
WITH CHECK (professional_id = get_user_professional_id());

-- ========================================================
-- POLÍTICAS PARA CLIENTS
-- ========================================================
-- Super Admin pode fazer tudo
CREATE POLICY "Super admins can do everything on clients" 
ON clients FOR ALL 
USING (get_user_role() = 'super_admin');

-- Clientes finais podem se cadastrar anonimamente
CREATE POLICY "Public insert for clients" 
ON clients FOR INSERT 
WITH CHECK (TRUE);

-- Profissionais podem gerenciar suas clientes
CREATE POLICY "Professionals can manage their clients" 
ON clients FOR ALL 
USING (professional_id = get_user_professional_id())
WITH CHECK (professional_id = get_user_professional_id());

-- ========================================================
-- POLÍTICAS PARA APPOINTMENTS
-- ========================================================
-- Super Admin pode fazer tudo
CREATE POLICY "Super admins can do everything on appointments" 
ON appointments FOR ALL 
USING (get_user_role() = 'super_admin');

-- Clientes finais podem agendar
CREATE POLICY "Public insert for appointments" 
ON appointments FOR INSERT 
WITH CHECK (TRUE);

-- Clientes finais podem ler horários marcados para evitar conflitos (leitura limitada)
CREATE POLICY "Public read for slot validation" 
ON appointments FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM professionals WHERE id = appointments.professional_id AND status = 'active')
);

-- Profissionais podem gerenciar seus agendamentos
CREATE POLICY "Professionals can manage their appointments" 
ON appointments FOR ALL 
USING (professional_id = get_user_professional_id())
WITH CHECK (professional_id = get_user_professional_id());

-- IDs fixos para facilitar testes e relacionamentos
DO $$
DECLARE
    v_admin_profile_id UUID := 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
    v_professional_id UUID := 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';
    v_prof_profile_id UUID := 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3';
    
    v_service_1_id UUID := 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4';
    v_service_2_id UUID := 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5';
    v_service_3_id UUID := 'f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6';
    
    v_client_1_id UUID := '77777777-7777-7777-7777-777777777777';
    v_client_2_id UUID := '88888888-8888-8888-8888-888888888888';
    
    v_today DATE := CURRENT_DATE;
BEGIN
    -- 1. Inserir profissional exemplo: Amanda Costa
    INSERT INTO professionals (
        id, name, brand_name, slug, email, whatsapp, instagram, 
        logo_url, profile_image_url, primary_color, secondary_color, 
        address, city, state, description, public_bio, status
    ) VALUES (
        v_professional_id,
        'Amanda Costa',
        'Amanda Costa Estética',
        'amanda-costa',
        'amanda@estetica.com',
        '11999999999',
        '@amandacosta.estetica',
        NULL,
        NULL,
        '#500b18', -- Bordô Lume
        '#e3bc8f', -- Champanhe Lume
        'Av. Paulista, 1000 - Bela Vista',
        'São Paulo',
        'SP',
        'Especialista em limpeza de pele, estética facial e cuidado personalizado.',
        'Ofereço tratamentos faciais e corporais personalizados para realçar sua beleza natural e proporcionar momentos de relaxamento e autocuidado.',
        'active'
    ) ON CONFLICT (id) DO NOTHING;

    -- 2. Inserir profiles (Super Admin e Professional)
    -- Perfil de Super Admin Lume
    INSERT INTO profiles (id, auth_user_id, name, email, role, professional_id)
    VALUES (v_admin_profile_id, NULL, 'Admin Lume', 'admin@lume.com', 'super_admin', NULL)
    ON CONFLICT (id) DO NOTHING;

    -- Perfil de Profissional (Amanda Costa)
    INSERT INTO profiles (id, auth_user_id, name, email, role, professional_id)
    VALUES (v_prof_profile_id, NULL, 'Amanda Costa', 'amanda@estetica.com', 'professional', v_professional_id)
    ON CONFLICT (id) DO NOTHING;

    -- 3. Inserir serviços para Amanda Costa
    -- Serviço 1: Limpeza de Pele Profunda
    INSERT INTO services (id, professional_id, name, description, duration_minutes, price_cents, is_active)
    VALUES (
        v_service_1_id,
        v_professional_id,
        'Limpeza de Pele Profunda',
        'Tratamento completo para remoção de cravos, impurezas e células mortas, com nutrição e hidratação profunda da pele.',
        90,
        15000, -- R$ 150,00
        TRUE
    ) ON CONFLICT (id) DO NOTHING;

    -- Serviço 2: Design de Sobrancelhas
    INSERT INTO services (id, professional_id, name, description, duration_minutes, price_cents, is_active)
    VALUES (
        v_service_2_id,
        v_professional_id,
        'Design de Sobrancelhas',
        'Modelagem de sobrancelhas personalizada de acordo com a harmonia e formato do seu rosto.',
        45,
        8000, -- R$ 80,00
        TRUE
    ) ON CONFLICT (id) DO NOTHING;

    -- Serviço 3: Massagem Modeladora
    INSERT INTO services (id, professional_id, name, description, duration_minutes, price_cents, is_active)
    VALUES (
        v_service_3_id,
        v_professional_id,
        'Massagem Modeladora',
        'Técnica manual com movimentos rápidos e firmes que auxiliam na redução de medidas e melhora do contorno corporal.',
        60,
        12000, -- R$ 120,00
        TRUE
    ) ON CONFLICT (id) DO NOTHING;

    -- 4. Inserir regras de disponibilidade (Segunda a Sexta das 09:00 às 18:00 com almoço, Sábado das 08:00 às 13:00)
    -- Segunda-feira (1)
    INSERT INTO availability_rules (professional_id, weekday, start_time, end_time, break_start, break_end, slot_interval_minutes, buffer_minutes, is_active)
    VALUES (v_professional_id, 1, '09:00', '18:00', '12:00', '13:00', 30, 15, TRUE)
    ON CONFLICT (professional_id, weekday) DO NOTHING;

    -- Terça-feira (2)
    INSERT INTO availability_rules (professional_id, weekday, start_time, end_time, break_start, break_end, slot_interval_minutes, buffer_minutes, is_active)
    VALUES (v_professional_id, 2, '09:00', '18:00', '12:00', '13:00', 30, 15, TRUE)
    ON CONFLICT (professional_id, weekday) DO NOTHING;

    -- Quarta-feira (3)
    INSERT INTO availability_rules (professional_id, weekday, start_time, end_time, break_start, break_end, slot_interval_minutes, buffer_minutes, is_active)
    VALUES (v_professional_id, 3, '09:00', '18:00', '12:00', '13:00', 30, 15, TRUE)
    ON CONFLICT (professional_id, weekday) DO NOTHING;

    -- Quinta-feira (4)
    INSERT INTO availability_rules (professional_id, weekday, start_time, end_time, break_start, break_end, slot_interval_minutes, buffer_minutes, is_active)
    VALUES (v_professional_id, 4, '09:00', '18:00', '12:00', '13:00', 30, 15, TRUE)
    ON CONFLICT (professional_id, weekday) DO NOTHING;

    -- Sexta-feira (5)
    INSERT INTO availability_rules (professional_id, weekday, start_time, end_time, break_start, break_end, slot_interval_minutes, buffer_minutes, is_active)
    VALUES (v_professional_id, 5, '09:00', '18:00', '12:00', '13:00', 30, 15, TRUE)
    ON CONFLICT (professional_id, weekday) DO NOTHING;

    -- Sábado (6)
    INSERT INTO availability_rules (professional_id, weekday, start_time, end_time, break_start, break_end, slot_interval_minutes, buffer_minutes, is_active)
    VALUES (v_professional_id, 6, '08:00', '13:00', NULL, NULL, 30, 15, TRUE)
    ON CONFLICT (professional_id, weekday) DO NOTHING;

    -- Domingo (0) - Inativo
    INSERT INTO availability_rules (professional_id, weekday, start_time, end_time, break_start, break_end, slot_interval_minutes, buffer_minutes, is_active)
    VALUES (v_professional_id, 0, '09:00', '13:00', NULL, NULL, 30, 15, FALSE)
    ON CONFLICT (professional_id, weekday) DO NOTHING;

    -- 5. Inserir configurações padrão
    INSERT INTO settings (
        professional_id, confirmation_mode, min_notice_hours, max_days_ahead, 
        default_slot_interval_minutes, default_buffer_minutes, show_price_public
    ) VALUES (
        v_professional_id,
        'manual',
        3,
        30,
        30,
        15,
        TRUE
    ) ON CONFLICT (professional_id) DO NOTHING;

    -- 6. Inserir clientes fictícias
    INSERT INTO clients (id, professional_id, name, whatsapp, email, total_appointments, last_appointment_at)
    VALUES (v_client_1_id, v_professional_id, 'Juliana Silva', '11988888888', 'juliana@gmail.com', 2, NOW() - INTERVAL '2 days')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO clients (id, professional_id, name, whatsapp, email, total_appointments, last_appointment_at)
    VALUES (v_client_2_id, v_professional_id, 'Beatriz Santos', '11977777777', 'beatriz@hotmail.com', 1, NOW() + INTERVAL '1 day')
    ON CONFLICT (id) DO NOTHING;

    -- 7. Inserir agendamentos fictícios
    -- Agendamento 1: Hoje (Pendente)
    INSERT INTO appointments (professional_id, service_id, client_id, client_name, client_whatsapp, client_email, date, start_time, end_time, status, notes)
    VALUES (
        v_professional_id,
        v_service_2_id, -- Design Sobrancelhas (45 min)
        v_client_1_id,
        'Juliana Silva',
        '11988888888',
        'juliana@gmail.com',
        v_today,
        '10:00:00',
        '10:45:00',
        'pending',
        'Gostaria de ver opções com henna se possível.'
    );

    -- Agendamento 2: Hoje (Confirmado)
    INSERT INTO appointments (professional_id, service_id, client_id, client_name, client_whatsapp, client_email, date, start_time, end_time, status, notes)
    VALUES (
        v_professional_id,
        v_service_1_id, -- Limpeza de Pele (90 min)
        v_client_2_id,
        'Beatriz Santos',
        '11977777777',
        'beatriz@hotmail.com',
        v_today,
        '14:00:00',
        '15:30:00',
        'confirmed',
        'Primeira vez fazendo limpeza profunda.'
    );

    -- Agendamento 3: Amanhã (Confirmado)
    INSERT INTO appointments (professional_id, service_id, client_id, client_name, client_whatsapp, client_email, date, start_time, end_time, status)
    VALUES (
        v_professional_id,
        v_service_3_id, -- Massagem Modeladora (60 min)
        v_client_1_id,
        'Juliana Silva',
        '11988888888',
        'juliana@gmail.com',
        v_today + INTERVAL '1 day',
        '11:00:00',
        '12:00:00',
        'confirmed'
    );
END $$;

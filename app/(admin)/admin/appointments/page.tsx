import React from 'react';
import { requireAdmin } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { AdminAppointments } from '@/components/admin/AdminAppointments';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';

export const metadata = { title: 'Agendamentos | Lume Admin' };

export default async function AdminAppointmentsPage() {
  const session = await requireAdmin();
  const allProfessionals = await dbService.getProfessionals();
  const allAppointments = await dbService.getAllAppointments();

  // Exclui a conta teste (Amanda) dos dados do super admin
  const professionals = allProfessionals.filter(p => p.id !== DEMO_PROFESSIONAL_ID);
  const appointments = allAppointments.filter(a => a.professional_id !== DEMO_PROFESSIONAL_ID);

  const profName: Record<string, string> = {};
  professionals.forEach(p => { profName[p.id] = p.brand_name || p.name; });

  const items = appointments.map(a => ({
    id: a.id,
    date: a.date,
    start_time: a.start_time,
    end_time: a.end_time,
    client_name: a.client_name,
    client_whatsapp: a.client_whatsapp,
    service_name: a.service?.name || '',
    status: a.status,
    professional_id: a.professional_id,
    professional_name: profName[a.professional_id] || '—',
  }));

  return (
    <LayoutAdmin session={session} title="Agendamentos da Rede" subtitle="Todos os agendamentos de todas as profissionais, em um só lugar.">
      <AdminAppointments
        items={items}
        professionals={professionals.map(p => ({ id: p.id, name: p.brand_name || p.name }))}
      />
    </LayoutAdmin>
  );
}

import React from 'react';
import { requireAdmin } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { AdminClients } from '@/components/admin/AdminClients';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';

export const metadata = { title: 'Clientes | Lume Admin' };

const digits = (s: string) => (s || '').replace(/\D/g, '');

export default async function AdminClientsPage() {
  const session = await requireAdmin();
  const allProfessionals = await dbService.getProfessionals();
  const allClients = await dbService.getAllClients();
  const allAppointments = await dbService.getAllAppointments();

  // Exclui a conta teste (Amanda) dos dados do super admin
  const professionals = allProfessionals.filter(p => p.id !== DEMO_PROFESSIONAL_ID);
  const clients = allClients.filter(c => c.professional_id !== DEMO_PROFESSIONAL_ID);
  const appointments = allAppointments.filter(a => a.professional_id !== DEMO_PROFESSIONAL_ID);

  const profName: Record<string, string> = {};
  professionals.forEach(p => { profName[p.id] = p.brand_name || p.name; });

  // stats por (profissional + whatsapp)
  const stats: Record<string, { visits: number; noShows: number; last: string | null }> = {};
  for (const a of appointments) {
    const k = `${a.professional_id}|${digits(a.client_whatsapp)}`;
    const s = (stats[k] ||= { visits: 0, noShows: 0, last: null });
    if (a.status !== 'cancelled') s.visits++;
    if (a.status === 'no_show') s.noShows++;
    if (['completed', 'confirmed'].includes(a.status) && (!s.last || a.date > s.last)) s.last = a.date;
  }

  const items = clients.map(c => {
    const s = stats[`${c.professional_id}|${digits(c.whatsapp)}`] || { visits: c.total_appointments || 0, noShows: 0, last: c.last_appointment_at };
    return {
      id: c.id, name: c.name, whatsapp: c.whatsapp, email: c.email,
      professional_id: c.professional_id, professional_name: profName[c.professional_id] || '—',
      visits: s.visits, noShows: s.noShows, last: s.last,
    };
  });

  return (
    <LayoutAdmin session={session} title="Clientes da Rede" subtitle="Toda a base de clientes da plataforma, por profissional.">
      <AdminClients items={items} professionals={professionals.map(p => ({ id: p.id, name: p.brand_name || p.name }))} />
    </LayoutAdmin>
  );
}

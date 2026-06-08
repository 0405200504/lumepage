import React from 'react';
import { requireSalonManager } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { professionalMetrics } from '@/lib/admin';
import { SalonPanel } from '@/components/salon/SalonPanel';

export const metadata = { title: 'Painel do Grupo | Lume' };

export default async function SalonHomePage() {
  const session = await requireSalonManager();
  const salonId = session.salon_id || '';

  const salon = salonId ? await dbService.getSalonById(salonId) : null;
  const allPros = await dbService.getProfessionals();
  const pros = allPros.filter(p => (p.salon_id ?? null) === (salonId || null));
  const appointments = await dbService.getAllAppointments();
  const clients = await dbService.getAllClients();
  const metrics = professionalMetrics(pros, appointments, clients);

  return (
    <SalonPanel
      managerName={session.name}
      salonName={salon?.name || 'Seu Grupo'}
      metrics={metrics}
    />
  );
}

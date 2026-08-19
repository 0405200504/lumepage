import React from 'react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { SalonManager, SalonView } from '@/components/admin/SalonManager';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';
import { daysAgoISO } from '@/lib/admin/queries';

export const metadata = { title: 'Grupos | Lume Admin' };

const REVENUE = ['completed', 'confirmed'];

export default async function AdminSalonsPage() {
  const session = await requireAdmin();
  const db = () => getSupabaseAdmin() || supabase;

  let salons: SalonView[] = [];
  let unassigned: { id: string; name: string }[] = [];

  if (isSupabaseConfigured) {
    const [salonsRes, profsRes, apptsRes, managersRes] = await Promise.all([
      db().from('salons').select('id, name').order('name'),
      db().from('professionals').select('id, name, brand_name, salon_id').is('deleted_at', null).neq('id', DEMO_PROFESSIONAL_ID),
      db().from('appointments').select('professional_id, status, service:services(price_cents)')
        .is('deleted_at', null).gte('date', daysAgoISO(30)).limit(20000),
      db().from('profiles').select('id, name, email, salon_id').eq('is_salon_manager', true),
    ]);

    type P = { id: string; name: string; brand_name: string; salon_id: string | null };
    const profs = (profsRes.data || []) as P[];
    const metrics = new Map<string, { gmvCents: number; appointments: number }>();
    for (const a of (apptsRes.data || []) as unknown as { professional_id: string; status: string; service: { price_cents?: number } | null }[]) {
      if (a.status === 'cancelled') continue;
      const e = metrics.get(a.professional_id) || { gmvCents: 0, appointments: 0 };
      e.appointments++;
      if (REVENUE.includes(a.status)) e.gmvCents += a.service?.price_cents || 0;
      metrics.set(a.professional_id, e);
    }

    const managers = (managersRes.data || []) as { id: string; name: string; email: string; salon_id: string | null }[];

    salons = ((salonsRes.data || []) as { id: string; name: string }[]).map(s => ({
      id: s.id,
      name: s.name,
      members: profs.filter(p => p.salon_id === s.id).map(p => ({
        id: p.id,
        name: p.brand_name || p.name,
        ...(metrics.get(p.id) || { gmvCents: 0, appointments: 0 }),
      })),
      managers: managers.filter(m => m.salon_id === s.id).map(m => ({ id: m.id, name: m.name, email: m.email })),
    }));

    unassigned = profs.filter(p => !p.salon_id).map(p => ({ id: p.id, name: p.brand_name || p.name }));
  }

  return (
    <LayoutAdmin
      session={session}
      title="Grupos"
      subtitle="Salões com mais de uma profissional: vincule as contas e crie o login de gerente com visão consolidada."
    >
      <SalonManager salons={salons} unassigned={unassigned} />
    </LayoutAdmin>
  );
}

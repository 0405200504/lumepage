import React from 'react';
import { requireAdmin } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { AdminSalons } from '@/components/admin/AdminSalons';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';

export const metadata = { title: 'Grupos | Lume Admin' };

export default async function AdminSalonsPage() {
  const session = await requireAdmin();
  const salons = await dbService.getSalons();
  const allProfessionals = await dbService.getProfessionals();

  // Exclui a conta teste (Amanda) dos dados do super admin
  const professionals = allProfessionals.filter(p => p.id !== DEMO_PROFESSIONAL_ID);

  return (
    <LayoutAdmin session={session} title="Grupos" subtitle="Crie grupos, vincule profissionais e gere o acesso do gerente (1 login para todos os painéis).">
      <AdminSalons
        salons={salons}
        professionals={professionals.map(p => ({ id: p.id, name: p.name, brand: p.brand_name, salon_id: p.salon_id ?? null }))}
      />
    </LayoutAdmin>
  );
}

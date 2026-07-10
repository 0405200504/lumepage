import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { AnamnesisPanel } from '@/components/dashboard/AnamnesisPanel';

export const metadata = {
  title: 'Fichas de Anamnese | Lume',
  description: 'Crie fichas de anamnese, envie por link para as clientes responderem e receba tudo em PDF.'
};

export default async function DashboardAnamnesisPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  const [forms, responses, clients, whatsappSettings] = await Promise.all([
    dbService.getAnamnesisForms(professionalId),
    dbService.getAnamnesisResponses(professionalId),
    dbService.getClientsByProfessional(professionalId),
    dbService.getWhatsAppSettings(professionalId),
  ]);

  return (
    <AnamnesisPanel
      professionalId={professionalId}
      initialForms={forms}
      initialResponses={responses}
      clients={clients}
      whatsappConnected={!!(whatsappSettings?.uazapi_url && whatsappSettings?.uazapi_token)}
    />
  );
}

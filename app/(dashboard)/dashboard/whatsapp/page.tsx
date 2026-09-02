import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { WhatsAppPanel } from '@/components/dashboard/WhatsAppPanel';
import { professionalCan } from '@/lib/subscription/guard';
import { uazapiAdminConfigured } from '@/lib/uazapi';
import { UpgradeRequired } from '@/components/subscription/UpgradeRequired';

export const metadata = {
  title: 'Mensagens automáticas | Lume',
  description: 'Conecte seu número e escolha as mensagens que o Lume envia sozinho.',
};

export default async function WhatsAppPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  if (!(await professionalCan(professionalId, 'whatsappBot'))) return <UpgradeRequired capability="whatsappBot" professionalId={professionalId} />;

  let waSettings = null;
  try {
    waSettings = await dbService.getWhatsAppSettings(professionalId);
  } catch {
    // tabela ainda não existe — continua com null
  }

  return <WhatsAppPanel initialSettings={waSettings} canAutoProvision={uazapiAdminConfigured()} />;
}

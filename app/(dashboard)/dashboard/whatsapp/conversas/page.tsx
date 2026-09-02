import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { WhatsAppInbox } from '@/components/dashboard/WhatsAppInbox';
import { professionalCan } from '@/lib/subscription/guard';
import { UpgradeRequired } from '@/components/subscription/UpgradeRequired';
import { checkUazapiStatus } from '@/lib/uazapi';

export const metadata = {
  title: 'WhatsApp | Lume',
  description: 'Leia e responda o WhatsApp da sua cliente sem sair do Lume.',
};

export default async function ConversasPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  if (!(await professionalCan(professionalId, 'whatsappBot'))) {
    return <UpgradeRequired capability="whatsappBot" professionalId={professionalId} />;
  }

  const settings = await dbService.getWhatsAppSettings(professionalId).catch(() => null);
  // A caixa só faz sentido com a instância no ar; o estado real vem da uazapi.
  const connected = !!(settings?.uazapi_url && settings?.uazapi_token)
    && (await checkUazapiStatus(settings.uazapi_url, settings.uazapi_token).catch(() => ({ status: 'error' as const }))).status === 'open';

  return <WhatsAppInbox connected={connected} />;
}

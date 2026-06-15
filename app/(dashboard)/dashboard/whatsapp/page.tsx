import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { WhatsAppBotPanel } from '@/components/dashboard/WhatsAppBotPanel';

export const metadata = {
  title: 'Bot WhatsApp | Lume',
};

export default async function WhatsAppBotPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  const waSettings = await dbService.getWhatsAppSettings(professionalId);

  return <WhatsAppBotPanel initialSettings={waSettings} />;
}

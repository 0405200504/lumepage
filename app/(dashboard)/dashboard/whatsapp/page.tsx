import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { WhatsAppBotPanel } from '@/components/dashboard/WhatsAppBotPanel';
import { getCurrentPlan } from '@/lib/subscription/guard';
import { can } from '@/lib/subscription/entitlements';
import { UpgradeRequired } from '@/components/subscription/UpgradeRequired';

export const metadata = {
  title: 'Bot WhatsApp | Lume',
};

export default async function WhatsAppBotPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  if (!can(await getCurrentPlan(professionalId), 'whatsappBot')) return <UpgradeRequired capability="whatsappBot" />;

  let waSettings = null;
  try {
    waSettings = await dbService.getWhatsAppSettings(professionalId);
  } catch {
    // tabela ainda não existe — continua com null
  }

  return <WhatsAppBotPanel initialSettings={waSettings} />;
}

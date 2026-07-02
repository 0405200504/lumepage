import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { PendingConversationsWidget } from '@/components/dashboard/PendingConversationsWidget';
import { professionalCan } from '@/lib/subscription/guard';
import { UpgradeRequired } from '@/components/subscription/UpgradeRequired';

export const metadata = {
  title: 'Conversas Pendentes | Lume',
  description: 'Atendimentos em que o bot foi pausado e a cliente aguarda seu contato direto.'
};

export default async function PendingConversationsPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  if (!(await professionalCan(professionalId, 'conversations'))) return <UpgradeRequired capability="conversations" />;

  const pendingConvs = await dbService.getPausedConversations(professionalId).catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Conversas Pendentes</h1>
        <p className="text-sm text-gray-400">Atendimentos que aguardam seu contato direto.</p>
      </div>
      <PendingConversationsWidget initialConversations={pendingConvs} showEmptyState />
    </div>
  );
}

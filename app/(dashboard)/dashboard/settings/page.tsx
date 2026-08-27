import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { SettingsForm } from '@/components/dashboard/SettingsForm';

export const metadata = {
  title: 'Configurações | Lume',
};

interface PageProps {
  // ?google=success|error|cancelado|conta_diferente|nao_configurado — vem do
  // retorno do OAuth (/api/google/callback).
  searchParams: Promise<{ google?: string }>;
}

export default async function DashboardSettingsPage({ searchParams }: PageProps) {
  const session = await requireProfessional();
  const { google: googleStatus } = await searchParams;
  const professionalId = session.professional_id!;

  const [professional, settings, googleConnection] = await Promise.all([
    dbService.getProfessionalById(professionalId),
    dbService.getSettingsByProfessional(professionalId),
    dbService.getGoogleCalendarConnection(professionalId),
  ]);

  if (!professional) {
    return (
      <div className="bg-white border border-[var(--color-line)] rounded-3xl p-8 text-center max-w-md mx-auto my-12">
        <p className="text-caption text-n-500">Erro ao carregar dados do profissional.</p>
      </div>
    );
  }

  return (
    <SettingsForm
      professional={professional}
      settings={settings}
      googleConnection={googleConnection}
      googleStatus={googleStatus ?? null}
    />
  );
}

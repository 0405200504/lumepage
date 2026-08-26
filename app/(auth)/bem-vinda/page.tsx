import React from 'react';
import { redirect } from 'next/navigation';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { professionalPrecisaOnboarding } from '@/lib/auth/onboarding';
import { isGoogleCalendarConfigured } from '@/lib/google/calendar';
import { WelcomeForm } from '@/components/onboarding/WelcomeForm';

export const dynamic = 'force-dynamic';

/**
 * Boas-vindas de quem criou a conta com o Google.
 *
 * Fica FORA do painel de propósito: enquanto faltam negócio e WhatsApp, a conta
 * não tem como funcionar, e o dashboard manda a pessoa para cá.
 */
export default async function BemVindaPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  const prof = await dbService.getProfessionalById(professionalId);
  if (!prof) redirect('/login');

  // Já completou (ou entrou aqui pela URL) → painel.
  if (!professionalPrecisaOnboarding(prof)) redirect('/dashboard');

  const googleConnection = await dbService.getGoogleCalendarConnection(professionalId);
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '') || 'lumepage.com.br';

  return (
    <div
      className="min-h-screen min-h-dvh flex flex-col justify-center items-center px-4 py-16 select-none relative overflow-hidden"
      style={{
        background:
          'radial-gradient(120% 90% at 85% -10%, rgba(140,36,56,0.5) 0%, transparent 55%), radial-gradient(110% 90% at 0% 110%, rgba(80,11,24,0.55) 0%, transparent 50%), linear-gradient(160deg, #26040a 0%, #1a0409 55%, #120207 100%)',
      }}
    >
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-wine-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -left-40 h-96 w-96 rounded-full bg-wine-700/30 blur-3xl" />

      <WelcomeForm
        initialName={prof.name || ''}
        initialBrandName={prof.brand_name === prof.name ? '' : prof.brand_name || ''}
        initialWhatsapp={prof.whatsapp || ''}
        initialSlug={prof.slug || ''}
        baseUrl={baseUrl}
        googleReady={isGoogleCalendarConfigured()}
        googleConnected={Boolean(googleConnection)}
      />
    </div>
  );
}

import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ActingBanner } from '@/components/salon/ActingBanner';
import { AIAgentChat } from '@/components/ai/AIAgentChat';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';

/**
 * Casca persistente do app (PWA).
 * Renderiza barra de navegação, header e chat UMA vez. Ao trocar de aba,
 * só o conteúdo (children) é substituído — a navegação não remonta, o que dá
 * a sensação de aplicativo nativo e elimina o "pisca/delay" a cada toque.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireProfessional();

  let brandName = '';
  let slug = '';
  let pendingConversations = 0;
  if (session.professional_id) {
    try {
      const [prof, paused] = await Promise.all([
        dbService.getProfessionalById(session.professional_id),
        dbService.getPausedConversations(session.professional_id).catch(() => []),
      ]);
      if (prof) {
        brandName = prof.brand_name;
        slug = prof.slug;
      }
      pendingConversations = paused.length;
    } catch (e) {
      console.error('Erro ao buscar profissional no layout:', e);
    }
  }

  return (
    <div
      className="flex min-h-screen bg-cream"
      style={{
        backgroundImage:
          'radial-gradient(60% 50% at 100% 0%, rgba(140,36,56,0.04) 0%, transparent 60%), radial-gradient(50% 40% at 0% 100%, rgba(80,11,24,0.035) 0%, transparent 55%)',
        backgroundAttachment: 'fixed',
      }}
    >
      <Sidebar
        role="professional"
        name={session.name}
        brandName={brandName || session.name}
        slug={slug}
        pendingConversations={pendingConversations}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {session.is_salon_manager && <ActingBanner brandName={brandName || 'profissional'} />}
        <Header
          userName={session.name}
          userEmail={session.email}
          role="professional"
        />

        <main className="flex-1 p-4 sm:p-6 pb-28 lg:pb-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      <AIAgentChat />

      {/* Tour de boas-vindas — só aparece no primeiro contato da profissional
          (controlado por localStorage no próprio componente). */}
      <OnboardingTour
        firstName={session.name?.split(' ')[0]}
        slug={slug}
        professionalId={session.professional_id ?? undefined}
      />
    </div>
  );
}

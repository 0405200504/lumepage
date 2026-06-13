import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ActingBanner } from '@/components/salon/ActingBanner';
import { AIAgentChat } from '@/components/ai/AIAgentChat';

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
  if (session.professional_id) {
    try {
      const prof = await dbService.getProfessionalById(session.professional_id);
      if (prof) {
        brandName = prof.brand_name;
        slug = prof.slug;
      }
    } catch (e) {
      console.error('Erro ao buscar profissional no layout:', e);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f7f3ee]">
      <Sidebar
        role="professional"
        name={session.name}
        brandName={brandName || session.name}
        slug={slug}
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
    </div>
  );
}

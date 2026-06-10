import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SessionData } from '@/lib/auth/auth';
import { dbService } from '@/lib/supabase/db';
import { ActingBanner } from '@/components/salon/ActingBanner';
import { AIAgentChat } from '@/components/ai/AIAgentChat';

interface LayoutDashboardProps {
  children: React.ReactNode;
  session: SessionData;
  title: string;
  subtitle?: string;
}

export const LayoutDashboard: React.FC<LayoutDashboardProps> = async ({
  children,
  session,
  title,
  subtitle
}) => {
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
          title={title}
          subtitle={subtitle}
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
};
export default LayoutDashboard;

import React from 'react';
import { cookies } from 'next/headers';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { SessionData } from '@/lib/auth/auth';
import { getAlertCount } from '@/lib/admin/alerts';

/**
 * Casca do painel administrativo.
 *
 * O visual é o MESMO do painel da profissional: fundo creme com os halos bordô,
 * cartões arredondados com sombra suave, Manrope, pills. Não existe paleta
 * separada para o admin — é um produto só, com duas áreas. `.admin-shell` sobrou
 * como gancho para uma coisa só: a densidade das tabelas.
 *
 * Três coisas vêm de cookie e são lidas no servidor, para a primeira pintura já
 * sair certa (sem pulo na hidratação): barra recolhida, tema e densidade.
 */

interface LayoutAdminProps {
  children: React.ReactNode;
  session: SessionData;
  title: string;
  subtitle?: string;
  /** Ações da tela, exibidas à direita do título. */
  actions?: React.ReactNode;
}

export async function LayoutAdmin({ children, session, title, subtitle, actions }: LayoutAdminProps) {
  const [cookieStore, alertCount] = await Promise.all([cookies(), getAlertCount().catch(() => 0)]);
  const collapsed = cookieStore.get('lume_admin_sidebar')?.value === '1';
  // 'system' segue o SO; 'light'/'dark' são escolha explícita.
  const theme = (cookieStore.get('lume_admin_theme')?.value ?? 'system') as 'light' | 'dark' | 'system';
  const density = (cookieStore.get('lume_admin_density')?.value ?? 'comfortable') as 'comfortable' | 'compact';

  return (
    <div
      data-theme={theme}
      data-density={density}
      className="admin-shell flex min-h-screen bg-cream"
      style={{
        backgroundImage:
          'radial-gradient(60% 50% at 100% 0%, rgba(140,36,56,0.04) 0%, transparent 60%), radial-gradient(50% 40% at 0% 100%, rgba(80,11,24,0.035) 0%, transparent 55%)',
        backgroundAttachment: 'fixed',
      }}
    >
      <AdminSidebar name={session.name} email={session.email} initialCollapsed={collapsed} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar
          title={title}
          subtitle={subtitle}
          userName={session.name}
          userEmail={session.email}
          actions={actions}
          alertCount={alertCount}
          theme={theme}
          density={density}
        />

        {/* 1600px em vez do max-w-7xl da profissional: as tabelas do admin têm 8
            colunas e ficariam com centenas de pixels vazios de cada lado. */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default LayoutAdmin;

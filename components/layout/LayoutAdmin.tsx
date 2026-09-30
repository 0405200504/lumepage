import React from 'react';
import { cookies } from 'next/headers';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { AdminGlobalSearch } from '@/components/admin/AdminGlobalSearch';
import { SessionData } from '@/lib/auth/auth';
import { getAlertCount } from '@/lib/admin/alerts';

/**
 * Casca do painel administrativo.
 *
 * Fundo cinza-claro, barra lateral branca flutuante à esquerda e o conteúdo num
 * container de 1440px. Mesmo sistema visual do painel da profissional — um
 * produto, duas áreas.
 *
 * Duas coisas vêm de cookie e são lidas no servidor, para a primeira pintura já
 * sair certa: barra recolhida e tema. A contagem de alertas alimenta o selo do
 * item "Início" na barra.
 */
interface LayoutAdminProps {
  children: React.ReactNode;
  session: SessionData;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Telas de detalhe: seta de volta acima do título. */
  backHref?: string;
  backLabel?: string;
}

export async function LayoutAdmin({ children, session, title, subtitle, actions, backHref, backLabel }: LayoutAdminProps) {
  const [cookieStore, alertCount] = await Promise.all([cookies(), getAlertCount().catch(() => 0)]);
  const collapsed = cookieStore.get('lume_admin_sidebar')?.value === '1';
  const theme = (cookieStore.get('lume_admin_theme')?.value ?? 'system') as 'light' | 'dark' | 'system';

  return (
    <div data-theme={theme} className="admin-shell flex min-h-screen bg-bg text-ink">
      <AdminSidebar name={session.name} email={session.email} initialCollapsed={collapsed} alertCount={alertCount} />
      <AdminGlobalSearch />

      <div className="flex-1 min-w-0">
        <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <AdminTopbar title={title} subtitle={subtitle} actions={actions} backHref={backHref} backLabel={backLabel} />
          <div className="route-fade">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default LayoutAdmin;

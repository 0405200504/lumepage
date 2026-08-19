import React from 'react';
import { cookies } from 'next/headers';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { SessionData } from '@/lib/auth/auth';
import { getAlertCount } from '@/lib/admin/alerts';

/**
 * Casca do painel administrativo.
 *
 * Duas correções estruturais em relação à versão anterior:
 *  1. Container: era `max-w-7xl` (1280px) numa tela de 1568px com tabelas de 6+
 *     colunas — sobravam ~430px vazios de cada lado. Agora 1600px.
 *  2. Navegação: barra própria do admin, com rótulos e grupos, no lugar do trilho
 *     de ícones compartilhado com o painel da profissional.
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
  // Lido no servidor para a barra já sair na largura certa (sem "pulo" na hidratação).
  const [cookieStore, alertCount] = await Promise.all([cookies(), getAlertCount().catch(() => 0)]);
  const collapsed = cookieStore.get('lume_admin_sidebar')?.value === '1';
  // 'system' segue o SO; 'light'/'dark' são escolha explícita. Lido no servidor
  // para a primeira pintura já sair no tema certo.
  const theme = (cookieStore.get('lume_admin_theme')?.value ?? 'system') as 'light' | 'dark' | 'system';

  return (
    <div data-theme={theme} className="flex min-h-screen bg-bg">
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
        />

        <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default LayoutAdmin;

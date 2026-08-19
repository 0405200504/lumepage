import React from 'react';
import { cookies } from 'next/headers';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { SessionData } from '@/lib/auth/auth';
import { getAlertCount } from '@/lib/admin/alerts';

/**
 * Casca do painel administrativo.
 *
 * `.admin-shell` é o que separa o sistema visual do admin do resto do produto: os
 * tokens de cor, raio, sombra e tipografia são redefinidos ali (ver o bloco
 * "PAINEL ADMINISTRATIVO" em app/globals.css) e, como as utilities do Tailwind v4
 * leem var(--…), tudo abaixo herda sem trocar uma classe sequer.
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
    <div data-theme={theme} data-density={density} className="admin-shell flex min-h-screen">
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

        {/* 1680px: numa tela de 1568px o conteúdo ocupava ~880px e sobravam ~550px
            vazios — desperdício num painel com tabelas de 8 colunas. */}
        <main className="flex-1 w-full max-w-[1680px] mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default LayoutAdmin;

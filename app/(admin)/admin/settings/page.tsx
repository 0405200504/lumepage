import React from 'react';
import { cookies } from 'next/headers';
import { AlertTriangle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { SubNav, SISTEMA_NAV } from '@/components/admin/SubNav';
import { Panel, Notice, EmptyState } from '@/components/admin/primitives';
import { ThemeToggle } from '@/components/admin/ThemeToggle';
import { getAppSettingsAction } from '@/app/actions/admin-system';
import { AppSettingsForm } from '@/components/admin/AppSettingsForm';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { formatDateBR } from '@/lib/format';

export const metadata = { title: 'Configurações | Lume Admin' };

export default async function AdminSettingsPage() {
  const session = await requireAdmin();
  const [{ settings, available }, cookieStore] = await Promise.all([getAppSettingsAction(), cookies()]);
  const theme = (cookieStore.get('lume_admin_theme')?.value ?? 'system') as 'light' | 'dark' | 'system';

  const { data: admins } = isSupabaseConfigured
    ? await (getSupabaseAdmin() || supabase).from('profiles').select('id, name, email, created_at').eq('role', 'super_admin')
    : { data: [] };

  return (
    <LayoutAdmin
      session={session}
      title="Configurações"
      subtitle="Quem administra a plataforma, os ajustes globais e a aparência do painel."
    >
      <div className="space-y-4">
        <SubNav items={SISTEMA_NAV} />

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Aparência" note="Tema deste painel. Vale só para você, neste navegador.">
            <ThemeToggle initial={theme} />
          </Panel>

          <Panel flush title="Administradores" note="Novo administrador é criado no Supabase (profiles.role). Todo admin tem acesso total.">
            <ul className="divide-y divide-line border-t border-line">
              {((admins || []) as { id: string; name: string; email: string; created_at: string }[]).map(a => (
                <li key={a.id} className="px-5 py-3 flex items-center gap-3 text-body-sm">
                  <span className="font-semibold text-heading flex-1 truncate">{a.name}</span>
                  <span className="text-caption text-n-500 truncate">{a.email}</span>
                  <span className="text-caption text-n-500 num whitespace-nowrap">desde {formatDateBR(a.created_at)}</span>
                </li>
              ))}
              {(admins || []).length === 0 && <li><EmptyState title="Nenhum administrador encontrado" className="py-8" /></li>}
            </ul>
          </Panel>
        </div>

        {!available && (
          <Notice tone="warn" icon={<AlertTriangle />}>
            Rode <code className="font-mono">supabase/migration_v34_admin_system.sql</code> para salvar as configurações globais.
          </Notice>
        )}

        <AppSettingsForm initial={settings} />
      </div>
    </LayoutAdmin>
  );
}

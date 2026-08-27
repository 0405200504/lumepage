import React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { getAppSettingsAction } from '@/app/actions/admin-system';
import { AppSettingsForm } from '@/components/admin/AppSettingsForm';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { formatDateBR } from '@/lib/format';

export const metadata = { title: 'Configurações | Lume Admin' };

export default async function AdminSettingsPage() {
  const session = await requireAdmin();
  const { settings, available } = await getAppSettingsAction();

  const { data: admins } = isSupabaseConfigured
    ? await (getSupabaseAdmin() || supabase).from('profiles').select('id, name, email, created_at').eq('role', 'super_admin')
    : { data: [] };

  return (
    <LayoutAdmin
      session={session}
      title="Configurações"
      subtitle="Quem administra a plataforma e os ajustes globais que valem para toda a rede."
    >
      <div className="space-y-4">
        <section className="card overflow-hidden">
          <h2 className="px-4 py-3 text-label font-bold text-ink border-b border-line flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-muted" /> Administradores
          </h2>
          <ul className="divide-y divide-line">
            {((admins || []) as { id: string; name: string; email: string; created_at: string }[]).map(a => (
              <li key={a.id} className="px-4 py-2.5 flex items-center gap-3 text-caption">
                <span className="font-semibold text-ink flex-1 truncate">{a.name}</span>
                <span className="text-muted truncate">{a.email}</span>
                <span className="text-muted num">desde {formatDateBR(a.created_at)}</span>
              </li>
            ))}
            {(admins || []).length === 0 && <li className="px-4 py-8 text-center text-caption text-muted">Nenhum administrador encontrado.</li>}
          </ul>
          <p className="px-4 py-2.5 border-t border-line text-caption text-muted">
            Criar um novo administrador é feito no Supabase (tabela <code className="font-mono">profiles</code>, campo <code className="font-mono">role</code>).
            Papel de suporte somente-leitura ainda não existe — hoje todo admin tem acesso total.
          </p>
        </section>

        {!available && (
          <p className="card px-4 py-3 flex items-start gap-2 text-caption text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-px" aria-hidden />
            <span>Rode <code className="font-mono">supabase/migration_v34_admin_system.sql</code> para salvar as configurações globais.</span>
          </p>
        )}

        <AppSettingsForm initial={settings} />
      </div>
    </LayoutAdmin>
  );
}

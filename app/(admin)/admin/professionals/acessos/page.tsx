import React from 'react';
import Link from 'next/link';
import { AlertTriangle, KeyRound } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { ExportCsvButton } from '@/components/ui/ExportCsvButton';
import { ImpersonateRowButton } from '@/components/admin/ImpersonateRowButton';
import { AccessActionsCell } from '@/components/admin/AccessActionsCell';
import { Badge } from '@/components/admin/badges';
import { StatStrip, Panel, Notice, EmptyState } from '@/components/admin/primitives';
import { SubNav, CONTAS_NAV } from '@/components/admin/SubNav';
import { listAccessRows, METHOD_LABEL, AuthMethod } from '@/lib/admin/access';
import { formatDateBR, formatDateTimeBR, formatRelativeBR } from '@/lib/format';

export const metadata = { title: 'Acessos | Lume Admin' };

/**
 * QUEM CONSEGUE ENTRAR — uma linha por conta: e-mail de login, método, último
 * acesso, sessões. Nunca a senha: ela só existe como hash no provedor de
 * autenticação. O útil aqui é o avesso — quem NÃO consegue entrar.
 */
const METHOD_TONE: Record<AuthMethod, 'ok' | 'warn' | 'bad' | 'neutral'> = {
  password: 'ok', both: 'ok', google: 'warn', none: 'bad',
};

export default async function AccessOverviewPage() {
  const session = await requireAdmin();
  const { rows, available, reason } = await listAccessRows();

  const blocked = rows.filter(r => !r.hasAuthUser || r.method === 'none');
  const googleOnly = rows.filter(r => r.method === 'google');
  const neverIn = rows.filter(r => !r.lastSignInAt);
  const shared = rows.filter(r => r.activeSessions > 1);

  return (
    <LayoutAdmin
      session={session}
      title="Acessos"
      subtitle="Por qual caminho cada conta entra e quais não conseguem entrar."
      actions={<ExportCsvButton dataset="access" label="Exportar CSV" />}
    >
      <div className="space-y-4">
        <SubNav items={CONTAS_NAV} />

        {!available && <Notice tone="warn" icon={<AlertTriangle />}>{reason}</Notice>}

        <StatStrip items={[
          { label: 'Sem caminho de login', value: String(blocked.length), note: 'não conseguem entrar', tone: blocked.length ? 'bad' : 'default' },
          { label: 'Só pelo Google', value: String(googleOnly.length), note: 'sem senha de reserva', tone: googleOnly.length ? 'warn' : 'default' },
          { label: 'Nunca acessaram', value: String(neverIn.length), note: 'cadastro sem primeiro login', tone: neverIn.length ? 'warn' : 'default' },
          { label: 'Mais de uma sessão', value: String(shared.length), note: 'aberta ao mesmo tempo' },
        ]} />

        <Panel flush title={`${rows.length} conta(s)`} note="Ordenado pelo acesso mais recente">
          {rows.length === 0 ? (
            <EmptyState icon={<KeyRound />} title="Nenhuma conta para mostrar" />
          ) : (
            <div className="overflow-x-auto scroll-touch border-t border-line">
              <table className="admin-table min-w-full border-collapse">
                <caption className="sr-only">Acesso das contas: e-mail de login, método, último acesso e sessões</caption>
                <thead>
                  <tr>
                    <th scope="col" className="min-w-[12rem]">Conta</th>
                    <th scope="col" className="min-w-[15rem]">E-mail de login</th>
                    <th scope="col" className="min-w-[9rem]">Método</th>
                    <th scope="col" className="min-w-[10rem]">Último acesso</th>
                    <th scope="col" className="text-right min-w-[6rem]">Sessões</th>
                    <th scope="col" className="min-w-[9rem]">Senha definida</th>
                    <th scope="col" className="text-right min-w-[13rem]"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/admin/professionals/${r.id}?tab=access`} className="block">
                          <span className="block font-semibold text-heading truncate">{r.brandName}</span>
                          <span className="block text-caption text-n-500 truncate">{r.name}</span>
                        </Link>
                      </td>
                      <td>
                        <span className="block text-caption text-ink break-all">{r.loginEmail}</span>
                        {r.loginEmail.toLowerCase() !== r.businessEmail.toLowerCase() && (
                          <span className="block text-caption text-n-500 truncate" title={r.businessEmail}>comercial: {r.businessEmail}</span>
                        )}
                      </td>
                      <td><Badge tone={METHOD_TONE[r.method]}>{METHOD_LABEL[r.method]}</Badge></td>
                      <td>
                        {r.lastSignInAt
                          ? <span className="text-caption text-n-500 num" title={formatDateTimeBR(r.lastSignInAt)}>{formatRelativeBR(r.lastSignInAt)}</span>
                          : <span className="text-caption text-warning font-semibold">nunca</span>}
                      </td>
                      <td className="text-right num">
                        {r.activeSessions < 0
                          ? <span className="text-n-400">—</span>
                          : <span className={r.activeSessions > 1 ? 'font-semibold text-heading' : 'text-n-500'}>{r.activeSessions}</span>}
                      </td>
                      <td>
                        <span className="text-caption text-n-500 num">{formatDateBR(r.passwordSetAt, '—')}</span>
                        {r.mustChangePassword && <Badge tone="warn" className="ml-1.5">troca pendente</Badge>}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          <AccessActionsCell id={r.id} brandName={r.brandName} hasAuthUser={r.hasAuthUser} />
                          <ImpersonateRowButton id={r.id} brandName={r.brandName} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <p className="text-caption text-n-500 max-w-2xl px-1">
          Não existe “ver a senha”: ela só existe como hash no provedor de autenticação. Redefinição por e-mail,
          link mágico, senha temporária e “Entrar como” cobrem os casos de suporte, com prazo e registro.
        </p>
      </div>
    </LayoutAdmin>
  );
}

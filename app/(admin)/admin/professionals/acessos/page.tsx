import React from 'react';
import Link from 'next/link';
import { ArrowLeft, KeyRound, AlertTriangle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { ExportCsvButton } from '@/components/ui/ExportCsvButton';
import { ImpersonateRowButton } from '@/components/admin/ImpersonateRowButton';
import { AccessActionsCell } from '@/components/admin/AccessActionsCell';
import { Badge } from '@/components/admin/badges';
import { listAccessRows, METHOD_LABEL, AuthMethod } from '@/lib/admin/access';
import { formatDateBR, formatDateTimeBR, formatRelativeBR } from '@/lib/format';

export const metadata = { title: 'Acessos | Lume Admin' };

/**
 * QUEM CONSEGUE ENTRAR — uma linha por conta.
 *
 * Esta é a "lista de logins": e-mail de acesso, por qual caminho cada uma entra,
 * quando entrou pela última vez e quantas sessões estão abertas. O que ela NÃO tem,
 * e nunca vai ter, é senha — o valor não existe de forma legível nem no banco.
 * O que ela tem de útil é o avesso disso: mostra quem NÃO consegue entrar.
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
      subtitle="Por qual caminho cada conta entra — e quais não conseguem entrar de jeito nenhum."
      actions={
        <>
          <Link href="/admin/professionals" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-line bg-surface text-ink text-caption font-bold hover:bg-surface-2 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Profissionais
          </Link>
          <ExportCsvButton dataset="access" label="Exportar acessos" />
        </>
      }
    >
      <div className="space-y-4">
        {!available && (
          <p className="card px-4 py-3 text-caption font-semibold text-warning flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-px" aria-hidden /> {reason}
          </p>
        )}

        {/* Só os recortes que existem. Bloco zerado não ganha caixa. */}
        {(blocked.length > 0 || googleOnly.length > 0 || neverIn.length > 0 || shared.length > 0) && (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {blocked.length > 0 && <Flag tone="bad" n={blocked.length} text="sem caminho de login — não conseguem entrar" />}
            {googleOnly.length > 0 && <Flag tone="warn" n={googleOnly.length} text="só entram pelo Google, sem senha de reserva" />}
            {neverIn.length > 0 && <Flag tone="warn" n={neverIn.length} text="nunca acessaram o painel" />}
            {shared.length > 0 && <Flag tone="neutral" n={shared.length} text="com mais de uma sessão aberta" />}
          </ul>
        )}

        <section className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted" aria-hidden />
            <h2 className="text-label font-bold text-ink">{rows.length} conta(s)</h2>
            <span className="text-caption text-muted ml-auto">Ordenado pelo acesso mais recente.</span>
          </div>

          {rows.length === 0 ? (
            <p className="px-4 py-12 text-center text-caption text-muted">Nenhuma conta para mostrar.</p>
          ) : (
            <div className="overflow-x-auto scroll-touch">
              <table className="min-w-full text-left border-collapse">
                <caption className="sr-only">Acesso das contas: e-mail de login, método, último acesso e sessões</caption>
                <thead className="bg-surface-2 text-caption font-bold text-muted uppercase tracking-[0.08em]">
                  <tr>
                    <th scope="col" className="px-4 py-3 border-b border-line min-w-[12rem]">Profissional</th>
                    <th scope="col" className="px-4 py-3 border-b border-line min-w-[15rem]">E-mail de login</th>
                    <th scope="col" className="px-4 py-3 border-b border-line min-w-[9rem]">Método</th>
                    <th scope="col" className="px-4 py-3 border-b border-line min-w-[10rem]">Último acesso</th>
                    <th scope="col" className="px-4 py-3 border-b border-line text-right min-w-[6rem]">Sessões</th>
                    <th scope="col" className="px-4 py-3 border-b border-line min-w-[9rem]">Senha definida</th>
                    <th scope="col" className="px-4 py-3 border-b border-line text-right min-w-[13rem]">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-label text-ink">
                  {rows.map((r, i) => (
                    <tr key={r.id} className={`border-b border-line/70 hover:bg-accent-soft/70 transition-colors ${i % 2 === 1 ? 'bg-surface-2/35' : ''}`}>
                      <td className="px-4 py-2.5">
                        <Link href={`/admin/professionals/${r.id}?tab=access`} className="block">
                          <span className="block font-semibold text-ink truncate">{r.brandName}</span>
                          <span className="block text-caption text-muted truncate">{r.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="block text-caption text-ink break-all">{r.loginEmail}</span>
                        {r.loginEmail.toLowerCase() !== r.businessEmail.toLowerCase() && (
                          <span className="block text-caption text-muted truncate" title={r.businessEmail}>comercial: {r.businessEmail}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={METHOD_TONE[r.method]}>{METHOD_LABEL[r.method]}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        {r.lastSignInAt ? (
                          <span className="text-caption text-muted num" title={formatDateTimeBR(r.lastSignInAt)}>
                            {formatRelativeBR(r.lastSignInAt)}
                          </span>
                        ) : <span className="text-caption text-warning font-semibold">nunca</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right num">
                        {r.activeSessions < 0
                          ? <span className="text-muted">—</span>
                          : <span className={r.activeSessions > 1 ? 'font-bold text-ink' : 'text-muted'}>{r.activeSessions}</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-caption text-muted num">{formatDateBR(r.passwordSetAt, '—')}</span>
                        {r.mustChangePassword && <Badge tone="warn">troca pendente</Badge>}
                      </td>
                      <td className="px-4 py-2.5">
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
        </section>

        <p className="text-caption text-muted max-w-2xl">
          Não existe tela de “ver a senha” — e não vai existir. Para o admin conseguir exibir uma
          senha, ela teria que estar guardada de forma reversível, e aí um vazamento do banco viraria
          o vazamento de todas as contas. Aqui a senha só existe como hash dentro do provedor de
          autenticação. As três ações acima cobrem todos os casos de suporte, com prazo e registro.
        </p>
      </div>
    </LayoutAdmin>
  );
}

function Flag({ tone, n, text }: { tone: 'bad' | 'warn' | 'neutral'; n: number; text: string }) {
  const color = tone === 'bad' ? 'var(--color-bad)' : tone === 'warn' ? 'var(--color-warn)' : 'var(--color-muted)';
  return (
    <li className="card px-4 py-3 rounded-3xl">
      <span className="block text-h2 font-semibold num leading-none" style={{ color }}>{n}</span>
      <span className="block text-caption text-muted mt-1.5 leading-snug">{text}</span>
    </li>
  );
}

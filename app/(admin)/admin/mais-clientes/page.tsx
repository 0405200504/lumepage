import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Bot, ShieldCheck } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { SubNav, CONTAS_NAV } from '@/components/admin/SubNav';
import { StatStrip, Panel, Notice } from '@/components/admin/primitives';
import { Badge } from '@/components/admin/badges';
import { MaisClientesToggle } from '@/components/admin/MaisClientesToggle';
import { MetaVinculo, type OpcaoMeta } from '@/components/admin/MetaVinculo';
import { textLink } from '@/components/admin/ui';
import { dbService } from '@/lib/supabase/db';
import { listarProgramas, programaVazio, MIGRACAO } from '@/lib/mais-clientes/store';
import { ETAPAS, etapasConcluidas, brl } from '@/lib/mais-clientes/regras';
import { metaConfigurada } from '@/lib/meta/graph';
import { statusRobo, listarAtivos, type StatusRobo, type ContaAnuncio, type PaginaMeta } from '@/lib/meta/ativos';

type Meta =
  | { estado: 'desligada' }
  | { estado: 'erro'; mensagem: string }
  | { estado: 'ok'; status: StatusRobo; contas: ContaAnuncio[]; paginas: PaginaMeta[] };

/** O robô e o que as profissionais já compartilharam com o Gerenciador da Lume. */
async function lerMeta(): Promise<Meta> {
  if (!metaConfigurada()) return { estado: 'desligada' };
  try {
    const [status, { contas, paginas }] = await Promise.all([statusRobo(), listarAtivos()]);
    return { estado: 'ok', status, contas, paginas };
  } catch (e) {
    return { estado: 'erro', mensagem: e instanceof Error ? e.message : 'Falha ao falar com a Meta.' };
  }
}

export const metadata = { title: 'Assessoria | Lume Admin' };

/**
 * Todas as contas no "Quero mais clientes": quem já pagou e foi liberada, em
 * que etapa está e quem já mandou tudo para a equipe colocar no ar.
 */
export default async function AdminMaisClientesPage() {
  const session = await requireAdmin();
  const [contas, { programas, disponivel }, meta] = await Promise.all([
    dbService.getProfessionals().catch(() => []),
    listarProgramas(),
    lerMeta(),
  ]);
  // Ativos já ligados a alguém vão para o fim da lista; os de profissionais, antes dos da Lume.
  const ligados = new Set(programas.flatMap(p => p.meta ? [p.meta.ad_account_id, p.meta.page_id] : []));
  const ordem = (dono: string, id: string) => (ligados.has(id) ? 2 : 0) + (dono === 'lume' ? 1 : 0);
  const opcoesConta: OpcaoMeta[] = meta.estado === 'ok' ? [...meta.contas]
    .sort((a, b) => ordem(a.dono, a.id) - ordem(b.dono, b.id))
    .map(c => ({ id: c.id, nome: c.nome, detalhe: [c.dono === 'lume' ? 'da Lume' : null, !c.ativa ? c.status : null, !c.pagamento ? 'sem pagamento' : null, ligados.has(c.id) ? 'já vinculada' : null].filter(Boolean).join(', ') })) : [];
  const opcoesPagina: OpcaoMeta[] = meta.estado === 'ok' ? [...meta.paginas]
    .sort((a, b) => ordem(a.dono, a.id) - ordem(b.dono, b.id))
    .map(p => ({ id: p.id, nome: p.nome, detalhe: [p.instagram ? `@${p.instagram.username}` : 'sem Instagram', ligados.has(p.id) ? 'já vinculada' : null].filter(Boolean).join(', ') })) : [];
  const semDona = meta.estado === 'ok' ? meta.contas.filter(c => c.dono === 'profissional' && !ligados.has(c.id)).length : 0;
  const porId = new Map(programas.map(p => [p.professional_id, p]));
  const linhas = contas.map(c => ({ conta: c, programa: porId.get(c.id) ?? programaVazio(c.id) }))
    .map(l => ({ ...l, feitas: etapasConcluidas(l.programa) }))
    .sort((a, b) => {
      const peso = (l: typeof a) => l.programa.plan?.enviado_em ? 0 : l.programa.status === 'liberado' ? 1 : 2;
      return peso(a) - peso(b) || (a.conta.brand_name || a.conta.name).localeCompare(b.conta.brand_name || b.conta.name);
    });
  const liberadas = linhas.filter(l => l.programa.status === 'liberado');
  const prontas = liberadas.filter(l => l.programa.plan?.enviado_em);

  return (
    <LayoutAdmin session={session} title="Assessoria" subtitle="Quem contratou o “Quero mais clientes”, em que etapa está e quem está pronta para ir ao ar.">
      <div className="space-y-4">
        <SubNav items={CONTAS_NAV} />
        {!disponivel && <Notice tone="warn" icon={<AlertTriangle />}>Rode <code className="font-mono">{MIGRACAO}</code> no Supabase para ativar o &quot;Quero mais clientes&quot;.</Notice>}

        {meta.estado === 'desligada' && (
          <Notice tone="warn" icon={<Bot />}>Robô da Meta desligado neste ambiente: falta <code className="font-mono">META_SYSTEM_USER_TOKEN</code> nas variáveis da Vercel.</Notice>
        )}
        {meta.estado === 'erro' && <Notice tone="bad" icon={<AlertTriangle />}>A Meta não respondeu: {meta.mensagem}</Notice>}
        {meta.estado === 'ok' && (
          <Notice tone={meta.status.empresa.verificada ? 'ok' : 'warn'} icon={meta.status.empresa.verificada ? <ShieldCheck /> : <AlertTriangle />}>
            Robô <strong>{meta.status.robo.nome}</strong> no Gerenciador <strong>{meta.status.empresa.nome}</strong>
            {meta.status.empresa.verificada ? ' (empresa verificada)' : ' (empresa NÃO verificada)'} ·{' '}
            {meta.contas.filter(c => c.dono === 'profissional').length} conta(s) de anúncios e {meta.paginas.filter(p => p.dono === 'profissional').length} Página(s) de profissionais
            {semDona ? ` · ${semDona} conta(s) compartilhada(s) esperando vínculo` : ''}
          </Notice>
        )}

        <StatStrip items={[
          { label: 'Liberadas', value: String(liberadas.length) },
          { label: 'Em andamento', value: String(liberadas.length - prontas.length), tone: liberadas.length - prontas.length ? 'accent' : 'default' },
          { label: 'Prontas para ir ao ar', value: String(prontas.length), tone: prontas.length ? 'warn' : 'default' },
          { label: 'Contas ativas', value: String(contas.length) },
        ]} />

        <Panel flush title="Contas" note="Prontas para ir ao ar primeiro, depois as liberadas">
          <div className="border-t border-line overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="text-left text-caption text-n-500">
                  <th className="px-5 py-2.5 font-semibold">Conta</th>
                  <th className="px-3 py-2.5 font-semibold">Situação</th>
                  <th className="px-3 py-2.5 font-semibold">Etapas</th>
                  <th className="px-3 py-2.5 font-semibold">Verba</th>
                  <th className="px-3 py-2.5 font-semibold">Meta (conta de anúncios e Página)</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Acesso</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map(({ conta, programa, feitas }) => {
                  const liberada = programa.status === 'liberado';
                  const n = ETAPAS.filter(e => feitas[e.id]).length;
                  return (
                    <tr key={conta.id} className="border-t border-line align-middle">
                      <td className="px-5 py-3">
                        <Link href={`/admin/professionals/${conta.id}?tab=growth`} className={`font-semibold ${textLink}`}>{conta.brand_name || conta.name}</Link>
                        <p className="text-caption text-n-500">{[conta.city, conta.state].filter(Boolean).join(' - ') || '—'}</p>
                      </td>
                      <td className="px-3 py-3">
                        {programa.plan?.enviado_em ? <Badge tone="warn">pronta para ir ao ar</Badge> : liberada ? <Badge tone="ok">liberada</Badge> : <Badge tone="neutral" dot={false}>bloqueada</Badge>}
                      </td>
                      <td className="px-3 py-3 text-n-700">{liberada ? `${n} de ${ETAPAS.length}` : '—'}</td>
                      <td className="px-3 py-3 text-n-700">{programa.plan ? `${brl(programa.plan.verba_semanal * 100)}/sem.` : '—'}</td>
                      <td className="px-3 py-3">
                        {liberada && meta.estado === 'ok'
                          ? <MetaVinculo id={conta.id} meta={programa.meta} contas={opcoesConta} paginas={opcoesPagina}
                              criativos={programa.plan?.criativos?.length ?? 0} enviado={!!programa.plan?.enviado_em} />
                          : <span className="text-n-500">{programa.meta ? programa.meta.ad_account_nome : '—'}</span>}
                      </td>
                      <td className="px-5 py-3 text-right"><MaisClientesToggle id={conta.id} liberado={liberada} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </LayoutAdmin>
  );
}

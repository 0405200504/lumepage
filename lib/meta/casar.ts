/**
 * Qual conta de anúncios e qual Página são dela, entre as que as
 * profissionais compartilharam com a Lume e ninguém usa ainda. Função pura
 * (testada em scripts/test-meta.mts).
 */

import type { ContaAnuncio, PaginaMeta } from './ativos';

const sem = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Qual conta e qual Página são dela, entre as que ninguém usa ainda.
 * Página: pelo @ do Instagram ligado a ela; sem isso, pelo nome (só se der um
 * único resultado). Conta: a da mesma empresa dona da Página; sem isso, pelo
 * nome. Na dúvida, não chuta: devolve "ambíguo" e o admin escolhe.
 */
export function casarAtivos(
  alvo: { instagram: string; nomes: string[] },
  contas: ContaAnuncio[],
  paginas: PaginaMeta[],
  ocupados: Set<string>,
): { conta: ContaAnuncio | null; pagina: PaginaMeta | null; ambiguo: boolean } {
  const paginasLivres = paginas.filter(p => p.dono === 'profissional' && !ocupados.has(p.id));
  const contasLivres = contas.filter(c => c.dono === 'profissional' && !ocupados.has(c.id));
  const handle = sem(alvo.instagram);
  const nomes = alvo.nomes.map(sem).filter(n => n.length >= 4);
  const pareceDela = (nome: string | null) => !!nome && nomes.some(n => sem(nome).includes(n));

  let ambiguo = false;
  let pagina = handle ? paginasLivres.find(p => p.instagram && sem(p.instagram.username) === handle) ?? null : null;
  if (!pagina) {
    const porNome = paginasLivres.filter(p => pareceDela(p.nome));
    if (porNome.length === 1) pagina = porNome[0];
    else if (porNome.length > 1) ambiguo = true;
  }

  let conta: ContaAnuncio | null = null;
  if (pagina?.empresa_id) {
    const daEmpresa = contasLivres.filter(c => c.empresa_id === pagina!.empresa_id);
    if (daEmpresa.length === 1) conta = daEmpresa[0];
    else if (daEmpresa.length > 1) ambiguo = true;
  }
  if (!conta && pagina) {
    const porNome = contasLivres.filter(c => pareceDela(c.nome) || pareceDela(c.empresa));
    if (porNome.length === 1) conta = porNome[0];
    else if (porNome.length > 1) ambiguo = true;
  }
  return { conta, pagina, ambiguo };
}

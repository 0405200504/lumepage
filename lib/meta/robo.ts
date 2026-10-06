/**
 * O robô de anúncios no automático. Para cada profissional que já enviou a
 * estruturação, ele anda sozinho até o anúncio estar no ar:
 *
 *   1. acha a conta de anúncios e a Página que ELA compartilhou com a Lume
 *      (pelo @ do Instagram e pela empresa dona da Página) e vincula;
 *   2. monta as campanhas (campanha.ts), confere que todos os anúncios saíram;
 *   3. ativa, se a conta dela estiver ativa e com cartão ou Pix;
 *   4. avisa a profissional (push e o quadro na aba).
 *
 * Roda logo depois de ela enviar (after() da action) e, de novo, a cada 5
 * minutos pela rotina /api/cron/reminders — o acesso dela pode chegar depois.
 *
 * O admin manda mais que o robô: pausar, trocar ou desvincular marca
 * `robo.pausado` e o robô não mexe mais naquela conta até ele retomar.
 */

import { graph, metaConfigurada, MetaErro } from './graph';
import { listarAtivos, atribuirAoRobo, type ContaAnuncio, type PaginaMeta } from './ativos';
import { casarAtivos } from './casar';
import { criarCampanhas, ativarCampanhas, type ContextoCampanha } from './campanha';
import { lerPrograma, gravarPrograma, listarProgramas } from '@/lib/mais-clientes/store';
import { dbService } from '@/lib/supabase/db';
import { pushToProfessional } from '@/lib/push/send';
import { brl } from '@/lib/mais-clientes/regras';
import type { EstadoRobo, EtapaRobo, GrowthMeta, GrowthProgram } from '@/types/mais-clientes';

/** Depois de um erro, espera isto antes de tentar de novo (não martela a Meta). */
const ESPERA_ERRO_MS = 30 * 60 * 1000;

/** Dados dela que entram nos nomes, no raio e no link da página. */
export async function contextoDe(professionalId: string, programa: GrowthProgram): Promise<ContextoCampanha & { nomes: string[] }> {
  const pro = await dbService.getProfessionalById(professionalId);
  const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
  return {
    nome: pro?.brand_name || pro?.name || 'Profissional',
    nomes: [pro?.brand_name, pro?.name].filter((n): n is string => !!n),
    endereco: pro?.address || '',
    cidade: programa.intake.cidade || pro?.city || '',
    uf: programa.intake.uf || pro?.state || '',
    linkAgendamento: pro?.slug && base ? `${base}/${pro.slug}` : '',
  };
}

const estado = (etapa: EtapaRobo, mensagem: string, antes: EstadoRobo | null): EstadoRobo => ({
  ...(antes ?? {}), etapa, mensagem, atualizado_em: new Date().toISOString(),
});

/** Manda o aviso uma vez só (a chave fica em robo.avisos). */
async function avisar(professionalId: string, robo: EstadoRobo, chave: string, titulo: string, corpo: string): Promise<EstadoRobo> {
  if (robo.avisos?.includes(chave)) return robo;
  await pushToProfessional(professionalId, { title: titulo, body: corpo, url: '/dashboard/mais-clientes', tag: 'mais-clientes' });
  return { ...robo, avisos: [...(robo.avisos ?? []), chave] };
}

/**
 * Um passo do robô para uma profissional. Idempotente: pode rodar quantas
 * vezes for, só avança o que falta. Nunca lança — erro vira etapa "erro".
 */
export async function passoDoRobo(
  professionalId: string,
  cache?: { ativos?: { contas: ContaAnuncio[]; paginas: PaginaMeta[] }; ocupados?: Set<string> },
): Promise<EstadoRobo | null> {
  const { programa } = await lerPrograma(professionalId, false);
  const antes = programa.robo;
  if (!metaConfigurada() || programa.status !== 'liberado' || antes?.pausado) return antes;
  if (!programa.plan?.enviado_em) return antes;
  if (antes?.etapa === 'erro' && Date.now() - Date.parse(antes.atualizado_em) < ESPERA_ERRO_MS) return antes;

  let robo: EstadoRobo = antes ?? estado('aguardando_acesso', '', null);
  let meta: GrowthMeta | null = programa.meta;
  try {
    // 1. Vincular a conta e a Página dela.
    if (!meta) {
      const ativos = cache?.ativos ?? await listarAtivos();
      const ocupados = cache?.ocupados ?? new Set((await listarProgramas()).programas.flatMap(p => p.meta ? [p.meta.ad_account_id, p.meta.page_id] : []));
      const ctx = await contextoDe(professionalId, programa);
      const achado = casarAtivos({ instagram: programa.intake.instagram || '', nomes: ctx.nomes }, ativos.contas, ativos.paginas, ocupados);
      if (!achado.conta || !achado.pagina) {
        robo = achado.ambiguo
          ? estado('vinculo_manual', 'Apareceu mais de uma conta ou Página que pode ser dela: escolha no admin.', robo)
          : estado('aguardando_acesso', achado.pagina ? 'A Página dela chegou, a conta de anúncios ainda não.' : 'A conta de anúncios e a Página dela ainda não foram compartilhadas com a Lume.', robo);
        await gravarPrograma(professionalId, { robo });
        return robo;
      }
      await atribuirAoRobo(achado.conta.id);
      await atribuirAoRobo(achado.pagina.id);
      meta = {
        ad_account_id: achado.conta.id, ad_account_nome: achado.conta.nome,
        page_id: achado.pagina.id, page_nome: achado.pagina.nome,
        ig_id: achado.pagina.instagram?.id ?? null, ig_username: achado.pagina.instagram?.username ?? null,
        vinculado_em: new Date().toISOString(), vinculado_por: 'robô',
      };
      cache?.ocupados?.add(meta.ad_account_id).add(meta.page_id);
      await gravarPrograma(professionalId, { meta });
    }

    // 2. Montar as campanhas (pausadas) e conferir.
    if (!meta.campanhas?.length) {
      meta = await criarCampanhas({ ...programa, meta }, await contextoDe(professionalId, programa), 'robô');
      await gravarPrograma(professionalId, { meta });
      // Conferência: toda campanha com pelo menos um anúncio (campanha.ts já
      // desfaz a que sair vazia; aqui é a segunda trava antes de gastar).
      if (meta.campanhas!.some(c => !c.ad_ids.length)) throw new Error('Uma campanha saiu sem anúncios.');
    }

    // 3. Ativar (só se nunca foi ativada: pausa do admin não é desfeita aqui).
    const nuncaAtivada = meta.campanhas!.every(c => !c.ativada_em);
    if (nuncaAtivada) {
      const conta = await graph<{ account_status: number; funding_source?: string }>(meta.ad_account_id, { params: { fields: 'account_status,funding_source' } });
      if (conta.account_status !== 1 || !conta.funding_source) {
        robo = estado('aguardando_pagamento', conta.account_status !== 1 ? 'A conta de anúncios dela não está ativa na Meta.' : 'Campanha montada; falta cartão ou Pix na conta de anúncios dela.', robo);
        robo = await avisar(professionalId, robo, 'pagamento', 'Falta só a forma de pagamento', 'Coloque cartão ou Pix na sua conta de anúncios da Meta para os seus anúncios entrarem no ar.');
        await gravarPrograma(professionalId, { robo });
        return robo;
      }
      meta = await ativarCampanhas(meta);
      await gravarPrograma(professionalId, { meta });
    }

    // 4. No ar: avisa uma vez.
    const semana = brl(Math.round((meta.campanhas ?? []).reduce((s, c) => s + c.verba_diaria_cents, 0) * 7));
    robo = estado('no_ar', `No ar: ${meta.campanhas!.length} campanha(s), ${semana}/semana.`, robo);
    robo = await avisar(professionalId, robo, 'no_ar', 'Seus anúncios estão no ar!', 'A partir de agora as clientes chegam pelo seu WhatsApp. Acompanhe na sua agenda.');
    await gravarPrograma(professionalId, { robo });
    return robo;
  } catch (e) {
    const msg = e instanceof MetaErro ? `A Meta recusou: ${e.paraUsuario || e.message}` : e instanceof Error ? e.message : 'Falha desconhecida.';
    console.error('[robo-meta]', professionalId, msg);
    robo = estado('erro', msg, robo);
    await gravarPrograma(professionalId, { robo }).catch(() => {});
    return robo;
  }
}

/** Passada geral (cron): todas que enviaram e ainda não estão no ar. Respeita o tempo. */
export async function rodarRobo(limiteMs = 25_000): Promise<{ vistas: number; no_ar: number }> {
  if (!metaConfigurada()) return { vistas: 0, no_ar: 0 };
  const inicio = Date.now();
  const { programas } = await listarProgramas();
  const fila = programas.filter(p => p.status === 'liberado' && p.plan?.enviado_em && !p.robo?.pausado && p.robo?.etapa !== 'no_ar');
  if (!fila.length) return { vistas: 0, no_ar: 0 };
  const cache = {
    ativos: await listarAtivos(),
    ocupados: new Set(programas.flatMap(p => p.meta ? [p.meta.ad_account_id, p.meta.page_id] : [])),
  };
  let vistas = 0, noAr = 0;
  for (const p of fila) {
    if (Date.now() - inicio > limiteMs) break;
    const r = await passoDoRobo(p.professional_id, cache);
    vistas++;
    if (r?.etapa === 'no_ar') noAr++;
  }
  return { vistas, no_ar: noAr };
}

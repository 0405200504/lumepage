'use server';

/**
 * ============================================================================
 * LUME · Server actions do "Quero mais clientes"
 * ============================================================================
 * Toda action da profissional começa igual:
 *   1. authorizeProfessional(professionalId) — a sessão é dona da conta?
 *   2. a aba está LIBERADA? (só o admin libera, depois do pagamento)
 *   3. a entrada é saneada aqui (tamanhos, listas fechadas, ids da própria conta)
 *
 * As do admin começam por assertAdmin() e terminam em logAdminAction().
 */

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { randomBytes } from 'crypto';
import { authorizeProfessional } from '@/lib/auth/authorize-professional';
import { assertAdmin, adminActionError } from '@/lib/auth/require-admin';
import { logAdminAction } from '@/lib/audit';
import { dbService } from '@/lib/supabase/db';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { isDemo } from '@/lib/demo';
import { rateLimit } from '@/lib/rate-limit';
import {
  lerPrograma, gravarPrograma, definirStatus, salvarArquivo, apagarArquivo, novoCaminho, linkDeEnvio, assinar,
  MIMES_FOTO, MIMES_VIDEO,
} from '@/lib/mais-clientes/store';
import {
  SLOTS, slotInfo, avaliarFoto, sugerirOfertas, normalizarVerba, normalizarTeto, funilPara, raioPadrao,
} from '@/lib/mais-clientes/regras';
import { diagnosticar, DiagnosticoIndisponivel } from '@/lib/mais-clientes/diagnostico';
import { montarRoteiroX1, aplicarNaPersona } from '@/lib/mais-clientes/x1';
import type {
  AssetSlot, CondicaoOferta, GrowthAsset, GrowthDiagnosis, GrowthIntake, GrowthPlan, GrowthProgram, GrowthStatus, OfertaPlano, TipoConexao,
} from '@/types/mais-clientes';

type R<T = object> = ({ success: true } & T) | { success: false; error: string };

const ROTA = '/dashboard/mais-clientes';
const FALHA = 'Não foi possível salvar agora. Tente de novo em instantes.';
const DEMO_MSG = 'Esta é a conta teste: nada aqui é salvo de verdade.';
const CONDICOES: CondicaoOferta[] = ['desconto_primeira', 'combo', 'brinde', 'parcelamento', 'avaliacao_gratis'];
/** Depois de reduzida no celular, a foto chega com bem menos que isso. */
const MAX_FOTO = 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;

/** Liberada e autorizada? Devolve o programa já lido, ou o erro para a tela. */
async function abrir(professionalId: string): Promise<{ ok: true; p: GrowthProgram } | { ok: false; error: string }> {
  if (!await authorizeProfessional(professionalId)) return { ok: false, error: 'Não autorizado.' };
  if (isDemo(professionalId) && isSupabaseConfigured) return { ok: false, error: DEMO_MSG };
  const { programa, disponivel } = await lerPrograma(professionalId, false);
  if (!disponivel) return { ok: false, error: 'O "Quero mais clientes" ainda não foi ativado no banco.' };
  if (programa.status !== 'liberado') return { ok: false, error: 'Esta área é liberada pela equipe Lume depois da contratação.' };
  return { ok: true, p: programa };
}

const texto = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const plano = (p: GrowthProgram): GrowthPlan => p.plan ?? {
  ofertas: [], verba_semanal: 50, teto_automatico: 100, raio_km: raioPadrao(p.intake?.cidade), funil: 'x1', x1_aplicado_em: null, enviado_em: null,
};

// ───────────────────────────── Etapa 1 · Seu negócio ─────────────────────────────

export async function salvarNegocioAction(professionalId: string, input: Partial<GrowthIntake>, concluir: boolean): Promise<R<{ intake: Partial<GrowthIntake> }>> {
  try {
    const a = await abrir(professionalId);
    if (!a.ok) return { success: false, error: a.error };

    const meus = new Set((await dbService.getServicesByProfessional(professionalId)).filter(s => s.is_active).map(s => s.id));
    const foco = (input.servicos_foco ?? []).filter(id => meus.has(id)).slice(0, 3);
    const intake: Partial<GrowthIntake> = {
      ...a.p.intake,
      servicos_foco: foco,
      servico_prioritario: input.servico_prioritario && foco.includes(input.servico_prioritario) ? input.servico_prioritario : foco[0] ?? null,
      instagram: texto(input.instagram, 60).replace(/^@?/, '@').replace(/^@$/, ''),
      google_link: texto(input.google_link, 300),
      whatsapp: texto(input.whatsapp, 30),
      cidade: texto(input.cidade, 80),
      uf: texto(input.uf, 2).toUpperCase(),
      raio_km: input.raio_km ? Math.min(60, Math.max(3, Math.round(Number(input.raio_km)))) : null,
      domicilio: !!input.domicilio,
      diferenciais: texto(input.diferenciais, 500),
      cliente_ideal: texto(input.cliente_ideal, 300),
      condicoes: (input.condicoes ?? []).filter(c => CONDICOES.includes(c)),
      brinde: texto(input.brinde, 80),
      observacoes: texto(input.observacoes, 800),
      concluido_em: concluir ? new Date().toISOString() : a.p.intake.concluido_em ?? null,
    };
    if (concluir && !foco.length) return { success: false, error: 'Escolha pelo menos um serviço para trabalharmos.' };
    await gravarPrograma(professionalId, { intake });
    revalidatePath(ROTA);
    return { success: true, intake };
  } catch (e) {
    console.error('[mais-clientes] salvarNegocio', e);
    return { success: false, error: e instanceof Error && e.message.startsWith('Rode ') ? e.message : FALHA };
  }
}

// ───────────────────────────── Etapa 2 · Fotos e vídeos ─────────────────────────────

function validarSlot(slot: string, serviceId: string | null, foco: string[]): { slot: AssetSlot; service_id: string | null } | null {
  const info = SLOTS.find(s => s.slot === slot);
  if (!info) return null;
  if (info.porServico) return serviceId && foco.includes(serviceId) ? { slot: info.slot, service_id: serviceId } : null;
  return { slot: info.slot, service_id: null };
}

export async function enviarFotoAction(professionalId: string, formData: FormData): Promise<R<{ asset: GrowthAsset }>> {
  try {
    const a = await abrir(professionalId);
    if (!a.ok) return { success: false, error: a.error };
    const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const rl = await rateLimit(`mais-clientes-foto:${professionalId}:${ip}`, 60, 10 * 60 * 1000);
    if (!rl.ok) return { success: false, error: `Muitos envios seguidos. Aguarde ${rl.retryAfterSeconds}s.` };

    const arquivo = formData.get('arquivo');
    if (!(arquivo instanceof File) || !arquivo.size) return { success: false, error: 'Escolha uma foto.' };
    if (!MIMES_FOTO.includes(arquivo.type)) return { success: false, error: 'Formato não aceito. Use JPG, PNG ou WEBP.' };
    if (arquivo.size > MAX_FOTO) return { success: false, error: 'A foto ficou grande demais. Tente outra.' };

    const destino = validarSlot(String(formData.get('slot')), String(formData.get('service_id') || '') || null, a.p.intake.servicos_foco ?? []);
    if (!destino) return { success: false, error: 'Tipo de foto inválido.' };
    const consentimento = formData.get('consentimento') === 'true';
    if (slotInfo(destino.slot).exigeAutorizacao && !consentimento) {
      return { success: false, error: 'Confirme que a cliente autorizou o uso da imagem.' };
    }

    const width = Math.round(Number(formData.get('width')) || 0);
    const height = Math.round(Number(formData.get('height')) || 0);
    const brilho = Number(formData.get('brilho')) || 128;
    const caminho = novoCaminho(professionalId, destino.slot, arquivo.type);
    const path = await salvarArquivo(professionalId, caminho, await arquivo.arrayBuffer(), arquivo.type);

    const asset: GrowthAsset = {
      id: randomBytes(8).toString('hex'), ...destino, path, mime: arquivo.type, width, height, consentimento,
      qualidade: avaliarFoto({ width, height, brilho }), created_at: new Date().toISOString(),
    };
    // "ela", "atendendo" e "espaco" têm uma foto só: a nova substitui a anterior.
    const unicas: AssetSlot[] = ['ela', 'atendendo', 'espaco'];
    const substituidas = a.p.assets.filter(x => unicas.includes(destino.slot) && x.slot === destino.slot);
    const antes = a.p.assets.filter(x => !substituidas.includes(x)
      // antes/depois/resultado: uma por serviço e por tipo.
      && !(x.slot === destino.slot && x.service_id === destino.service_id && destino.slot !== 'video'));
    const removidas = a.p.assets.filter(x => !antes.includes(x));
    await gravarPrograma(professionalId, { assets: [...antes, asset] });
    await Promise.all(removidas.map(x => apagarArquivo(x.path).catch(() => {})));

    const [assinado] = await assinar([asset]);
    revalidatePath(ROTA);
    return { success: true, asset: assinado };
  } catch (e) {
    console.error('[mais-clientes] enviarFoto', e);
    return { success: false, error: e instanceof Error && e.message.startsWith('O armazenamento') ? e.message : 'Não foi possível enviar a foto. Tente de novo.' };
  }
}

/** Vídeo vai direto do celular ao Storage: a action só entrega o link de envio. */
export async function prepararVideoAction(professionalId: string, input: { mime: string; tamanho: number; consentimento: boolean }): Promise<R<{ url: string; token: string; caminho: string }>> {
  try {
    const a = await abrir(professionalId);
    if (!a.ok) return { success: false, error: a.error };
    if (!MIMES_VIDEO.includes(input.mime)) return { success: false, error: 'Envie o vídeo em MP4 ou MOV.' };
    if (input.tamanho > MAX_VIDEO) return { success: false, error: 'O vídeo passou de 50 MB. Mande um trecho menor (até 30 segundos).' };
    if (!input.consentimento) return { success: false, error: 'Confirme que a cliente autorizou o uso da imagem.' };
    const caminho = novoCaminho(professionalId, 'video', input.mime);
    const link = await linkDeEnvio(caminho);
    if (!link) return { success: false, error: 'O envio de vídeo não está disponível agora. Mande o vídeo pelo WhatsApp da equipe Lume.' };
    return { success: true, url: link.url, token: link.token, caminho };
  } catch (e) {
    console.error('[mais-clientes] prepararVideo', e);
    return { success: false, error: 'Não foi possível preparar o envio do vídeo.' };
  }
}

export async function registrarVideoAction(professionalId: string, input: { caminho: string; mime: string }): Promise<R<{ asset: GrowthAsset }>> {
  try {
    const a = await abrir(professionalId);
    if (!a.ok) return { success: false, error: a.error };
    if (!input.caminho.startsWith(`${professionalId}/video/`) || !MIMES_VIDEO.includes(input.mime)) return { success: false, error: 'Vídeo inválido.' };
    const asset: GrowthAsset = {
      id: randomBytes(8).toString('hex'), slot: 'video', service_id: null, path: input.caminho, mime: input.mime,
      consentimento: true, qualidade: { ok: true, avisos: [] }, created_at: new Date().toISOString(),
    };
    await gravarPrograma(professionalId, { assets: [...a.p.assets, asset] });
    const [assinado] = await assinar([asset]);
    revalidatePath(ROTA);
    return { success: true, asset: assinado };
  } catch (e) {
    console.error('[mais-clientes] registrarVideo', e);
    return { success: false, error: FALHA };
  }
}

export async function removerFotoAction(professionalId: string, assetId: string): Promise<R> {
  try {
    const a = await abrir(professionalId);
    if (!a.ok) return { success: false, error: a.error };
    const alvo = a.p.assets.find(x => x.id === assetId);
    if (!alvo) return { success: true };
    await gravarPrograma(professionalId, { assets: a.p.assets.filter(x => x.id !== assetId) });
    await apagarArquivo(alvo.path).catch(() => {});
    revalidatePath(ROTA);
    return { success: true };
  } catch (e) {
    console.error('[mais-clientes] removerFoto', e);
    return { success: false, error: FALHA };
  }
}

// ───────────────────────────── Etapa 3 · Diagnóstico ─────────────────────────────

const diag = (p: GrowthProgram): GrowthDiagnosis => p.diagnosis ?? { conexoes: { meta_parceira: false, google_gerente: false } };

export async function diagnosticarAction(professionalId: string, plataforma: 'instagram' | 'google', formData: FormData): Promise<R<{ diagnosis: GrowthDiagnosis }>> {
  try {
    const a = await abrir(professionalId);
    if (!a.ok) return { success: false, error: a.error };
    if (plataforma !== 'instagram' && plataforma !== 'google') return { success: false, error: 'Plataforma inválida.' };
    const rl = await rateLimit(`mais-clientes-diag:${professionalId}:${plataforma}`, 6, 24 * 60 * 60 * 1000);
    if (!rl.ok) return { success: false, error: 'Você já pediu muitos diagnósticos hoje. Tente de novo amanhã.' };

    const prints: { bytes: Uint8Array; mime: string }[] = [];
    for (const f of formData.getAll('prints').slice(0, 3)) {
      if (f instanceof File && f.size && MIMES_FOTO.includes(f.type) && f.size <= MAX_FOTO) {
        prints.push({ bytes: new Uint8Array(await f.arrayBuffer()), mime: f.type });
      }
    }
    if (!prints.length) return { success: false, error: 'Envie pelo menos um print do perfil.' };

    const servicos = await dbService.getServicesByProfessional(professionalId);
    const pro = await dbService.getProfessionalById(professionalId);
    const foco = a.p.intake.servicos_foco ?? [];
    // Os prints são analisados e descartados: não ficam guardados.
    const resultado = await diagnosticar(plataforma, prints, {
      nome: pro?.brand_name || pro?.name || '',
      cidade: a.p.intake.cidade || pro?.city || '',
      servicos: servicos.filter(s => foco.includes(s.id)).map(s => s.name),
      diferenciais: a.p.intake.diferenciais || '',
      linkAgendamento: pro?.slug ? `${(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')}/${pro.slug}` : '',
      whatsapp: a.p.intake.whatsapp || pro?.whatsapp || '',
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { custoTokens, ...dp } = resultado;
    const diagnosis: GrowthDiagnosis = { ...diag(a.p), [plataforma]: dp };
    await gravarPrograma(professionalId, { diagnosis });
    revalidatePath(ROTA);
    return { success: true, diagnosis };
  } catch (e) {
    console.error('[mais-clientes] diagnosticar', e);
    return { success: false, error: e instanceof DiagnosticoIndisponivel ? e.message : 'Não foi possível analisar agora. Tente de novo em instantes.' };
  }
}

export async function marcarItemAction(professionalId: string, plataforma: 'instagram' | 'google', itemId: string, feito: boolean): Promise<R<{ diagnosis: GrowthDiagnosis }>> {
  try {
    const a = await abrir(professionalId);
    if (!a.ok) return { success: false, error: a.error };
    const d = diag(a.p);
    const alvo = d[plataforma];
    if (!alvo) return { success: false, error: 'Faça o diagnóstico primeiro.' };
    const diagnosis: GrowthDiagnosis = { ...d, [plataforma]: { ...alvo, itens: alvo.itens.map(i => i.id === itemId ? { ...i, feito } : i) } };
    await gravarPrograma(professionalId, { diagnosis });
    return { success: true, diagnosis };
  } catch (e) {
    console.error('[mais-clientes] marcarItem', e);
    return { success: false, error: FALHA };
  }
}

export async function marcarConexaoAction(professionalId: string, tipo: TipoConexao, feito: boolean): Promise<R<{ diagnosis: GrowthDiagnosis }>> {
  try {
    const a = await abrir(professionalId);
    if (!a.ok) return { success: false, error: a.error };
    if (!['meta_parceira', 'google_gerente', 'conta_anuncios'].includes(tipo)) return { success: false, error: 'Inválido.' };
    const d = diag(a.p);
    const diagnosis: GrowthDiagnosis = { ...d, conexoes: { ...d.conexoes, [tipo]: !!feito } };
    await gravarPrograma(professionalId, { diagnosis });
    revalidatePath(ROTA);
    return { success: true, diagnosis };
  } catch (e) {
    console.error('[mais-clientes] marcarConexao', e);
    return { success: false, error: FALHA };
  }
}

// ───────────────────────────── Etapa 4 · Estruturação ─────────────────────────────

export async function gerarOfertasAction(professionalId: string): Promise<R<{ plan: GrowthPlan }>> {
  try {
    const a = await abrir(professionalId);
    if (!a.ok) return { success: false, error: a.error };
    const servicos = (await dbService.getServicesByProfessional(professionalId)).filter(s => s.is_active);
    const foco = (a.p.intake.servicos_foco ?? []).map(id => servicos.find(s => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s);
    if (!foco.length) return { success: false, error: 'Escolha os serviços em "Seu negócio" primeiro.' };
    const ofertas = sugerirOfertas(foco, servicos, a.p.intake.condicoes ?? [], a.p.intake.brinde ?? '');
    const plan: GrowthPlan = { ...plano(a.p), ofertas, x1_aplicado_em: null, enviado_em: null };
    await gravarPrograma(professionalId, { plan });
    revalidatePath(ROTA);
    return { success: true, plan };
  } catch (e) {
    console.error('[mais-clientes] gerarOfertas', e);
    return { success: false, error: FALHA };
  }
}

export async function salvarOfertaAction(
  professionalId: string,
  serviceId: string,
  edicao: { titulo: string; detalhe: string; preco_oferta_cents: number | null; aprovada: boolean },
): Promise<R<{ plan: GrowthPlan }>> {
  try {
    const a = await abrir(professionalId);
    if (!a.ok) return { success: false, error: a.error };
    const atual = plano(a.p);
    if (!atual.ofertas.some(o => o.service_id === serviceId)) return { success: false, error: 'Oferta não encontrada.' };
    const preco = edicao.preco_oferta_cents == null ? null : Math.max(0, Math.round(Number(edicao.preco_oferta_cents)));
    const ofertas: OfertaPlano[] = atual.ofertas.map(o => o.service_id !== serviceId ? o : {
      ...o,
      titulo: texto(edicao.titulo, 120) || o.titulo,
      detalhe: texto(edicao.detalhe, 200) || o.detalhe,
      preco_oferta_cents: Number.isFinite(preco as number) ? preco : null,
      aprovada: !!edicao.aprovada,
    });
    // Oferta mudou: o roteiro do bot e o envio à equipe precisam ser refeitos.
    const plan: GrowthPlan = { ...atual, ofertas, x1_aplicado_em: null, enviado_em: null };
    await gravarPrograma(professionalId, { plan });
    revalidatePath(ROTA);
    return { success: true, plan };
  } catch (e) {
    console.error('[mais-clientes] salvarOferta', e);
    return { success: false, error: FALHA };
  }
}

export async function salvarVerbaAction(professionalId: string, input: { verba_semanal: number; teto_automatico: number; raio_km: number }): Promise<R<{ plan: GrowthPlan }>> {
  try {
    const a = await abrir(professionalId);
    if (!a.ok) return { success: false, error: a.error };
    const verba = normalizarVerba(input.verba_semanal);
    const plan: GrowthPlan = {
      ...plano(a.p),
      verba_semanal: verba,
      teto_automatico: normalizarTeto(input.teto_automatico, verba),
      raio_km: Math.min(60, Math.max(3, Math.round(Number(input.raio_km) || raioPadrao(a.p.intake.cidade)))),
      funil: funilPara(verba),
      enviado_em: null,
    };
    await gravarPrograma(professionalId, { plan });
    revalidatePath(ROTA);
    return { success: true, plan };
  } catch (e) {
    console.error('[mais-clientes] salvarVerba', e);
    return { success: false, error: FALHA };
  }
}

/** Grava o roteiro do X1 como bloco na persona do bot do WhatsApp dela. */
export async function aplicarX1Action(professionalId: string): Promise<R<{ plan: GrowthPlan }>> {
  try {
    const a = await abrir(professionalId);
    if (!a.ok) return { success: false, error: a.error };
    const atual = plano(a.p);
    if (!atual.ofertas.some(o => o.aprovada)) return { success: false, error: 'Aprove pelo menos uma oferta antes.' };
    const pro = await dbService.getProfessionalById(professionalId);
    const nome = pro?.brand_name || pro?.name || 'profissional';
    const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
    const roteiro = montarRoteiroX1({ nome, linkAgendamento: pro?.slug && base ? `${base}/${pro.slug}` : '', ofertas: atual.ofertas });

    if (isSupabaseConfigured) {
      const ws = await dbService.getWhatsAppSettings(professionalId);
      if (!ws) return { success: false, error: 'Conecte o WhatsApp do Lume primeiro (aba Mensagens automáticas).' };
      await dbService.upsertWhatsAppSettings(professionalId, { bot_persona: aplicarNaPersona(ws.bot_persona, roteiro.bloco, nome) });
    }
    const plan: GrowthPlan = { ...atual, x1_aplicado_em: new Date().toISOString() };
    await gravarPrograma(professionalId, { plan });
    revalidatePath(ROTA);
    return { success: true, plan };
  } catch (e) {
    console.error('[mais-clientes] aplicarX1', e);
    return { success: false, error: e instanceof Error && e.message.startsWith('Rode ') ? e.message : FALHA };
  }
}

/** Fecha a estruturação: a equipe recebe tudo para colocar no ar. */
export async function enviarParaEquipeAction(professionalId: string): Promise<R<{ plan: GrowthPlan }>> {
  try {
    const a = await abrir(professionalId);
    if (!a.ok) return { success: false, error: a.error };
    const atual = plano(a.p);
    if (!atual.ofertas.some(o => o.aprovada)) return { success: false, error: 'Aprove pelo menos uma oferta.' };
    if (!a.p.plan?.verba_semanal) return { success: false, error: 'Escolha a verba semanal.' };
    const plan: GrowthPlan = { ...atual, enviado_em: new Date().toISOString() };
    await gravarPrograma(professionalId, { plan });
    revalidatePath(ROTA);
    revalidatePath(`/admin/professionals/${professionalId}`);
    revalidatePath('/admin/mais-clientes');
    return { success: true, plan };
  } catch (e) {
    console.error('[mais-clientes] enviarParaEquipe', e);
    return { success: false, error: FALHA };
  }
}

// ───────────────────────────── Admin ─────────────────────────────

export async function definirStatusMaisClientesAction(professionalId: string, status: GrowthStatus): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await assertAdmin();
    if (status !== 'liberado' && status !== 'bloqueado') return { success: false, error: 'Status inválido.' };
    const { programa: antes } = await lerPrograma(professionalId, false);
    await definirStatus(professionalId, status, admin.email);
    await logAdminAction({
      action: status === 'liberado' ? 'mais_clientes.liberar' : 'mais_clientes.bloquear',
      entityType: 'professional', entityId: professionalId,
      before: { status: antes.status }, after: { status },
    });
    revalidatePath(`/admin/professionals/${professionalId}`);
    revalidatePath('/admin/mais-clientes');
    revalidatePath(ROTA);
    return { success: true };
  } catch (e) {
    return adminActionError(e, 'Não foi possível alterar o acesso ao "Quero mais clientes".');
  }
}

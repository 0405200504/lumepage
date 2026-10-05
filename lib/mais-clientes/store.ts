/**
 * Persistência do "Quero mais clientes" (tabela growth_programs, v48) e das
 * fotos (bucket privado lume-growth).
 *
 * Só roda no servidor. Quem chama já passou por authorizeProfessional (painel)
 * ou assertAdmin (admin): aqui não há checagem de sessão.
 *
 * Sem Supabase configurado (modo local de teste, `mockDb`), tudo vive em
 * memória do processo e as fotos viram data URL. Serve para ver as telas
 * funcionando sem tocar em banco nenhum.
 */

import { randomBytes } from 'crypto';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/client';
import { isMissingTable } from '@/lib/admin/crm';
import type { GrowthAsset, GrowthProgram, GrowthStatus } from '@/types/mais-clientes';

export const BUCKET = 'lume-growth';
export const MIGRACAO = 'supabase/migration_v48_mais_clientes.sql';
/** Validade das URLs assinadas das fotos (segundos). */
const URL_VALIDADE = 60 * 60;

const memoria = new Map<string, GrowthProgram>();
const modoLocal = () => !isSupabaseConfigured || !getSupabaseAdmin();

export const programaVazio = (professionalId: string): GrowthProgram => ({
  professional_id: professionalId,
  status: 'bloqueado',
  unlocked_at: null,
  unlocked_by: null,
  intake: {},
  assets: [],
  diagnosis: null,
  plan: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

/** A migração v48 foi rodada? Sem ela a aba mostra a vitrine e o admin avisa. */
export type Leitura = { programa: GrowthProgram; disponivel: boolean };

export async function lerPrograma(professionalId: string, comUrls = true): Promise<Leitura> {
  if (modoLocal()) {
    return { programa: memoria.get(professionalId) ?? programaVazio(professionalId), disponivel: true };
  }
  const { data, error } = await getSupabaseAdmin()!
    .from('growth_programs')
    .select('*')
    .eq('professional_id', professionalId)
    .maybeSingle();
  if (error) {
    if (isMissingTable(error)) return { programa: programaVazio(professionalId), disponivel: false };
    throw error;
  }
  const programa = (data as GrowthProgram | null) ?? programaVazio(professionalId);
  programa.assets = Array.isArray(programa.assets) ? programa.assets : [];
  programa.intake = programa.intake ?? {};
  if (comUrls) programa.assets = await assinar(programa.assets);
  return { programa, disponivel: true };
}

type Patch = Partial<Pick<GrowthProgram, 'status' | 'unlocked_at' | 'unlocked_by' | 'intake' | 'assets' | 'diagnosis' | 'plan'>>;

/** Grava só as colunas do patch. As URLs assinadas nunca vão para o banco. */
export async function gravarPrograma(professionalId: string, patch: Patch): Promise<GrowthProgram> {
  const limpo: Patch = { ...patch };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  if (limpo.assets) limpo.assets = limpo.assets.map(({ url, ...a }) => a);

  if (modoLocal()) {
    const atual = memoria.get(professionalId) ?? programaVazio(professionalId);
    const novo: GrowthProgram = { ...atual, ...patch, updated_at: new Date().toISOString() };
    memoria.set(professionalId, novo);
    return novo;
  }
  const { data, error } = await getSupabaseAdmin()!
    .from('growth_programs')
    .upsert({ professional_id: professionalId, ...limpo, updated_at: new Date().toISOString() }, { onConflict: 'professional_id' })
    .select()
    .single();
  if (error) {
    if (isMissingTable(error)) throw new Error(`Rode ${MIGRACAO} no Supabase para ativar o "Quero mais clientes".`);
    throw error;
  }
  return data as GrowthProgram;
}

export async function definirStatus(professionalId: string, status: GrowthStatus, por: string): Promise<GrowthProgram> {
  return gravarPrograma(professionalId, status === 'liberado'
    ? { status, unlocked_at: new Date().toISOString(), unlocked_by: por }
    : { status, unlocked_at: null, unlocked_by: null });
}

/** Todas as linhas (admin): quem está liberada e em que pé está. */
export async function listarProgramas(): Promise<{ programas: GrowthProgram[]; disponivel: boolean }> {
  if (modoLocal()) return { programas: [...memoria.values()], disponivel: true };
  const { data, error } = await getSupabaseAdmin()!.from('growth_programs').select('*');
  if (error) return { programas: [], disponivel: !isMissingTable(error) };
  return { programas: (data || []) as GrowthProgram[], disponivel: true };
}

// ───────────────────────────── Arquivos ─────────────────────────────

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/quicktime': 'mov' };
export const MIMES_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
export const MIMES_VIDEO = ['video/mp4', 'video/quicktime'];

/** Caminho sempre dentro da pasta da profissional autorizada. */
export function novoCaminho(professionalId: string, slot: string, mime: string): string {
  return `${professionalId}/${slot}/${Date.now().toString(36)}-${randomBytes(6).toString('hex')}.${EXT[mime] ?? 'bin'}`;
}

export async function salvarArquivo(professionalId: string, caminho: string, bytes: ArrayBuffer, mime: string): Promise<string> {
  if (modoLocal()) return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
  const { error } = await getSupabaseAdmin()!.storage.from(BUCKET).upload(caminho, bytes, { contentType: mime, upsert: false });
  if (error) {
    if (/bucket|not found/i.test(error.message || '')) throw new Error(`O armazenamento das fotos ainda não foi ativado. Rode ${MIGRACAO} no Supabase.`);
    throw error;
  }
  return caminho;
}

/** Link de envio direto (vídeo): o arquivo vai do celular ao Storage sem passar pela action. */
export async function linkDeEnvio(caminho: string): Promise<{ url: string; token: string } | null> {
  if (modoLocal()) return null;
  const { data, error } = await getSupabaseAdmin()!.storage.from(BUCKET).createSignedUploadUrl(caminho);
  if (error || !data) return null;
  return { url: data.signedUrl, token: data.token };
}

export async function apagarArquivo(caminho: string): Promise<void> {
  if (modoLocal() || caminho.startsWith('data:')) return;
  await getSupabaseAdmin()!.storage.from(BUCKET).remove([caminho]);
}

/** Preenche `url` com links assinados de curta duração (bucket privado). */
export async function assinar(assets: GrowthAsset[]): Promise<GrowthAsset[]> {
  if (!assets.length) return assets;
  if (modoLocal()) return assets.map(a => ({ ...a, url: a.path }));
  const caminhos = assets.map(a => a.path).filter(p => !p.startsWith('data:'));
  const { data } = await getSupabaseAdmin()!.storage.from(BUCKET).createSignedUrls(caminhos, URL_VALIDADE);
  const porCaminho = new Map((data || []).map(d => [d.path, d.signedUrl]));
  return assets.map(a => ({ ...a, url: a.path.startsWith('data:') ? a.path : porCaminho.get(a.path) ?? undefined }));
}

/** Bytes de uma foto já enviada (para o diagnóstico mandar à IA). */
export async function baixarArquivo(caminho: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  if (caminho.startsWith('data:')) {
    const m = caminho.match(/^data:([^;]+);base64,(.*)$/);
    return m ? { bytes: Buffer.from(m[2], 'base64'), mime: m[1] } : null;
  }
  if (modoLocal()) return null;
  const { data, error } = await getSupabaseAdmin()!.storage.from(BUCKET).download(caminho);
  if (error || !data) return null;
  return { bytes: new Uint8Array(await data.arrayBuffer()), mime: data.type || 'image/jpeg' };
}

/** Configurações globais usadas pela aba (admin → Configurações). */
export async function lerConfiguracoes(): Promise<{ linkCall: string; whatsappSuporte: string }> {
  if (modoLocal()) return { linkCall: '', whatsappSuporte: '' };
  const { data } = await getSupabaseAdmin()!.from('app_settings').select('key, value').in('key', ['growth_call_url', 'support_whatsapp']);
  const v = (k: string) => String((data || []).find((r: { key: string }) => r.key === k)?.value ?? '').trim();
  return { linkCall: v('growth_call_url'), whatsappSuporte: v('support_whatsapp') };
}

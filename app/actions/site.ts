'use server';

/**
 * ============================================================================
 * LUME · Server actions de "Minha Página"
 * ============================================================================
 * Toda escrita da página passa por aqui, e toda escrita começa igual:
 *
 *   1. `authorize(professionalId)` — a sessão é dona daquela profissional?
 *   2. `normalizeConfig(...)`      — o conteúdo é saneado (XSS, limites, URLs)
 *   3. grava escopado por professional_id
 *
 * O cliente manda o `professionalId` por conveniência, mas ele NUNCA é usado
 * sem passar pelo passo 1 — e o caminho dos arquivos no Storage é montado a
 * partir do id autorizado, não do que veio no request. Profissional A não
 * alcança dado nem arquivo da profissional B.
 */

import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { dbService } from '@/lib/supabase/db';
import { authorizeProfessional } from '@/lib/auth/authorize-professional';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { isDemo } from '@/lib/demo';
import { rateLimit, ipFromHeaders } from '@/lib/rate-limit';
import { normalizeConfig, defaultSiteConfig, type SiteSeedProfessional } from '@/lib/site/config';
import { isValidTemplateId, DEFAULT_TEMPLATE_ID } from '@/lib/site/templates';
import { validateSlug } from '@/lib/site/slug';
import type { SiteConfig } from '@/types/site';

const STORAGE_BUCKET = 'lume-sites';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB (mesmo teto do bucket)
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

/** Mensagem amigável — a profissional nunca vê stack trace nem erro do Postgres. */
const FRIENDLY = 'Não foi possível salvar agora. Tente de novo em instantes.';

/**
 * A conta teste (Amanda Costa) existe para explorar o sistema: ela LÊ dados
 * reais mas nenhuma escrita persiste. O editor inteiro funciona nela — dá para
 * trocar de modelo, mexer nas cores e ver a prévia ao vivo.
 *
 * O que NÃO pode acontecer é a conta teste dizer "sua página está no ar": a
 * página não existiria, o link daria 404, e a pessoa só descobriria depois.
 * Então tudo que produz um efeito VISÍVEL PARA FORA (publicar, tirar do ar,
 * trocar o endereço, subir imagem) recusa e explica o porquê, em vez de fingir
 * que deu certo.
 */
const DEMO_MSG = 'Esta é a conta teste, então nada aqui é salvo de verdade. Entre com a sua conta da Lume para publicar a sua página.';

type Result<T = unknown> = { success: true } & T | { success: false; error: string };

/**
 * A sessão atual pode agir sobre esta profissional?
 * Mesma regra já usada em professional.ts / anamnesis.ts — sem sistema paralelo.
 */
/** Autorização compartilhada (admin, a própria profissional ou gerente do salão dela). */
const authorize = authorizeProfessional;

/** Campos da conta que pré-preenchem a página (nada é perguntado duas vezes). */
async function seedFrom(professionalId: string): Promise<SiteSeedProfessional | undefined> {
  const prof = await dbService.getProfessionalById(professionalId).catch(() => null);
  return prof ?? undefined;
}

/**
 * Estado atual da página para o editor. Se a profissional nunca entrou aqui,
 * devolve um rascunho novo já pré-preenchido com os dados da conta — sem
 * gravar nada no banco (só grava quando ela salvar de fato).
 */
export async function getSiteAction(professionalId: string) {
  try {
    if (!await authorize(professionalId)) return { success: false as const, error: 'Não autorizado.' };

    const [site, prof] = await Promise.all([
      dbService.getProfessionalSite(professionalId),
      dbService.getProfessionalById(professionalId),
    ]);

    if (!site) {
      return {
        success: true as const,
        exists: false,
        migrationPending: !prof ? false : true,
        templateId: DEFAULT_TEMPLATE_ID,
        status: 'draft' as const,
        draftConfig: defaultSiteConfig(DEFAULT_TEMPLATE_ID, prof ?? undefined),
        publishedAt: null,
        slug: prof?.slug ?? '',
      };
    }

    return {
      success: true as const,
      exists: true,
      migrationPending: false,
      templateId: site.template_id,
      status: site.status,
      draftConfig: normalizeConfig(site.draft_config, site.template_id, prof ?? undefined),
      publishedAt: site.published_at,
      slug: prof?.slug ?? '',
    };
  } catch {
    return { success: false as const, error: 'Não foi possível carregar sua página.' };
  }
}

/**
 * Salva o RASCUNHO. Não mexe no que está publicado — a página no ar só muda
 * quando a profissional clicar em "Publicar".
 */
export async function saveSiteDraftAction(
  professionalId: string,
  input: { templateId?: string; config: SiteConfig },
): Promise<Result<{ config: SiteConfig; templateId: string }>> {
  try {
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    if (isDemo(professionalId)) {
      // Conta demo lê, mas não persiste (volta ao estado inicial ao recarregar).
      const templateId = isValidTemplateId(input.templateId) ? input.templateId : DEFAULT_TEMPLATE_ID;
      return { success: true, config: normalizeConfig(input.config, templateId), templateId };
    }

    const current = await dbService.getProfessionalSite(professionalId);
    const templateId = isValidTemplateId(input.templateId)
      ? input.templateId
      : (current?.template_id && isValidTemplateId(current.template_id) ? current.template_id : DEFAULT_TEMPLATE_ID);

    const config = normalizeConfig(input.config, templateId, await seedFrom(professionalId));

    const saved = await dbService.upsertProfessionalSite(professionalId, {
      template_id: templateId,
      draft_config: config,
      // Página nova nasce como rascunho; publicada continua publicada.
      ...(current ? {} : { status: 'draft' as const }),
    });

    if (!saved) {
      return {
        success: false,
        error: 'O módulo de páginas ainda não foi ativado no banco. Rode a migração v30 no Supabase.',
      };
    }

    revalidatePath('/dashboard/site');
    return { success: true, config, templateId };
  } catch {
    return { success: false, error: FRIENDLY };
  }
}

/**
 * PUBLICA: copia o rascunho para `published_config`. A partir daqui a página
 * pública passa a mostrar exatamente esta versão.
 */
export async function publishSiteAction(
  professionalId: string,
  input?: { config?: SiteConfig; templateId?: string },
): Promise<Result<{ url: string }>> {
  try {
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };

    if (isDemo(professionalId)) return { success: false, error: DEMO_MSG };

    const prof = await dbService.getProfessionalById(professionalId);
    if (!prof) return { success: false, error: 'Não foi possível publicar. Tente novamente.' };

    // Salva o rascunho mais recente antes de publicar (evita publicar versão velha).
    if (input?.config) {
      const saved = await saveSiteDraftAction(professionalId, {
        config: input.config,
        templateId: input.templateId,
      });
      if (!saved.success) return saved;
    }

    const site = await dbService.getProfessionalSite(professionalId);
    if (!site) {
      return {
        success: false,
        error: 'O módulo de páginas ainda não foi ativado no banco. Rode a migração v30 no Supabase.',
      };
    }

    const config = normalizeConfig(site.draft_config, site.template_id, prof);
    const published = await dbService.setProfessionalSiteStatus(professionalId, 'published', config);
    // Só dizemos "está no ar" depois de reler a linha e ver que ela realmente
    // está publicada COM conteúdo. Nunca comemorar por otimismo.
    if (!published || published.status !== 'published' || !published.published_config) {
      return { success: false, error: 'Não foi possível publicar suas alterações. Tente novamente.' };
    }

    revalidatePath('/dashboard/site');
    revalidatePath(`/${prof.slug}`);
    return { success: true, url: `/${prof.slug}` };
  } catch {
    return { success: false, error: 'Não foi possível publicar suas alterações. Tente novamente.' };
  }
}

/** Tira a página do ar sem apagar nada — o rascunho e o conteúdo continuam lá. */
export async function unpublishSiteAction(professionalId: string): Promise<Result> {
  try {
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    if (isDemo(professionalId)) return { success: false, error: DEMO_MSG };

    const prof = await dbService.getProfessionalById(professionalId);
    const updated = await dbService.setProfessionalSiteStatus(professionalId, 'unpublished');
    if (!updated) return { success: false, error: FRIENDLY };

    revalidatePath('/dashboard/site');
    if (prof?.slug) revalidatePath(`/${prof.slug}`);
    return { success: true };
  } catch {
    return { success: false, error: FRIENDLY };
  }
}

/**
 * Troca o endereço público. Como o slug é o MESMO campo usado por
 * /agendar/<slug>, mudar aqui muda os dois — de propósito: um endereço só.
 */
export async function updateSiteSlugAction(
  professionalId: string,
  rawSlug: string,
): Promise<Result<{ slug: string }>> {
  try {
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };

    const check = validateSlug(rawSlug);
    if (!check.ok) return { success: false, error: check.error || 'Endereço inválido.' };
    if (isDemo(professionalId)) return { success: false, error: DEMO_MSG };

    const prof = await dbService.getProfessionalById(professionalId);
    if (!prof) return { success: false, error: FRIENDLY };
    if (prof.slug === check.slug) return { success: true, slug: check.slug };

    const taken = await dbService.isSlugTaken(check.slug, professionalId);
    if (taken) {
      return { success: false, error: 'Esse endereço já está sendo usado. Tente outro.' };
    }

    const oldSlug = prof.slug;
    await dbService.upsertProfessional({ id: professionalId, slug: check.slug });

    revalidatePath('/dashboard/site');
    revalidatePath(`/${check.slug}`);
    if (oldSlug) revalidatePath(`/${oldSlug}`);
    return { success: true, slug: check.slug };
  } catch (e: unknown) {
    // Corrida entre duas profissionais pedindo o mesmo slug: o UNIQUE do banco decide.
    const msg = e instanceof Error ? e.message : '';
    if (/duplicate key|unique/i.test(msg)) {
      return { success: false, error: 'Esse endereço acabou de ser reservado por outra pessoa. Tente outro.' };
    }
    return { success: false, error: FRIENDLY };
  }
}

// ============================================================================
// Imagens
// ============================================================================

/**
 * Sobe uma imagem para o Storage. O arquivo SEMPRE cai em
 * `<professional_id>/...` — o prefixo vem do id autorizado no servidor, então
 * não existe caminho em que uma profissional escreva na pasta de outra.
 */
export async function uploadSiteImageAction(
  professionalId: string,
  formData: FormData,
): Promise<Result<{ url: string }>> {
  try {
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    if (isDemo(professionalId)) return { success: false, error: DEMO_MSG };

    // Trava de abuso: 60 uploads por 10 min por IP.
    const ip = ipFromHeaders(await headers());
    const rl = await rateLimit(`site-upload:${ip}`, 60, 10 * 60 * 1000);
    if (!rl.ok) {
      return { success: false, error: `Muitos envios seguidos. Aguarde ${rl.retryAfterSeconds}s e tente de novo.` };
    }

    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: 'Escolha uma imagem para enviar.' };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { success: false, error: 'A imagem é muito grande. Envie um arquivo de até 5 MB.' };
    }
    const ext = ALLOWED_MIME[file.type];
    if (!ext) {
      return { success: false, error: 'Formato não aceito. Use JPG, PNG, WEBP ou AVIF.' };
    }

    const rawKind = String(formData.get('kind') || 'geral');
    const kind = /^[a-z-]{1,20}$/.test(rawKind) ? rawKind : 'geral';

    const admin = getSupabaseAdmin();
    if (!admin) return { success: false, error: 'O envio de imagens está indisponível no momento.' };

    const path = `${professionalId}/${kind}/${Date.now().toString(36)}-${randomBytes(6).toString('hex')}.${ext}`;
    const { error } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });

    if (error) {
      const notFound = /bucket|not found/i.test(error.message || '');
      return {
        success: false,
        error: notFound
          ? 'O armazenamento de imagens ainda não foi ativado. Rode a migração v30 no Supabase.'
          : 'Não foi possível enviar a imagem. Tente novamente.',
      };
    }

    const { data } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) return { success: false, error: 'Não foi possível enviar a imagem. Tente novamente.' };

    return { success: true, url: data.publicUrl };
  } catch {
    return { success: false, error: 'Não foi possível enviar a imagem. Tente novamente.' };
  }
}

/**
 * Apaga uma imagem do Storage. Só remove arquivo que está dentro da pasta da
 * própria profissional — URL de outra pasta é recusada aqui, no servidor.
 */
export async function deleteSiteImageAction(
  professionalId: string,
  url: string,
): Promise<Result> {
  try {
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    if (isDemo(professionalId)) return { success: true };

    const marker = `/${STORAGE_BUCKET}/`;
    const idx = (url || '').indexOf(marker);
    if (idx === -1) return { success: true }; // não é arquivo nosso: nada a apagar

    const path = decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
    if (!path.startsWith(`${professionalId}/`) || path.includes('..')) {
      return { success: false, error: 'Não autorizado.' };
    }

    const admin = getSupabaseAdmin();
    if (!admin) return { success: true };
    await admin.storage.from(STORAGE_BUCKET).remove([path]);
    return { success: true };
  } catch {
    // Falhar em apagar o arquivo não pode travar a edição da página.
    return { success: true };
  }
}

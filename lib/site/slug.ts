/**
 * ============================================================================
 * LUME · Slug da página pública (lume.com.br/<slug>)
 * ============================================================================
 * O slug NÃO é um campo novo: é o mesmo `professionals.slug` que já serve
 * /agendar/<slug> desde sempre. Uma única fonte da verdade, um único endereço
 * por profissional.
 *
 * Como a página mora na raiz do domínio, o slug disputa espaço com as rotas do
 * próprio app. Por isso a lista de palavras reservadas abaixo é derivada das
 * rotas reais de app/ — qualquer segmento de primeiro nível existente entra
 * aqui, mais os nomes que provavelmente viraremos rota no futuro.
 *
 * Puro (sem servidor): o editor valida enquanto a profissional digita, e a
 * action valida de novo antes de gravar.
 */

/** Segmentos que a profissional NUNCA pode usar como slug. */
export const RESERVED_SLUGS = new Set<string>([
  // Rotas reais de app/ hoje
  'admin', 'admin-login', 'login', 'register', 'dashboard', 'agendar', 'ficha',
  'lp', 'privacidade', 'termos', 'auth', 'salon', 'api', 'embed',
  // Arquivos estáticos servidos de public/
  'sw', 'manifest', 'favicon', 'robots', 'sitemap', 'icon-192', 'icon-512',
  'apple-touch-icon', 'embed-exemplo',
  // Reservas de futuro / marca / genéricos perigosos
  'lume', 'app', 'www', 'blog', 'ajuda', 'suporte', 'contato', 'sobre',
  'planos', 'precos', 'checkout', 'pagamento', 'conta', 'perfil', 'config',
  'configuracoes', 'settings', 'signup', 'signin', 'logout', 'sair',
  'novo', 'new', 'edit', 'editar', 'preview', 'p', 'site', 'sites',
  'static', '_next', 'assets', 'images', 'img', 'public', 'cdn',
  'null', 'undefined', 'true', 'false',
]);

export const SLUG_MIN = 3;
export const SLUG_MAX = 40;

/**
 * Normaliza o que a profissional digitou em um slug candidato:
 * minúsculas, sem acento, espaços viram hífen, resto some.
 * (Case insensitive por construção: guardamos sempre em minúsculas.)
 */
export function normalizeSlug(input: string): string {
  return (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // tira acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')     // espaços e símbolos viram hífen
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX);
}

export interface SlugCheck {
  ok: boolean;
  slug: string;
  /** Mensagem pronta para a profissional (sem jargão técnico). */
  error?: string;
}

/** Valida o formato do slug. A checagem de "já existe" é feita no servidor. */
export function validateSlug(input: string): SlugCheck {
  const slug = normalizeSlug(input);

  if (!slug) {
    return { ok: false, slug, error: 'Escolha um endereço para a sua página.' };
  }
  if (slug.length < SLUG_MIN) {
    return { ok: false, slug, error: `O endereço precisa ter pelo menos ${SLUG_MIN} letras.` };
  }
  if (slug.length > SLUG_MAX) {
    return { ok: false, slug, error: `O endereço pode ter no máximo ${SLUG_MAX} letras.` };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, slug, error: 'Esse endereço é reservado pelo sistema. Escolha outro.' };
  }
  if (/^\d+$/.test(slug)) {
    return { ok: false, slug, error: 'O endereço não pode ser só números.' };
  }
  if (slug.startsWith('_') || slug.startsWith('.')) {
    return { ok: false, slug, error: 'O endereço não pode começar com _ ou ponto.' };
  }
  return { ok: true, slug };
}

/** URL completa da página pública (usada nos botões de copiar link e no SEO). */
export function siteUrl(baseUrl: string, slug: string): string {
  const base = (baseUrl || '').replace(/\/+$/, '');
  return `${base}/${slug}`;
}

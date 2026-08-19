/**
 * PARÂMETROS DE URL DAS TELAS DE LISTA (/admin)
 * ---------------------------------------------
 * Filtro, busca, ordenação, período e paginação vivem na URL — não no estado do
 * cliente. Isso é o que permite: fazer o recorte no banco (nunca carregar 340 linhas
 * no DOM), compartilhar/favoritar uma visão filtrada, voltar sem perder o filtro e
 * exportar exatamente o que está na tela (o CSV recebe a mesma query string).
 */

/** searchParams como o Next entrega em páginas de App Router. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

export const PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
const DEFAULT_PAGE_SIZE: PageSize = 25;

export type SortDir = 'asc' | 'desc';

/** Presets do <DateRangeFilter>. `all` = sem recorte, `custom` = from/to na URL. */
export const RANGE_PRESETS = [
  { key: 'today', label: 'Hoje' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: 'month', label: 'Este mês' },
  { key: 'last-month', label: 'Mês passado' },
  { key: '90d', label: '90 dias' },
  { key: 'year', label: 'Este ano' },
  { key: 'all', label: 'Tudo' },
] as const;

export type RangeKey = (typeof RANGE_PRESETS)[number]['key'] | 'custom';

export interface TableParams {
  page: number;          // 1-based
  pageSize: PageSize;
  sort: string | null;
  dir: SortDir;
  q: string;
  /** Recorte de período resolvido em datas YYYY-MM-DD (null = sem limite). */
  range: RangeKey;
  from: string | null;
  to: string | null;
  /** Filtros livres da tela (status=, plan=, prof=…), já normalizados. */
  filters: Record<string, string>;
}

const first = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? '';

/** Data local (não UTC) em YYYY-MM-DD — evita o off-by-one de toISOString(). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const isISODate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Converte um preset em intervalo de datas fechado [from, to]. */
export function resolveRange(
  range: RangeKey,
  from: string | null,
  to: string | null,
  today = new Date(),
): { from: string | null; to: string | null } {
  const d = (offsetDays: number) => {
    const x = new Date(today);
    x.setDate(x.getDate() + offsetDays);
    return toISODate(x);
  };

  switch (range) {
    case 'today': return { from: toISODate(today), to: toISODate(today) };
    case '7d': return { from: d(-6), to: toISODate(today) };
    case '30d': return { from: d(-29), to: toISODate(today) };
    case '90d': return { from: d(-89), to: toISODate(today) };
    case 'month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: toISODate(start), to: toISODate(today) };
    }
    case 'last-month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: toISODate(start), to: toISODate(end) };
    }
    case 'year': {
      const start = new Date(today.getFullYear(), 0, 1);
      return { from: toISODate(start), to: toISODate(today) };
    }
    case 'custom': return { from, to };
    case 'all':
    default: return { from: null, to: null };
  }
}

/**
 * Lê os parâmetros de uma tela de lista.
 * `filterKeys` são os filtros próprios daquela tela (ex.: ['status', 'plan']).
 */
export function parseTableParams(
  raw: RawSearchParams | undefined,
  options: { filterKeys?: string[]; defaultSort?: string; defaultDir?: SortDir; defaultRange?: RangeKey } = {},
): TableParams {
  const sp = raw ?? {};

  const pageRaw = parseInt(first(sp.page), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const sizeRaw = parseInt(first(sp.size), 10) as PageSize;
  const pageSize = (PAGE_SIZES as readonly number[]).includes(sizeRaw) ? sizeRaw : DEFAULT_PAGE_SIZE;

  const dirRaw = first(sp.dir);
  const dir: SortDir = dirRaw === 'asc' || dirRaw === 'desc' ? dirRaw : (options.defaultDir ?? 'desc');
  const sort = first(sp.sort) || options.defaultSort || null;

  const fromRaw = first(sp.from);
  const toRaw = first(sp.to);
  const rangeRaw = first(sp.range) as RangeKey;
  const knownRange = rangeRaw === 'custom' || RANGE_PRESETS.some(p => p.key === rangeRaw);
  const range: RangeKey = knownRange
    ? rangeRaw
    : (isISODate(fromRaw) || isISODate(toRaw) ? 'custom' : (options.defaultRange ?? 'all'));

  const resolved = resolveRange(
    range,
    isISODate(fromRaw) ? fromRaw : null,
    isISODate(toRaw) ? toRaw : null,
  );

  const filters: Record<string, string> = {};
  for (const key of options.filterKeys ?? []) {
    const v = first(sp[key]).trim();
    if (v && v !== 'all') filters[key] = v.slice(0, 120);
  }

  return {
    page,
    pageSize,
    sort,
    dir,
    q: first(sp.q).trim().slice(0, 120),
    range,
    from: resolved.from,
    to: resolved.to,
    filters,
  };
}

/**
 * Monta uma URL preservando os parâmetros atuais e aplicando um patch.
 * `null` remove a chave. Mudar qualquer coisa que não seja a página volta para a 1 —
 * ficar na página 7 depois de trocar o filtro só mostra tela vazia.
 */
export function buildHref(
  basePath: string,
  current: RawSearchParams | URLSearchParams | undefined,
  patch: Record<string, string | number | null | undefined>,
): string {
  const params = new URLSearchParams();

  if (current instanceof URLSearchParams) {
    current.forEach((value, key) => params.set(key, value));
  } else if (current) {
    for (const [key, value] of Object.entries(current)) {
      const v = Array.isArray(value) ? value[0] : value;
      if (v !== undefined && v !== '') params.set(key, v);
    }
  }

  const touchesFilter = Object.keys(patch).some(k => k !== 'page');
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === '') params.delete(key);
    else params.set(key, String(value));
  }
  if (touchesFilter && patch.page === undefined) params.delete('page');

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Próximo estado de ordenação ao clicar num cabeçalho: desc → asc → desc. */
export function nextSort(currentSort: string | null, currentDir: SortDir, key: string): { sort: string; dir: SortDir } {
  if (currentSort !== key) return { sort: key, dir: 'desc' };
  return { sort: key, dir: currentDir === 'desc' ? 'asc' : 'desc' };
}

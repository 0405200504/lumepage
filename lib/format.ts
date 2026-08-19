/** Formatação compartilhada (pt-BR). */

export const brl = (cents: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);

/** Moeda compacta para eixos/sparklines: R$ 1,2 mil / R$ 3,4 mi. */
export const brlCompact = (cents: number): string => {
  const v = (cents || 0) / 100;
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (abs >= 1_000) return `R$ ${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return brl(cents);
};

export const pct = (n: number, digits = 1): string =>
  `${n >= 0 ? '' : '−'}${Math.abs(n).toFixed(digits)}%`;

/* =========================================================
   DATAS
   Um lugar só. Antes cada tela chamava um formatDateBR que fazia
   `iso.split('-')` assumindo "YYYY-MM-DD"; quando recebia um timestamptz
   ("2026-06-18T13:07:03.259+00:00") a tela mostrava
   "18T13:07:03.259+00:00/06/2026" — o bug que aparecia em /admin/clients.
   As funções abaixo aceitam data pura OU timestamp e nunca deslocam o dia
   (data pura é lida como local, não como UTC).
   ========================================================= */

/** Aceita "YYYY-MM-DD" e ISO com hora. null/inválido → null. */
function parseDateParts(value: string | Date | null | undefined): { y: number; m: number; d: number; hh: number; mi: number } | null {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return { y: value.getFullYear(), m: value.getMonth() + 1, d: value.getDate(), hh: value.getHours(), mi: value.getMinutes() };
  }

  const s = String(value).trim();
  if (!s) return null;

  // Data pura: lê como local (new Date("2026-06-18") seria UTC e viraria dia 17 no Brasil).
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (dateOnly) {
    return { y: +dateOnly[1], m: +dateOnly[2], d: +dateOnly[3], hh: 0, mi: 0 };
  }

  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return null;
  return { y: parsed.getFullYear(), m: parsed.getMonth() + 1, d: parsed.getDate(), hh: parsed.getHours(), mi: parsed.getMinutes() };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "18/06/2026". Valor ausente/inválido → `fallback` (padrão ""). */
export function formatDateBR(value: string | Date | null | undefined, fallback = ''): string {
  const p = parseDateParts(value);
  if (!p) return fallback;
  return `${pad(p.d)}/${pad(p.m)}/${p.y}`;
}

/** "18/06/2026 13:07". */
export function formatDateTimeBR(value: string | Date | null | undefined, fallback = ''): string {
  const p = parseDateParts(value);
  if (!p) return fallback;
  return `${pad(p.d)}/${pad(p.m)}/${p.y} ${pad(p.hh)}:${pad(p.mi)}`;
}

/** "18/06" — listas densas onde o ano é ruído. */
export function formatDayMonthBR(value: string | Date | null | undefined, fallback = ''): string {
  const p = parseDateParts(value);
  if (!p) return fallback;
  return `${pad(p.d)}/${pad(p.m)}`;
}

/** "13:07" a partir de "13:07:00" ou de um timestamp. */
export function formatTimeBR(value: string | Date | null | undefined, fallback = ''): string {
  if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  const p = parseDateParts(value);
  if (!p) return fallback;
  return `${pad(p.hh)}:${pad(p.mi)}`;
}

/** "há 3 dias" / "em 5 dias" — usado nos alertas e no "último acesso". */
export function formatRelativeBR(value: string | Date | null | undefined, now = new Date(), fallback = '—'): string {
  const p = parseDateParts(value);
  if (!p) return fallback;
  const then = new Date(p.y, p.m - 1, p.d, p.hh, p.mi).getTime();
  const diffDays = Math.round((then - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000);
  if (diffDays === 0) return 'hoje';
  if (diffDays === 1) return 'amanhã';
  if (diffDays === -1) return 'ontem';
  if (diffDays > 0) return `em ${diffDays} dias`;
  const ago = Math.abs(diffDays);
  if (ago < 30) return `há ${ago} dias`;
  const months = Math.round(ago / 30);
  return months < 12 ? `há ${months} ${months === 1 ? 'mês' : 'meses'}` : `há ${Math.round(ago / 365)} ano(s)`;
}

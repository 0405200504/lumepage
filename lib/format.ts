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

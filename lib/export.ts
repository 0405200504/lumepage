/* Utilitários de exportação — CSV nativo (sem dependências).
   PDF é feito via "Imprimir → Salvar como PDF" (window.print + CSS @media print). */

export interface CSVColumn<T> {
  header: string;
  /** Valor da célula. Números/strings; para moeda passe o valor já formatado. */
  value: (row: T) => string | number;
}

function escapeCell(v: string | number): string {
  const s = String(v ?? '');
  // Aspas e separadores exigem envolver em aspas; aspas internas são duplicadas.
  if (/[";\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Gera CSV (separador ';' — padrão pt-BR/Excel). */
export function toCSV<T>(rows: T[], columns: CSVColumn<T>[]): string {
  const head = columns.map(c => escapeCell(c.header)).join(';');
  const body = rows.map(r => columns.map(c => escapeCell(c.value(r))).join(';')).join('\n');
  return `${head}\n${body}`;
}

/** Dispara o download de um CSV com BOM (acentos corretos no Excel). */
export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Centavos → "1.234,56" (sem símbolo, ideal para planilha). */
export function centsToPlain(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Abre o diálogo de impressão (usuário escolhe "Salvar como PDF"). */
export function printPDF(): void {
  window.print();
}

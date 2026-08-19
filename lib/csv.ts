/**
 * CSV em streaming (server).
 * O lib/export.ts continua servindo o painel da profissional, que monta o CSV no
 * navegador a partir do que já está na tela. No admin isso não serve: exportar 340
 * agendamentos ou a base inteira de clientes exigiria carregar tudo no cliente antes.
 * Aqui o servidor lê em lotes e vai empurrando as linhas para o download.
 */

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

const SEP = ';'; // padrão pt-BR/Excel

function escapeCell(v: string | number | null | undefined): string {
  const s = String(v ?? '');
  if (/["\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function csvLine<T>(row: T, columns: CsvColumn<T>[]): string {
  return columns.map(c => escapeCell(c.value(row))).join(SEP) + '\r\n';
}

export function csvHeader<T>(columns: CsvColumn<T>[]): string {
  return columns.map(c => escapeCell(c.header)).join(SEP) + '\r\n';
}

/**
 * Monta a Response de download. `batches` é um gerador assíncrono de lotes — o
 * chamador decide o tamanho do lote e a query; nada fica todo na memória.
 */
export function csvStreamResponse<T>(
  filename: string,
  columns: CsvColumn<T>[],
  batches: AsyncIterable<T[]>,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // BOM: sem ele o Excel abre acentuação quebrada.
      controller.enqueue(encoder.encode('﻿'));
      controller.enqueue(encoder.encode(csvHeader(columns)));
      try {
        for await (const batch of batches) {
          if (batch.length === 0) continue;
          controller.enqueue(encoder.encode(batch.map(row => csvLine(row, columns)).join('')));
        }
      } catch (e) {
        // O download já começou: não dá para trocar o status. Deixa o erro no arquivo,
        // visível para quem abrir, em vez de entregar um CSV truncado em silêncio.
        const msg = e instanceof Error ? e.message : 'erro desconhecido';
        controller.enqueue(encoder.encode(`\r\n"ERRO NA EXPORTAÇÃO: ${msg.replace(/"/g, "'")}"\r\n`));
      }
      controller.close();
    },
  });

  const safeName = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Cache-Control': 'no-store',
    },
  });
}

/** Centavos → "1.234,56" (sem símbolo — planilha trata como número). */
export const csvCents = (cents: number | null | undefined): string =>
  ((cents ?? 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Nome de arquivo com data: "profissionais-2026-08-18.csv". */
export const csvFilename = (base: string, date = new Date()): string => {
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return `${base}-${iso}.csv`;
};

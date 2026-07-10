/**
 * Gerador de PDF da ficha de anamnese — sem dependências externas.
 *
 * Escreve o formato PDF 1.4 diretamente (fontes base-14 Helvetica com
 * encoding WinAnsi, que cobre todos os acentos do português). Suficiente
 * para um documento textual paginado; se um dia precisar de imagens ou
 * layout rico, aí sim vale adicionar uma lib dedicada.
 *
 * Server-only (retorna bytes) — usado pela rota /api/anamnese/[token]/pdf
 * e pelo envio automático no WhatsApp.
 */

export interface AnamnesisPdfItem {
  question: string;
  answer: string;
}

export interface AnamnesisPdfData {
  brandName: string;
  formTitle: string;
  clientName: string;
  clientWhatsapp: string;
  /** Data/hora de conclusão já formatada (ex.: "10/07/2026 às 14:32"). */
  completedAtLabel: string;
  /** Cor de destaque em hex (ex.: "#8c2438"). */
  accent: string;
  items: AnamnesisPdfItem[];
  signature: string | null;
}

// ---------- Página e tipografia (pontos; A4 = 595 × 842) ----------
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 56;
const MARGIN_TOP = 64;
const MARGIN_BOTTOM = 64;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

// ---------- Encoding WinAnsi (cobre pt-BR) ----------
// Latin-1 (0xA0–0xFF) coincide com WinAnsi; só os tipográficos precisam de mapa.
const WINANSI_EXTRA: Record<number, number> = {
  0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94,
  0x2013: 0x96, 0x2014: 0x97, 0x2022: 0x95, 0x2026: 0x85,
  0x20ac: 0x80, 0x2122: 0x99,
};

function toWinAnsiBytes(text: string): number[] {
  const bytes: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp === 0x0a) continue; // quebras são tratadas pelo layout
    if (cp < 0x80 || (cp >= 0xa0 && cp <= 0xff)) bytes.push(cp);
    else if (WINANSI_EXTRA[cp] !== undefined) bytes.push(WINANSI_EXTRA[cp]);
    else bytes.push(0x3f); // '?'
  }
  return bytes;
}

/** Escapa bytes para string literal PDF: \, ( e ). */
function pdfEscape(bytes: number[]): string {
  let out = '';
  for (const b of bytes) {
    if (b === 0x5c) out += '\\\\';
    else if (b === 0x28) out += '\\(';
    else if (b === 0x29) out += '\\)';
    else out += String.fromCharCode(b);
  }
  return out;
}

// ---------- Largura aproximada de texto (Helvetica, unidades/1000) ----------
const NARROW = new Set("iIl.,;:'!|()[]{}tfjr ·-".split(''));
const WIDE = new Set('mMWw@%'.split(''));
const UPPER = /[A-ZÀ-ÞÇ0-9]/;

function charWidth(ch: string): number {
  if (NARROW.has(ch)) return 300;
  if (WIDE.has(ch)) return 880;
  if (UPPER.test(ch)) return 690;
  return 540;
}

function textWidth(text: string, fontSize: number): number {
  let units = 0;
  for (const ch of text) units += charWidth(ch);
  return (units / 1000) * fontSize;
}

/** Quebra o texto em linhas que caibam em maxWidth (respeita \n do texto). */
function wrapText(text: string, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of (text || '').split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) { lines.push(''); continue; }
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (textWidth(candidate, fontSize) <= maxWidth || !current) current = candidate;
      else { lines.push(current); current = word; }
    }
    if (current) lines.push(current);
  }
  return lines.length ? lines : [''];
}

// ---------- Cores ----------
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0x8c2438; // fallback: vinho Lume
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const rgb = ([r, g, b]: [number, number, number]) =>
  `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;

// ---------- Montagem do documento ----------
class PdfBuilder {
  private pages: string[] = [];
  private ops: string[] = [];
  private y = PAGE_H - MARGIN_TOP;
  private accent: [number, number, number];
  private pageNum = 0;

  constructor(private data: AnamnesisPdfData) {
    this.accent = hexToRgb(data.accent);
    this.startPage();
  }

  private startPage() {
    if (this.ops.length) this.pages.push(this.ops.join('\n'));
    this.ops = [];
    this.pageNum++;
    this.y = PAGE_H - MARGIN_TOP;
    // Faixa superior na cor de destaque
    this.ops.push(`${rgb(this.accent)} rg`);
    this.ops.push(`0 ${PAGE_H - 10} ${PAGE_W} 10 re f`);
    // Rodapé
    const footer = `Gerada com Lume Agenda  ·  página ${this.pageNum}`;
    this.ops.push('0.62 0.58 0.56 rg');
    this.text(footer, MARGIN_X, 34, 8, 'F1');
  }

  /** Garante espaço vertical; abre nova página se não couber. */
  private ensure(height: number) {
    if (this.y - height < MARGIN_BOTTOM) this.startPage();
  }

  private text(str: string, x: number, y: number, size: number, font: 'F1' | 'F2') {
    const escaped = pdfEscape(toWinAnsiBytes(str));
    this.ops.push(`BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escaped}) Tj ET`);
  }

  private setColor(c: [number, number, number] | string) {
    this.ops.push(`${typeof c === 'string' ? c : rgb(c)} rg`);
  }

  private paragraph(str: string, size: number, font: 'F1' | 'F2', color: [number, number, number] | string, opts?: { maxWidth?: number; lineGap?: number; x?: number }) {
    const maxWidth = opts?.maxWidth ?? CONTENT_W;
    const lineH = size + (opts?.lineGap ?? 4);
    const x = opts?.x ?? MARGIN_X;
    for (const line of wrapText(str, size, maxWidth)) {
      this.ensure(lineH);
      this.setColor(color);
      this.text(line, x, this.y - size, size, font);
      this.y -= lineH;
    }
  }

  private space(h: number) { this.y -= h; }

  private rule(color: [number, number, number] | string, width = CONTENT_W, thickness = 1) {
    this.ensure(thickness + 2);
    this.setColor(color);
    this.ops.push(`${MARGIN_X} ${(this.y - thickness).toFixed(2)} ${width} ${thickness} re f`);
    this.y -= thickness + 2;
  }

  build(): Uint8Array {
    const d = this.data;

    // Cabeçalho
    this.paragraph(d.brandName.toUpperCase(), 10, 'F2', this.accent, { lineGap: 3 });
    this.space(6);
    this.paragraph(d.formTitle, 20, 'F2', '0.10 0.06 0.07');
    this.space(4);
    this.paragraph('Ficha de anamnese', 10, 'F1', '0.45 0.40 0.40');
    this.space(10);
    this.rule(this.accent, 64, 3);
    this.space(14);

    // Dados da cliente
    const info: Array<[string, string]> = [
      ['Cliente', d.clientName || '—'],
      ['WhatsApp', d.clientWhatsapp || '—'],
      ['Preenchida em', d.completedAtLabel || '—'],
    ];
    for (const [label, value] of info) {
      this.ensure(16);
      this.setColor('0.45 0.40 0.40');
      this.text(`${label}:`, MARGIN_X, this.y - 10, 9, 'F2');
      this.setColor('0.10 0.06 0.07');
      this.text(value, MARGIN_X + 90, this.y - 10, 10, 'F1');
      this.y -= 16;
    }
    this.space(10);
    this.rule('0.90 0.87 0.86');
    this.space(14);

    // Perguntas e respostas
    d.items.forEach((item, i) => {
      // Evita título órfão no fim da página
      this.ensure(46);
      this.paragraph(`${i + 1}. ${item.question}`, 10.5, 'F2', this.accent, { lineGap: 3.5 });
      this.space(3);
      this.paragraph(item.answer || 'Não respondido', 10.5, 'F1', '0.13 0.10 0.11', { lineGap: 4, x: MARGIN_X + 14, maxWidth: CONTENT_W - 14 });
      this.space(12);
    });

    // Assinatura / declaração
    this.space(10);
    this.ensure(80);
    this.rule('0.90 0.87 0.86');
    this.space(12);
    this.paragraph('Declaro que as informações prestadas acima são verdadeiras e de minha responsabilidade.', 9, 'F1', '0.45 0.40 0.40');
    this.space(8);
    if (d.signature) {
      this.paragraph(d.signature, 14, 'F2', '0.10 0.06 0.07');
      this.paragraph('Assinatura da cliente', 8, 'F1', '0.55 0.50 0.50');
    } else {
      this.space(20);
      this.rule('0.70 0.66 0.65', 220, 1);
      this.paragraph('Assinatura da cliente', 8, 'F1', '0.55 0.50 0.50');
    }

    this.pages.push(this.ops.join('\n'));
    return this.assemble();
  }

  /** Serializa objetos PDF + xref. */
  private assemble(): Uint8Array {
    const objects: string[] = [];
    const pageCount = this.pages.length;
    // Objetos: 1=catalog, 2=pages, 3=F1, 4=F2, depois páginas (5..) e conteúdos
    const pageObjIds = this.pages.map((_, i) => 5 + i * 2);
    const kids = pageObjIds.map(id => `${id} 0 R`).join(' ');

    objects[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
    objects[2] = `2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>\nendobj\n`;
    objects[3] = `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`;
    objects[4] = `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`;

    this.pages.forEach((content, i) => {
      const pageId = 5 + i * 2;
      const contentId = pageId + 1;
      objects[pageId] =
        `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`;
      objects[contentId] =
        `${contentId} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`;
    });

    let body = '%PDF-1.4\n%âãÏÓ\n';
    const offsets: number[] = [];
    for (let i = 1; i < objects.length; i++) {
      offsets[i] = body.length;
      body += objects[i];
    }
    const xrefStart = body.length;
    const count = objects.length;
    body += `xref\n0 ${count}\n0000000000 65535 f \n`;
    for (let i = 1; i < count; i++) {
      body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    body += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    // Todos os bytes são < 256 (WinAnsi/ASCII) — serialização byte a byte
    const bytes = new Uint8Array(body.length);
    for (let i = 0; i < body.length; i++) bytes[i] = body.charCodeAt(i) & 0xff;
    return bytes;
  }
}

export function generateAnamnesisPdf(data: AnamnesisPdfData): Uint8Array {
  return new PdfBuilder(data).build();
}

'use client';

import { uploadSiteImageAction } from '@/app/actions/site';

/**
 * ============================================================================
 * Upload de imagem da página — com otimização ANTES de sair do celular
 * ============================================================================
 * A profissional vai subir foto direto da galeria do telefone: 4 MB, 4000px de
 * largura, JPEG. Se isso for parar cru na página, a cliente que abre o link no
 * 4G espera 8 segundos por uma imagem que será exibida com 600px.
 *
 * Então redimensionamos e convertemos para WebP aqui, no navegador, antes do
 * upload. Ganhos: envio mais rápido, menos armazenamento, e a página pública
 * carrega leve sem depender de nenhum serviço de otimização.
 *
 * Se o navegador não suportar canvas/WebP, o arquivo original é enviado — pior
 * performance, nunca uma falha.
 */

const MAX_DIMENSION = 1600; // suficiente para tela retina em qualquer seção
const QUALITY = 0.82;

function loadBitmap(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagem inválida')); };
    img.src = url;
  });
}

async function optimize(file: File): Promise<File> {
  // GIF pode ser animado — recomprimir mataria a animação.
  if (file.type === 'image/gif') return file;
  if (typeof document === 'undefined') return file;

  try {
    const img = await loadBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    // Já é pequena e leve: não vale a pena recomprimir (evita perder qualidade à toa).
    if (scale === 1 && file.size < 400 * 1024) return file;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/webp', QUALITY));
    if (!blob || blob.size >= file.size) return file; // não ficou menor: manda o original

    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
  } catch {
    return file;
  }
}

export interface UploadResult {
  ok: boolean;
  url?: string;
  error?: string;
}

/** Otimiza e envia. `kind` vira a subpasta (logo, galeria, antes-depois...). */
export async function uploadSiteImage(
  professionalId: string,
  file: File,
  kind: string,
): Promise<UploadResult> {
  if (!file) return { ok: false, error: 'Escolha uma imagem.' };
  if (!file.type.startsWith('image/')) {
    return { ok: false, error: 'Esse arquivo não é uma imagem.' };
  }
  // Teto generoso antes de otimizar (depois da conversão fica bem menor).
  if (file.size > 20 * 1024 * 1024) {
    return { ok: false, error: 'A imagem é muito grande. Envie um arquivo de até 20 MB.' };
  }

  const optimized = await optimize(file);
  const form = new FormData();
  form.append('file', optimized);
  form.append('kind', kind);

  const res = await uploadSiteImageAction(professionalId, form);
  if (!res.success) return { ok: false, error: res.error };
  return { ok: true, url: res.url };
}

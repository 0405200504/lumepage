/**
 * Reduz a foto no próprio celular (lado maior até 1600 px, JPEG) e mede o
 * brilho médio. A action do servidor aceita até 1 MB; uma foto de câmera de
 * celular tem 3 a 8 MB.
 */
export async function prepararFoto(file: File): Promise<{ blob: Blob; width: number; height: number; brilho: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error('Não consegui abrir essa foto.')); i.src = url;
    });
    const brilho = (() => {
      const c = document.createElement('canvas'); c.width = 48; c.height = 48;
      const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0, 48, 48);
      const d = ctx.getImageData(0, 0, 48, 48).data; let s = 0;
      for (let k = 0; k < d.length; k += 4) s += 0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2];
      return s / (d.length / 4);
    })();
    for (const [lado, q] of [[1600, 0.85], [1280, 0.8], [1024, 0.75]] as const) {
      const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * escala); c.height = Math.round(img.naturalHeight * escala);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise<Blob | null>(ok => c.toBlob(ok, 'image/jpeg', q));
      if (blob && blob.size <= 950 * 1024) return { blob, width: img.naturalWidth, height: img.naturalHeight, brilho };
    }
    throw new Error('A foto ficou grande demais mesmo reduzida. Tente outra.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth/auth';
import { dbService } from '@/lib/supabase/db';
import { downloadUazapiMedia } from '@/lib/uazapi';

/**
 * Serve a mídia de uma mensagem do WhatsApp para a caixa de entrada.
 *
 * O arquivo mora na uazapi e só sai de lá com o token da instância — que não
 * pode ir para um `<img src>`. Então o Lume busca no servidor, confere que a
 * sessão é da dona daquela instância e devolve os bytes.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'Mensagem inválida.' }, { status: 400 });

  const session = await authService.getCurrentUser('pro').catch(() => null);
  if (!session?.professional_id) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const settings = await dbService.getWhatsAppSettings(session.professional_id).catch(() => null);
  if (!settings?.uazapi_url || !settings?.uazapi_token) {
    return NextResponse.json({ error: 'WhatsApp não conectado.' }, { status: 404 });
  }

  // A instância é a da própria profissional, então a mídia que ela alcança é
  // necessariamente de uma conversa dela — não há como pedir a de outra conta.
  const media = await downloadUazapiMedia(settings.uazapi_url, settings.uazapi_token, id);
  if (!media.success || !media.base64) {
    return NextResponse.json({ error: media.error ?? 'Arquivo indisponível.' }, { status: 404 });
  }

  // A uazapi às vezes devolve com prefixo data: — o Buffer só quer o payload.
  const raw = media.base64.includes(',') ? media.base64.split(',')[1] : media.base64;

  return new NextResponse(Buffer.from(raw, 'base64'), {
    headers: {
      'Content-Type': media.mimetype || 'application/octet-stream',
      // Mensagem do WhatsApp não muda: cacheia no browser, nunca em CDN.
      'Cache-Control': 'private, max-age=86400',
    },
  });
}

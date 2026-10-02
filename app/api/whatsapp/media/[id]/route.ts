import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth/auth';
import { dbService } from '@/lib/supabase/db';
import { resolveInboxMedia } from '@/lib/whatsapp/inbox-media';
import type { InboxKind } from '@/lib/whatsapp/inbox-shared';

/**
 * Serve a mídia de uma mensagem do WhatsApp para a caixa de entrada.
 *
 * `id` é o id da mensagem no WhatsApp. O servidor confere a sessão, acha a
 * cópia no nosso Storage (ou busca na uazapi e copia) e responde com um
 * redirect para uma URL assinada — assim foto, áudio e vídeo grandes não
 * passam pela função da Vercel (que corta corpos acima de 4,5 MB) e o
 * player consegue pedir trechos (Range) direto do Storage.
 *
 * Query opcional: `u` = id interno da uazapi (ajuda quando a mensagem ainda
 * não está no banco), `c` = chatid, `k` = tipo (image, audio…).
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'Mensagem inválida.' }, { status: 400 });

  const session = await authService.getCurrentUser('pro').catch(() => null);
  if (!session?.professional_id) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const settings = await dbService.getWhatsAppSettings(session.professional_id).catch(() => null);
  if (!settings?.uazapi_url || !settings?.uazapi_token) {
    return NextResponse.json({ error: 'WhatsApp não conectado.' }, { status: 404 });
  }

  const q = req.nextUrl.searchParams;
  // A instância é a da própria profissional, então a mídia que ela alcança é
  // necessariamente de uma conversa dela — não há como pedir a de outra conta.
  const media = await resolveInboxMedia(session.professional_id, settings, id, {
    uazapiId: q.get('u'),
    chatid: q.get('c'),
    kind: (q.get('k') as InboxKind | null) ?? null,
  });

  if (media.kind === 'redirect') {
    return NextResponse.redirect(media.url, {
      status: 302,
      // A URL assinada vale 1 h; o navegador guarda o redirect por 30 min.
      headers: { 'Cache-Control': 'private, max-age=1800' },
    });
  }
  if (media.kind === 'bytes') {
    return new NextResponse(new Uint8Array(media.buffer), {
      headers: {
        'Content-Type': media.mimetype,
        'Cache-Control': 'private, max-age=86400',
      },
    });
  }
  return NextResponse.json({ error: media.error }, { status: media.status, headers: { 'Cache-Control': 'no-store' } });
}

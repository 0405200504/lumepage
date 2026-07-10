import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/supabase/db';
import { buildAnamnesisPdfBytes } from '@/lib/anamnesis/render';
import { rateLimit, ipFromHeaders } from '@/lib/rate-limit';

/**
 * PDF da ficha de anamnese preenchida.
 *
 * Acesso pelo token do link (longo e aleatório) — o mesmo modelo de segurança
 * do link de preenchimento: quem tem o token é a cliente (recebeu no WhatsApp)
 * ou a profissional (vê no dashboard). A uazapi também baixa daqui o arquivo
 * enviado automaticamente no WhatsApp da cliente.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  const ip = ipFromHeaders(req.headers);
  const rl = await rateLimit(`anamnesis-pdf:${ip}`, 30, 10 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 });

  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Link inválido.' }, { status: 400 });
  }

  const response = await dbService.getAnamnesisResponseByToken(token);
  if (!response) return NextResponse.json({ error: 'Ficha não encontrada.' }, { status: 404 });
  if (response.status !== 'completed') {
    return NextResponse.json({ error: 'A ficha ainda não foi preenchida.' }, { status: 409 });
  }

  const bytes = await buildAnamnesisPdfBytes(response);
  const safeName = (response.client_name || 'cliente')
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'cliente';

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="ficha-anamnese-${safeName}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

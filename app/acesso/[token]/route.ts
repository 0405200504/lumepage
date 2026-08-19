import { NextRequest, NextResponse } from 'next/server';
import { redeemAccessToken, logAccessEvent } from '@/lib/access-tokens';
import { signSession } from '@/lib/auth/cookie';
import { PRO_COOKIE_NAME, SessionData } from '@/lib/auth/auth';
import { getSupabaseAdmin, supabase } from '@/lib/supabase/client';

/**
 * LINK MÁGICO — /acesso/<token>
 *
 * É o link que o suporte manda no WhatsApp quando a profissional diz "esqueci a senha
 * e não acho o e-mail". Vale 15 minutos e queima no primeiro uso (ver
 * lib/access-tokens.ts). Aqui ele vira uma sessão normal de profissional — não uma
 * sessão de suporte: quem entra é ela, o painel é dela, sem faixa nenhuma.
 */

export const dynamic = 'force-dynamic';

const db = () => getSupabaseAdmin() || supabase;

function fail(request: NextRequest, message: string): NextResponse {
  const url = new URL('/login', request.url);
  url.searchParams.set('erro', message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }): Promise<NextResponse> {
  const { token } = await context.params;

  const redeemed = await redeemAccessToken(token, 'magic');
  if (!redeemed.ok) return fail(request, redeemed.error);

  const { professionalId, profileId } = redeemed.data;

  const [{ data: prof }, { data: profile }] = await Promise.all([
    db().from('professionals').select('id, name, email, salon_id, deleted_at').eq('id', professionalId).maybeSingle(),
    profileId
      ? db().from('profiles').select('id, auth_user_id, name, email').eq('id', profileId).maybeSingle()
      : db().from('profiles').select('id, auth_user_id, name, email').eq('professional_id', professionalId).limit(1).maybeSingle(),
  ]);

  const p = prof as { id: string; name: string; email: string; salon_id: string | null; deleted_at: string | null } | null;
  if (!p || p.deleted_at) return fail(request, 'Conta indisponível. Fale com o suporte.');

  const pf = profile as { id?: string; auth_user_id?: string | null; name?: string; email?: string } | null;

  const session: SessionData = {
    profile_id: pf?.id ?? `magic-${professionalId}`,
    auth_user_id: pf?.auth_user_id ?? null,
    name: pf?.name || p.name,
    email: pf?.email || p.email,
    role: 'professional',
    professional_id: professionalId,
    salon_id: p.salon_id ?? null,
    is_salon_manager: false,
  };

  await logAccessEvent({ professionalId, email: session.email, method: 'magic' });

  const response = NextResponse.redirect(new URL('/dashboard', request.url));
  response.cookies.set(PRO_COOKIE_NAME, signSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return response;
}

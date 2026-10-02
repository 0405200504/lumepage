import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { readEmailConfirmToken } from '@/lib/auth/email-confirm';

/**
 * Link do e-mail de confirmação do cadastro — /confirmar-email/<token>.
 *
 * Só confirma o e-mail; NÃO abre sessão. Quem clicou entra com a senha que
 * escolheu. Assim um link encaminhado (ou aberto por um antivírus de e-mail)
 * não vira uma porta para dentro da conta.
 */
export const dynamic = 'force-dynamic';

function toLogin(request: NextRequest, params: Record<string, string>): NextResponse {
  const url = new URL('/login', request.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }): Promise<NextResponse> {
  const { token } = await context.params;
  const data = readEmailConfirmToken(token);
  if (data === 'expired') return toLogin(request, { erro: 'Este link de confirmação expirou. Entre com seu e-mail para receber outro.' });
  if (!data) return toLogin(request, { erro: 'Link de confirmação inválido.' });

  const admin = getSupabaseAdmin();
  if (!admin) return toLogin(request, { erro: 'Não foi possível confirmar agora. Tente de novo em instantes.' });

  // O e-mail do link precisa ser o e-mail atual da conta: se ela trocou de
  // e-mail depois, o link antigo não confirma o novo.
  const { data: found } = await admin.auth.admin.getUserById(data.userId);
  const user = found?.user;
  if (!user || (user.email || '').toLowerCase() !== data.email) {
    return toLogin(request, { erro: 'Link de confirmação inválido.' });
  }

  if (!user.email_confirmed_at) {
    const { error } = await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
    if (error) return toLogin(request, { erro: 'Não foi possível confirmar agora. Tente de novo em instantes.' });
  }

  return toLogin(request, { confirmado: '1' });
}

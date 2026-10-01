import { authService } from '@/lib/auth/auth';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { rateLimit } from '@/lib/rate-limit';

/**
 * DIAGNÓSTICO TEMPORÁRIO da abertura no app do iPhone.
 *
 * O iOS 26 dá à página criada durante a abertura do app uma janela mais curta
 * que a tela, e isso só acontece no aparelho de verdade — nenhum simulador
 * reproduz. A tela de abertura (app/abertura/route.ts) anota as medidas da
 * janela em cada tentativa; o painel manda tudo para cá ao montar
 * (components/ui/SplashRunner).
 *
 * Só medidas de tela e o user agent — nada da conta. Guarda no bucket
 * PRIVADO `diagnostico` do Supabase Storage, um JSON por abertura.
 * Remover esta rota (e o envio no SplashRunner) quando o bug estiver fechado.
 */
export async function POST(req: Request) {
  const session = await authService.getCurrentUser('pro');
  if (!session) return new Response(null, { status: 401 });

  const rl = await rateLimit(`diag-abertura:${session.profile_id}`, 20, 10 * 60 * 1000);
  if (!rl.ok) return new Response(null, { status: 429 });

  const texto = await req.text();
  if (texto.length > 6000) return new Response(null, { status: 413 });
  let dados: unknown;
  try {
    dados = JSON.parse(texto);
  } catch {
    return new Response(null, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return new Response(null, { status: 503 });

  const agora = new Date();
  const caminho = `abertura/${agora.toISOString().slice(0, 10)}/${agora.getTime()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.json`;
  const corpo = JSON.stringify({ recebido_em: agora.toISOString(), dados });
  await admin.storage
    .from('diagnostico')
    .upload(caminho, new Blob([corpo], { type: 'application/json' }), { contentType: 'application/json' })
    .catch(() => null);

  return new Response(null, { status: 204 });
}

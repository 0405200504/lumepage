/**
 * Verificação do Cloudflare Turnstile (captcha "invisível", grátis).
 *
 * Ativa SÓ quando TURNSTILE_SECRET_KEY está configurada. Sem a chave, a verificação
 * é pulada (retorna true) — assim o agendamento continua funcionando hoje e o captcha
 * "liga" sozinho quando você adicionar as chaves na Vercel. A chave pública do widget
 * é NEXT_PUBLIC_TURNSTILE_SITE_KEY (usada no front).
 */

const SECRET = process.env.TURNSTILE_SECRET_KEY || '';

/** True se o captcha está configurado (e portanto deve ser exigido). */
export const turnstileEnabled = !!SECRET;

/**
 * Valida o token gerado pelo widget no navegador da cliente.
 * @returns true se válido OU se o captcha não está configurado (modo desligado).
 */
export async function verifyTurnstile(token: string | undefined | null, remoteIp?: string): Promise<boolean> {
  if (!SECRET) return true; // captcha desligado → não bloqueia
  if (!token) return false;
  try {
    const form = new URLSearchParams();
    form.append('secret', SECRET);
    form.append('response', token);
    if (remoteIp) form.append('remoteip', remoteIp);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    // Falha de rede na verificação: melhor não derrubar agendamentos legítimos.
    // (O rate limit por IP continua ativo como segunda camada.)
    return true;
  }
}

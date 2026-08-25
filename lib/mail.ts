/**
 * ENVIO DE E-MAIL (opcional)
 * --------------------------
 * A Lume não tem provedor de e-mail próprio: o único e-mail transacional que existe
 * hoje é o de redefinição de senha, e quem manda é o Supabase (GoTrue + SMTP do
 * projeto). Este módulo cobre o resto — hoje só o aviso "o suporte entrou na sua
 * conta" — e é deliberadamente best-effort:
 *
 *   com RESEND_API_KEY  → manda de verdade;
 *   sem RESEND_API_KEY  → devolve `skipped` e avisa no console UMA vez.
 *
 * Nada no produto depende do envio dar certo. Um aviso que não saiu não pode
 * impedir o suporte de atender.
 */

let warned = false;

export interface MailResult {
  sent: boolean;
  skipped?: boolean;
  error?: string;
}

export interface MailInput {
  to: string;
  subject: string;
  /** Versão em texto — sempre obrigatória: é o que aparece em cliente sem HTML. */
  text: string;
  /** Versão em HTML (opcional). Use os templates de lib/mail/templates.ts. */
  html?: string;
  /** Para onde vai a resposta, quando o remetente é uma caixa que ninguém lê. */
  replyTo?: string;
}

export async function sendMail(input: MailInput): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || 'Lume <onboarding@resend.dev>';

  if (!key) {
    if (!warned) {
      warned = true;
      console.warn('[mail] RESEND_API_KEY ausente — avisos por e-mail desligados. Configure RESEND_API_KEY e MAIL_FROM para ligar.');
    }
    return { sent: false, skipped: true };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        ...(input.html ? { html: input.html } : {}),
        ...(input.replyTo || process.env.MAIL_REPLY_TO
          ? { reply_to: input.replyTo || process.env.MAIL_REPLY_TO }
          : {}),
      }),
    });
    if (!res.ok) {
      // O corpo do erro do Resend diz o motivo (domínio não verificado, from
      // inválido, chave sem permissão) — sem ele, todo problema vira "HTTP 4xx".
      const detalhe = await res.text().catch(() => '');
      console.warn(`[mail] Resend recusou o envio para ${input.to}: HTTP ${res.status} ${detalhe.slice(0, 300)}`);
      return { sent: false, error: `HTTP ${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : 'falha de rede' };
  }
}

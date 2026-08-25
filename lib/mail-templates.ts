/**
 * E-MAILS TRANSACIONAIS DA LUME
 * ------------------------------
 * Cada template devolve `{ subject, text, html }` — o texto não é enfeite, é o
 * que aparece em cliente sem HTML e o que salva a entrega quando o e-mail cai
 * em modo leitura. Os dois dizem a mesma coisa.
 *
 * HTML de e-mail não é HTML de página: nada de flex, grid ou classe. Tabela,
 * largura fixa e estilo inline — é o que o Gmail, o Outlook e o app nativo do
 * iPhone renderizam igual.
 *
 * Puro: monta string e devolve. Quem envia é lib/mail.ts.
 */

import { PLAN_LABEL, type PlanType } from '@/lib/subscription/entitlements';
import { WHATSAPP_LINK } from '@/lib/lp/site';

const BORDO = '#7b102b';
const BORDO_DEEP = '#5e0c20';
const CREME = '#fbf8f3';
const OFFWHITE = '#f4efe7';
const GRAFITE = '#2c2527';
const ROSE = '#d8c9c3';

export type EmailContent = { subject: string; text: string; html: string };

/** URL do painel. Sem NEXT_PUBLIC_APP_URL configurada, cai no domínio oficial. */
export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://www.lumepage.com.br').replace(/\/+$/, '');
}

/** Primeiro nome — "Oi, Maria" soa melhor que "Oi, Maria Aparecida da Silva". */
function primeiroNome(nome?: string | null): string {
  const limpo = (nome || '').trim();
  return limpo ? limpo.split(/\s+/)[0] : 'tudo bem';
}

function dataBR(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
}

function escape(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Casca comum: cabeçalho com a marca, miolo e rodapé.
 * `destaque` é o quadro em creme com a informação que a pessoa vai procurar
 * depois (plano, vencimento, e-mail de acesso).
 */
function layout(opts: {
  titulo: string;
  intro: string;
  destaque?: { rotulo: string; valor: string }[];
  corpo?: string[];
  botao?: { texto: string; url: string };
  rodape?: string;
}): string {
  const linhas = (opts.destaque || [])
    .map(
      (d) => `
              <tr>
                <td style="padding:6px 0;font-size:14px;color:${GRAFITE};opacity:0.65;">${escape(d.rotulo)}</td>
                <td style="padding:6px 0;font-size:15px;color:${GRAFITE};font-weight:600;text-align:right;">${escape(d.valor)}</td>
              </tr>`,
    )
    .join('');

  const paragrafos = (opts.corpo || [])
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${GRAFITE};opacity:0.8;">${p}</p>`)
    .join('');

  return `<!-- Lume -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${OFFWHITE};padding:32px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px -18px rgba(44,37,39,0.22);">
        <tr>
          <td style="background:linear-gradient(135deg,${BORDO} 0%,${BORDO_DEEP} 100%);padding:28px 32px;">
            <p style="margin:0;font-size:20px;font-weight:600;letter-spacing:0.02em;color:${OFFWHITE};">Lume</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;font-weight:600;color:${GRAFITE};">${opts.titulo}</h1>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${GRAFITE};opacity:0.8;">${opts.intro}</p>
            ${
              linhas
                ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CREME};border:1px solid ${ROSE};border-radius:14px;padding:16px 20px;margin:0 0 22px;">
              ${linhas}
            </table>`
                : ''
            }
            ${paragrafos}
            ${
              opts.botao
                ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
              <tr>
                <td style="background:linear-gradient(135deg,${BORDO} 0%,${BORDO_DEEP} 100%);border-radius:12px;">
                  <a href="${escape(opts.botao.url)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:${OFFWHITE};text-decoration:none;">${escape(opts.botao.texto)}</a>
                </td>
              </tr>
            </table>`
                : ''
            }
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px;border-top:1px solid ${ROSE};">
            <p style="margin:0;font-size:13px;line-height:1.6;color:${GRAFITE};opacity:0.55;">
              ${opts.rodape || `Dúvida? É só responder este e-mail ou <a href="${WHATSAPP_LINK}" style="color:${BORDO};">falar com a gente no WhatsApp</a>.`}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/** Conta criada — os 7 dias de teste começaram. */
export function welcomeEmail(p: { name?: string | null; email: string; trialEndsAt?: string | null }): EmailContent {
  const url = appUrl();
  const vence = dataBR(p.trialEndsAt);
  const oi = primeiroNome(p.name);

  return {
    subject: 'Sua conta na Lume está pronta — 7 dias liberados',
    text: [
      `Oi, ${oi}!`,
      '',
      'Sua conta na Lume está criada e o acesso está liberado por 7 dias, sem cartão.',
      '',
      `E-mail de acesso: ${p.email}`,
      vence ? `Teste válido até: ${vence}` : 'Teste válido por 7 dias.',
      `Painel: ${url}/login`,
      '',
      'A senha é a que você escolheu no cadastro. Se não lembrar, use "Esqueci minha senha" na tela de login.',
      '',
      'Uma dica pra começar: cadastre seus serviços e horários primeiro. Em poucos minutos seu link de agendamento já está pronto pra ir na bio.',
      '',
      'Qualquer dúvida, é só responder este e-mail.',
      'Equipe Lume',
    ].join('\n'),
    html: layout({
      titulo: `Oi, ${escape(oi)}! Sua conta está pronta.`,
      intro: 'O acesso está liberado por <strong>7 dias</strong>, sem cartão e sem fidelidade.',
      destaque: [
        { rotulo: 'E-mail de acesso', valor: p.email },
        ...(vence ? [{ rotulo: 'Teste válido até', valor: vence }] : []),
      ],
      corpo: [
        'A senha é a que você escolheu no cadastro. Se não lembrar, use <strong>Esqueci minha senha</strong> na tela de login.',
        'Uma dica pra começar: cadastre seus serviços e horários primeiro. Em poucos minutos seu link de agendamento já está pronto pra ir na bio.',
      ],
      botao: { texto: 'Entrar no painel', url: `${url}/login` },
    }),
  };
}

/** Pagamento aprovado — o plano foi liberado. */
export function subscriptionActivatedEmail(p: {
  name?: string | null;
  plan: PlanType;
  endsAt?: string | null;
  months?: number | null;
}): EmailContent {
  const url = appUrl();
  const plano = PLAN_LABEL[p.plan];
  const vence = dataBR(p.endsAt);
  const oi = primeiroNome(p.name);
  const ciclo = p.months === 12 ? 'anual' : p.months === 1 ? 'mensal' : null;

  return {
    subject: `Parabéns! Seu plano ${plano} está ativo 🎉`,
    text: [
      `Oi, ${oi}! Deu tudo certo com o pagamento.`,
      '',
      `Plano: ${plano}${ciclo ? ` (${ciclo})` : ''}`,
      vence ? `Acesso garantido até: ${vence}` : '',
      `Painel: ${url}/dashboard`,
      '',
      'Todos os recursos do seu plano já estão liberados — é só entrar e continuar de onde parou.',
      '',
      'Sem fidelidade: você cancela quando quiser e leva sua base de clientes junto.',
      '',
      'Obrigado por confiar na Lume 💛',
      'Equipe Lume',
    ]
      .filter(Boolean)
      .join('\n'),
    html: layout({
      titulo: `Parabéns, ${escape(oi)}! Seu plano ${escape(plano)} está ativo.`,
      intro: 'Deu tudo certo com o pagamento e todos os recursos do seu plano já estão liberados.',
      destaque: [
        { rotulo: 'Plano', valor: `${plano}${ciclo ? ` (${ciclo})` : ''}` },
        ...(vence ? [{ rotulo: 'Acesso garantido até', valor: vence }] : []),
      ],
      corpo: [
        'É só entrar e continuar de onde parou — sua agenda, suas clientes e seu histórico estão do jeito que você deixou.',
        'Sem fidelidade: você cancela quando quiser e leva sua base de clientes junto.',
      ],
      botao: { texto: 'Ir para o painel', url: `${url}/dashboard` },
    }),
  };
}

/** Cobrança recusada — o acesso continua até o vencimento. */
export function paymentFailedEmail(p: { name?: string | null; endsAt?: string | null }): EmailContent {
  const url = appUrl();
  const vence = dataBR(p.endsAt);
  const oi = primeiroNome(p.name);

  return {
    subject: 'Não conseguimos confirmar seu pagamento',
    text: [
      `Oi, ${oi}!`,
      '',
      'A cobrança da sua assinatura não passou desta vez. Pode ter sido limite, um cartão vencido ou uma recusa do banco — acontece.',
      '',
      vence ? `Seu acesso continua liberado até ${vence}.` : 'Seu acesso continua liberado por enquanto.',
      'A Hubla vai tentar cobrar de novo automaticamente. Se preferir resolver agora, atualize o cartão por lá.',
      '',
      'Se precisar de ajuda, é só responder este e-mail.',
      'Equipe Lume',
    ].join('\n'),
    html: layout({
      titulo: 'Não conseguimos confirmar seu pagamento',
      intro: `Oi, ${escape(oi)}! A cobrança da sua assinatura não passou desta vez — pode ter sido limite, cartão vencido ou uma recusa do banco.`,
      destaque: vence ? [{ rotulo: 'Acesso liberado até', valor: vence }] : undefined,
      corpo: [
        'Nada foi cortado: seu acesso continua normal e a Hubla vai tentar cobrar de novo automaticamente.',
        'Se preferir resolver agora, é só atualizar o cartão na Hubla.',
      ],
      botao: { texto: 'Ir para o painel', url: `${url}/dashboard` },
    }),
  };
}

/** Assinatura encerrada (cancelamento ou reembolso). */
export function subscriptionEndedEmail(p: { name?: string | null }): EmailContent {
  const url = appUrl();
  const oi = primeiroNome(p.name);

  return {
    subject: 'Sua assinatura da Lume foi encerrada',
    text: [
      `Oi, ${oi}!`,
      '',
      'Sua assinatura foi encerrada e o acesso ao painel está pausado.',
      '',
      'Fica tranquila: sua agenda, suas clientes e todo o histórico continuam salvos. Se voltar, está tudo onde você deixou.',
      '',
      `Quiser reativar, é só escolher um plano: ${url}/dashboard`,
      '',
      'Se foi engano ou se tem algo que a gente possa melhorar, responde este e-mail — a gente lê.',
      'Equipe Lume',
    ].join('\n'),
    html: layout({
      titulo: 'Sua assinatura foi encerrada',
      intro: `Oi, ${escape(oi)}! O acesso ao painel está pausado a partir de agora.`,
      corpo: [
        'Fica tranquila: <strong>sua agenda, suas clientes e todo o histórico continuam salvos</strong>. Se voltar, está tudo onde você deixou.',
        'Se foi engano, ou se tem algo que a gente possa melhorar, responde este e-mail — a gente lê.',
      ],
      botao: { texto: 'Reativar minha conta', url: `${url}/dashboard` },
    }),
  };
}

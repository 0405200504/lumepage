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
                <td style="padding:6px 0;font-size:14px;color:#5c5254;">${escape(d.rotulo)}</td>
                <td style="padding:6px 0;font-size:15px;color:${GRAFITE};font-weight:600;text-align:right;">${escape(d.valor)}</td>
              </tr>`,
    )
    .join('');

  const paragrafos = (opts.corpo || [])
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#4a4144;">${p}</p>`)
    .join('');

  // Documento completo, e não um fragmento: é o `<head>` que carrega os metas de
  // color-scheme. Sem eles, o modo escuro do Gmail e do Apple Mail inverte as
  // cores por conta própria e o texto claro sobre a faixa bordo vira texto
  // escuro sobre bordo — ilegível.
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Lume</title>
<style>
  :root { color-scheme: light only; supported-color-schemes: light only; }
  /* Alguns clientes repintam links por conta própria; o botão e o logo não. */
  .lume-inverso, .lume-inverso a { color:#ffffff !important; }
  a { color:${BORDO}; }
</style>
</head>
<body style="margin:0;padding:0;background-color:${OFFWHITE};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${OFFWHITE};padding:32px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px -18px rgba(44,37,39,0.22);">
        <tr>
          <!-- Cor SÓLIDA, sem gradiente. O modo escuro do Gmail decide o que
               inverter olhando o background-color; com um linear-gradient por
               cima ele lê o fundo como claro e escurece o texto branco — foi
               exatamente assim que a faixa ficou ilegível no Android. -->
          <td bgcolor="${BORDO}" class="lume-inverso" style="background-color:${BORDO};padding:28px 32px;">
            <p class="lume-inverso" style="margin:0;font-size:20px;font-weight:700;letter-spacing:0.02em;color:#ffffff;mso-line-height-rule:exactly;">Lume</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;font-weight:600;color:${GRAFITE};">${opts.titulo}</h1>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#4a4144;">${opts.intro}</p>
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
                <td bgcolor="${BORDO}" class="lume-inverso" style="background-color:${BORDO};border-radius:12px;">
                  <a href="${escape(opts.botao.url)}" class="lume-inverso" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${escape(opts.botao.texto)}</a>
                </td>
              </tr>
            </table>`
                : ''
            }
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px;border-top:1px solid ${ROSE};">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#6b6265;">
              ${opts.rodape || `Dúvida? É só responder este e-mail ou <a href="${WHATSAPP_LINK}" style="color:${BORDO};">falar com a gente no WhatsApp</a>.`}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/**
 * Conta criada — os 7 dias de teste começaram. Com `paid`, a conta nasceu já
 * ligada a uma compra da Hubla (compra órfã vinculada no cadastro): nada de
 * "teste grátis" para quem acabou de pagar.
 */
export function welcomeEmail(p: {
  name?: string | null;
  email: string;
  trialEndsAt?: string | null;
  paid?: { plan: PlanType; endsAt?: string | null; months?: number | null } | null;
}): EmailContent {
  const url = appUrl();
  const vence = dataBR(p.trialEndsAt);
  const oi = primeiroNome(p.name);

  if (p.paid) {
    const plano = PLAN_LABEL[p.paid.plan];
    const ate = dataBR(p.paid.endsAt);
    const ciclo = p.paid.months === 12 ? 'anual' : p.paid.months === 1 ? 'mensal' : null;
    return {
      subject: `Sua conta na Lume está pronta — plano ${plano} ativo`,
      text: [
        `Oi, ${oi}!`,
        '',
        `Sua conta na Lume está criada e o plano ${plano} já está ativo.`,
        '',
        `E-mail de acesso: ${p.email}`,
        `Plano: ${plano}${ciclo ? ` (${ciclo})` : ''}`,
        ...(ate ? [`Acesso garantido até: ${ate}`] : []),
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
        intro: `O pagamento já está ligado à sua conta e o plano <strong>${escape(plano)}</strong> está ativo.`,
        destaque: [
          { rotulo: 'E-mail de acesso', valor: p.email },
          { rotulo: 'Plano', valor: `${plano}${ciclo ? ` (${ciclo})` : ''}` },
          ...(ate ? [{ rotulo: 'Acesso garantido até', valor: ate }] : []),
        ],
        corpo: [
          'A senha é a que você escolheu no cadastro. Se não lembrar, use <strong>Esqueci minha senha</strong> na tela de login.',
          'Uma dica pra começar: cadastre seus serviços e horários primeiro. Em poucos minutos seu link de agendamento já está pronto pra ir na bio.',
        ],
        botao: { texto: 'Entrar no painel', url: `${url}/login` },
      }),
    };
  }

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

/**
 * Pagou na Hubla e ainda não tem conta (compra órfã). O link já leva o e-mail
 * da compra preenchido: é esse e-mail que liga o pagamento à conta nova.
 */
export function orphanWelcomeEmail(p: {
  name?: string | null;
  email: string;
  plan: PlanType | null;
  months?: number | null;
  signupUrl: string;
}): EmailContent {
  const oi = primeiroNome(p.name);
  const plano = p.plan ? PLAN_LABEL[p.plan] : null;
  const ciclo = p.months === 12 ? 'anual' : p.months === 1 ? 'mensal' : null;
  const oQue = plano ? `o plano ${plano}` : 'a sua assinatura';

  return {
    subject: 'Pagamento aprovado! Falta só criar sua conta na Lume',
    text: [
      `Oi, ${oi}! Seu pagamento foi aprovado.`,
      '',
      `Falta um passo: criar sua conta na Lume. Assim que você criar, ${oQue} ativa na hora.`,
      '',
      `Criar minha conta: ${p.signupUrl}`,
      '',
      `Use este mesmo e-mail no cadastro: ${p.email}`,
      'É ele que liga o pagamento à sua conta.',
      '',
      'Já criou a conta com outro e-mail? Responda esta mensagem dizendo qual, que a gente liga o pagamento pra você.',
      '',
      'Equipe Lume',
    ].join('\n'),
    html: layout({
      titulo: `Pagamento aprovado, ${escape(oi)}! Falta só criar sua conta.`,
      intro: `Assim que você criar sua conta na Lume, ${escape(oQue)} ativa na hora. Leva um minuto.`,
      destaque: [
        { rotulo: 'E-mail da compra', valor: p.email },
        ...(plano ? [{ rotulo: 'Plano', valor: `${plano}${ciclo ? ` (${ciclo})` : ''}` }] : []),
      ],
      corpo: [
        'Use <strong>este mesmo e-mail</strong> no cadastro: é ele que liga o pagamento à sua conta. O botão abaixo já abre o cadastro com ele preenchido.',
        'Já criou a conta com outro e-mail? Responda esta mensagem dizendo qual, que a gente liga o pagamento pra você.',
      ],
      botao: { texto: 'Criar minha conta', url: p.signupUrl },
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

/** Solicitação de redefinição de senha. */
/** Link de confirmação do cadastro (lib/auth/email-confirm.ts). */
export function confirmEmailTemplate(p: { name?: string | null; confirmUrl: string }): EmailContent {
  const oi = primeiroNome(p.name);
  return {
    subject: 'Confirme seu e-mail para entrar na Lume',
    text: [
      `Oi, ${oi}!`,
      '',
      'Sua conta na Lume foi criada. Falta só confirmar que este e-mail é seu:',
      p.confirmUrl,
      '',
      'Depois de confirmar, é só entrar com o e-mail e a senha que você escolheu. O link vale por 3 dias.',
      '',
      'Se não foi você quem criou a conta, ignore esta mensagem: sem a confirmação ninguém entra.',
      '',
      'Equipe Lume',
    ].join('\n'),
    html: layout({
      titulo: `Oi, ${escape(oi)}! Confirme seu e-mail.`,
      intro: 'Sua conta na Lume foi criada. Falta só confirmar que este e-mail é seu.',
      corpo: [
        'Depois de confirmar, é só entrar com o e-mail e a senha que você escolheu. O link vale por <strong>3 dias</strong>.',
        'Se não foi você quem criou a conta, ignore esta mensagem: sem a confirmação ninguém entra.',
      ],
      botao: { texto: 'Confirmar meu e-mail', url: p.confirmUrl },
    }),
  };
}

export function passwordResetEmail(p: {
  name?: string | null;
  resetUrl: string;
}): EmailContent {
  const oi = primeiroNome(p.name);

  return {
    subject: 'Redefinição de senha da sua conta Lume',
    text: [
      `Oi, ${oi}!`,
      '',
      'Recebemos uma solicitação para redefinir a senha de acesso à sua conta na Lume.',
      '',
      `Clique no link abaixo para criar uma nova senha (válido por 1 hora):`,
      p.resetUrl,
      '',
      'Se não foi você quem pediu a troca, pode ignorar esta mensagem com segurança — sua senha atual continua a mesma.',
      '',
      'Equipe Lume',
    ].join('\n'),
    html: layout({
      titulo: 'Redefinição de senha',
      intro: `Oi, ${escape(oi)}! Recebemos um pedido para criar uma nova senha para a sua conta na Lume.`,
      corpo: [
        'Clique no botão abaixo para definir sua nova senha. Por segurança, este link é de <strong>uso único e expira em 1 hora</strong>.',
        'Se não foi você quem solicitou, pode ignorar este e-mail tranquilamente — sua senha atual continua protegida.',
      ],
      botao: { texto: 'Criar nova senha', url: p.resetUrl },
    }),
  };
}


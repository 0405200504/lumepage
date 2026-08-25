/**
 * Dispara os e-mails transacionais de verdade, pra conferir no cliente de
 * e-mail antes de qualquer cliente receber.
 *
 *   npx tsx scripts/test-emails.mts <destinatario> [template]
 *
 * Sem `template`, manda os quatro. Templates: boas-vindas, assinatura,
 * pagamento-falhou, encerrada.
 *
 * Usa o MESMO caminho da aplicação (lib/mail.ts + lib/mail-templates.ts), então
 * o que chegar aqui é exatamente o que a profissional recebe. Lê RESEND_API_KEY
 * e MAIL_FROM do ambiente — carregue o .env antes:
 *
 *   node --env-file=.env node_modules/.bin/tsx scripts/test-emails.mts voce@exemplo.com
 */

import { sendMail } from '../lib/mail';
import {
  welcomeEmail,
  subscriptionActivatedEmail,
  paymentFailedEmail,
  subscriptionEndedEmail,
} from '../lib/mail-templates';

const [, , destinatario, apenas] = process.argv;

if (!destinatario) {
  console.error('Uso: npx tsx scripts/test-emails.mts <destinatario> [boas-vindas|assinatura|pagamento-falhou|encerrada]');
  process.exit(1);
}

if (!process.env.RESEND_API_KEY) {
  console.error('RESEND_API_KEY ausente. Rode com: node --env-file=.env node_modules/.bin/tsx scripts/test-emails.mts ...');
  process.exit(1);
}

const dias = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();

const templates = {
  'boas-vindas': () =>
    welcomeEmail({ name: 'Maria Aparecida da Silva', email: destinatario, trialEndsAt: dias(7) }),
  assinatura: () =>
    subscriptionActivatedEmail({ name: 'Maria Aparecida da Silva', plan: 'pro', endsAt: dias(368), months: 12 }),
  'pagamento-falhou': () => paymentFailedEmail({ name: 'Maria', endsAt: dias(21) }),
  encerrada: () => subscriptionEndedEmail({ name: 'Maria' }),
} as const;

const escolhidos = apenas ? [apenas] : Object.keys(templates);

for (const nome of escolhidos) {
  const build = templates[nome as keyof typeof templates];
  if (!build) {
    console.error(`Template desconhecido: ${nome}. Use ${Object.keys(templates).join(', ')}.`);
    process.exit(1);
  }
  const conteudo = build();
  const r = await sendMail({ to: destinatario, ...conteudo });
  const marca = r.sent ? '✓' : r.skipped ? '— (pulado: sem chave)' : `✗ ${r.error}`;
  console.log(`${marca}  ${nome.padEnd(18)} ${conteudo.subject}`);
}

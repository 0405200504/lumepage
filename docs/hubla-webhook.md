# Hubla → Lume: liberar o plano sozinho quando a cliente compra

Quando alguém paga um dos seis checkouts, a Hubla avisa o Lume e o acesso é
liberado na hora — sem ninguém mexer no admin. Este guia é o passo a passo dessa
ligação, e o que fazer quando algo não chega.

O código vive em:

- `app/api/webhooks/hubla/route.ts` — o endpoint que recebe e aplica
- `lib/subscription/hubla.ts` — leitura do payload e de-para checkout → plano
- `lib/lp/site.ts` — os seis links de checkout (a fonte de tudo)
- `lib/subscription/activation.ts` — a regra que aplica o plano (webhook, admin e cadastro usam a mesma)
- `lib/subscription/orphans.ts` — compras órfãs: fila, e-mail com link do cadastro, vínculo automático
- `supabase/migration_v37_hubla_webhook.sql` — log e deduplicação
- `supabase/migration_v42_hubla_orphans.sql` — um e-mail de boas-vindas por compradora órfã

---

## Passo 1 — Rodar a migration

No Supabase → **SQL Editor** → New query → cole
`supabase/migration_v37_hubla_webhook.sql` → **Run**.

Ela cria `hubla_webhook_events`, que guarda cada aviso recebido e impede que o
mesmo aviso seja aplicado duas vezes. O webhook funciona sem ela, mas aí você
perde o histórico e a proteção contra evento repetido — rode.

Se ainda não rodou a **v26**, **v27**, **v28** e a **v33**, rode antes: são elas
que criam `subscription_status`, `subscription_plan`, `subscription_ends_at`,
`hubla_subscription_id` e o histórico `subscription_events`.

## Passo 2 — Pegar o token na Hubla

1. Entre em [app.hub.la](https://app.hub.la) → menu lateral → **Integrações**
2. Seção **Automações** → **Webhook** → ative a integração
3. Aba **Autenticação** → copie o **Hubla Webhook Token**

## Passo 3 — Colocar o token no Lume

Na Vercel (ou onde o app está hospedado) → Settings → Environment Variables:

```
HUBLA_WEBHOOK_TOKEN=<o token copiado>
```

E no `.env` local, pra testar. **Sem essa variável o webhook recusa tudo com 503**
— é proposital: melhor não receber do que aceitar qualquer um que descubra a URL.

Depois de salvar, **faça um redeploy** — variável nova só vale no próximo build.

## Passo 4 — Criar a regra na Hubla

Ainda em **Integrações → Webhook**, crie uma regra apontando para:

```
https://<seu-domínio>/api/webhooks/hubla
```

Tem que ser HTTPS e público (a Hubla não segue redirect — se o seu domínio
redireciona `www` ↔ raiz, use exatamente a URL final).

**Eventos para marcar:**

| Evento | O que o Lume faz |
| --- | --- |
| `invoice.payment_succeeded` | libera o acesso e grava o plano (é o principal) |
| `subscription.activated` | libera o acesso (reforço, quando a assinatura ativa) |
| `customer.member_added` | libera o acesso |
| `invoice.payment_failed` | marca `past_due` — **não** corta o acesso |
| `invoice.refunded` | corta o acesso |
| `subscription.deactivated` | corta o acesso |
| `customer.member_removed` | corta o acesso |

Marcar os três de liberação não duplica nada: eles chegam para a mesma venda e o
segundo apenas reescreve o mesmo estado.

Se a regra tiver o campo **"Como enviar seus dados"**, tanto faz: o webhook lê os
dois formatos (integração recomendada e modo de compatibilidade).

## Passo 5 — Testar

Na própria Hubla: na listagem de regras → mais opções → **Testar configuração**.
Os dados são fictícios, então o Lume responde `{"sandbox": true}` sem tocar em
conta nenhuma — o que esse teste prova é que a URL e o token estão certos.

O teste fica registrado em `hubla_webhook_events` com `result = 'sandbox'`, então
dá pra confirmar que ele chegou sem abrir o painel:

```sql
select received_at, event_type, result from hubla_webhook_events
where result = 'sandbox' order by received_at desc;
```

Para testar de verdade, com uma conta real:

```bash
HUBLA_WEBHOOK_TOKEN=<token> npx tsx scripts/test-hubla.mts email@da-conta.com pro anual
```

Ele monta o payload no formato da Hubla e bate no `localhost:3000`. Aponte para
produção com `WEBHOOK_URL=`, e troque o evento com `EVENT=subscription.deactivated`.

---

## Como o Lume descobre de quem é a compra

Em ordem, do vínculo mais forte para o mais frouxo:

1. **`sck`** — todo checkout aberto de dentro do painel (paywall e telas de
   upgrade) leva `?sck=<id da profissional>`, e a Hubla devolve isso no aviso.
   Esse é o vínculo que não depende do que a pessoa digita.
2. **Assinatura já vinculada** (`hubla_subscription_id`) — renovação e cancelamento.
3. **E-mail da compra**, comparado sem diferenciar maiúsculas.
4. **Telefone** (últimos 8 dígitos), para quem comprou com outro e-mail.

Quem compra direto pela página de vendas (sem conta ainda) só tem o e-mail. Se
ela usar um e-mail diferente no cadastro, nada é liberado e o evento fica
registrado como órfão — veja abaixo.

## O que é gravado ao liberar

- `subscription_status` = `active`
- `subscription_plan` = o plano do checkout comprado
- `subscription_ends_at` = hoje + ciclo + **3 dias de folga** (a folga evita o
  paywall aparecer nas horas entre a renovação e o aviso da Hubla)
- `hubla_subscription_id` = a assinatura, para reconhecer as renovações
- uma linha em `subscription_events` (o histórico que o admin já mostra)

O ciclo vem de `billingCycleMonths` da própria assinatura; se não vier, do link
comprado (mensal = 1, anual = 12).

**Se o checkout comprado não estiver no de-para** (link novo criado direto na
Hubla, por exemplo), o acesso é liberado mantendo o plano que a conta já tinha —
o Lume não chuta um plano superior. O evento fica com `result =
'activated_unmapped'`. A correção é adicionar o link em `lib/lp/site.ts`.

## Trocar ou criar links de checkout

Mexa **só** em `CHECKOUT`, em `lib/lp/site.ts`. Dali saem a página de vendas, o
paywall, o CTA de upgrade e o de-para do webhook. Link cadastrado em outro lugar
vira venda que o webhook não sabe mapear.

## Quando não chega

1. **Hubla → Integrações → Webhook → Histórico.** Cada envio mostra o corpo, o
   status devolvido e as tentativas.
   - `401` → token errado no `HUBLA_WEBHOOK_TOKEN` (ou faltou redeploy)
   - `503` → a variável não existe no ambiente
   - `3xx` → a URL está redirecionando; use a URL final
   - `500` → falha nossa; a Hubla retenta 5 vezes, e o log do servidor tem o motivo
2. **Compras órfãs** (pagou e não achamos a conta): admin → Financeiro →
   **Compras órfãs** (`/admin/subscriptions/orphans`). Uma linha por compradora
   (os três avisos da mesma venda viram uma só), com plano, valor e se o e-mail
   com o link do cadastro já saiu. Dali dá pra vincular a uma conta (o plano é
   aplicado na hora), reenviar o e-mail, copiar o link pra mandar no WhatsApp ou
   descartar.

3. Rodando falha por dias seguidos, a Hubla **desativa a regra** e avisa por
   e-mail. Se parou tudo de uma vez, confira se a regra ainda está ativa.

## E-mails disparados

Com `RESEND_API_KEY` e `MAIL_FROM` configuradas (ver `.env.example`), cada
mudança de estado avisa a profissional — no e-mail da **conta**, não no do
pagador, que pode ser outro:

| Evento | E-mail |
| --- | --- |
| Acesso liberado | *Parabéns! Seu plano X está ativo* |
| `invoice.payment_failed` | *Não conseguimos confirmar seu pagamento* |
| Cancelamento ou reembolso | *Sua assinatura da Lume foi encerrada* |
| Pagou e não tem conta (vai para o e-mail da **compra**) | *Pagamento aprovado! Falta só criar sua conta na Lume* |

O disparo só acontece quando o estado **muda de verdade**. Os três eventos de
liberação (`invoice.payment_succeeded`, `subscription.activated`,
`customer.member_added`) chegam pela mesma compra: o primeiro manda o e-mail, os
outros atualizam o banco em silêncio.

Falha de envio nunca vira erro para a Hubla — o acesso já foi liberado, e um 500
faria ela reenviar o evento inteiro. Sem a chave configurada, tudo é pulado.

Para conferir os textos: `npx tsx scripts/test-emails.mts voce@exemplo.com`
(carregue o `.env` antes com `set -a && . ./.env && set +a`).

## Compra sem conta (compra órfã)

Quem compra direto pela página de vendas ainda não tem conta. O caminho é:

1. O aviso chega, ninguém tem aquele e-mail → fica `result = 'unmatched'`.
2. A compradora recebe **"Pagamento aprovado! Falta só criar sua conta na
   Lume"**, com um botão pro cadastro já com o e-mail da compra preenchido. O
   link é assinado (HMAC com `SESSION_SECRET`): só ele faz a tela de cadastro
   dizer "seu plano já está pago" — sem assinatura, ninguém descobre quem
   comprou digitando e-mails na URL.
3. Ela se cadastra com aquele e-mail (formulário ou Google, ou o admin cria a
   conta) → o plano ativa **na hora**, os avisos viram `claimed_signup` /
   `claimed_google` / `claimed_admin` e o e-mail de boas-vindas fala do plano
   pago, não do teste grátis.

Os três avisos de uma venda chegam quase juntos, em funções separadas. A
`migration_v42_hubla_orphans.sql` garante **um** e-mail por compradora (o
e-mail é chave primária de `hubla_orphan_notices`). Sem ela, o e-mail só sai no
`invoice.payment_succeeded` — um por cobrança — e o admin não mostra quando foi
enviado.

## Depois da compra — configurar na Hubla

Por padrão a Hubla manda a compradora para a área de membros dela
(`hub.la/g/<produto>` ou `app.hub.la/user_groups`), que no caso da Lume está
vazia. Troque o **redirecionamento pós-compra** de cada uma das seis ofertas
para o cadastro, com o plano na URL:

| Ofertas | Redirecionar para |
| --- | --- |
| Start mensal e anual | `https://www.lumepage.com.br/register?plano=start` |
| Pro mensal e anual | `https://www.lumepage.com.br/register?plano=pro` |
| Premium mensal e anual | `https://www.lumepage.com.br/register?plano=premium` |

Com `?plano=`, a tela de cadastro troca "teste grátis" por "Falta só criar sua
conta — use o mesmo e-mail da compra". Se ela se cadastrar antes de o aviso da
Hubla chegar, tudo bem: o aviso encontra a conta pelo e-mail e libera.

Para conferir sem abrir o painel: o valor atual aparece no HTML público do
checkout, no campo `redirectAfterPurchaseUrl`.

## O que o webhook não faz

- **Não cria conta.** Cria a compra órfã e avisa a compradora (seção acima).
- **Não mexe em conta legada.** Contas criadas antes do marco em
  `ENTITLEMENTS_CUTOFF` (`lib/subscription/entitlements.ts`) têm acesso cheio de
  qualquer jeito.
- **Não corta na hora do calote.** `invoice.payment_failed` só marca `past_due`;
  o acesso segue até o vencimento gravado, enquanto a Hubla retenta o cartão.

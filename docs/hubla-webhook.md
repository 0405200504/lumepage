# Hubla → Lume: liberar o plano sozinho quando a cliente compra

Quando alguém paga um dos seis checkouts, a Hubla avisa o Lume e o acesso é
liberado na hora — sem ninguém mexer no admin. Este guia é o passo a passo dessa
ligação, e o que fazer quando algo não chega.

O código vive em:

- `app/api/webhooks/hubla/route.ts` — o endpoint que recebe e aplica
- `lib/subscription/hubla.ts` — leitura do payload e de-para checkout → plano
- `lib/lp/site.ts` — os seis links de checkout (a fonte de tudo)
- `supabase/migration_v37_hubla_webhook.sql` — log e deduplicação

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
2. **Pagamentos órfãos** (pagou e não achamos a conta):

```sql
select received_at, email, event_type, payload->'event'->'user' as comprador
from hubla_webhook_events
where result = 'unmatched'
order by received_at desc;
```

Achou o e-mail certo? Ative no `/admin` mesmo, e depois acerte o e-mail da conta
para as renovações caírem sozinhas.

3. Rodando falha por dias seguidos, a Hubla **desativa a regra** e avisa por
   e-mail. Se parou tudo de uma vez, confira se a regra ainda está ativa.

## O que o webhook não faz

- **Não cria conta.** Quem compra sem ter cadastro precisa se cadastrar com o
  mesmo e-mail; o próximo aviso da Hubla (ou a ativação manual) libera.
- **Não mexe em conta legada.** Contas criadas antes do marco em
  `ENTITLEMENTS_CUTOFF` (`lib/subscription/entitlements.ts`) têm acesso cheio de
  qualquer jeito.
- **Não corta na hora do calote.** `invoice.payment_failed` só marca `past_due`;
  o acesso segue até o vencimento gravado, enquanto a Hubla retenta o cartão.

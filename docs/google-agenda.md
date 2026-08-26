# Google Agenda + login com Google

Guia de configuração da integração.

**Estado em 25/08/2026** — projeto Google `pioneering-fuze-506622-v6`, app em
`https://www.lumepage.com.br` (o apex redireciona para o www), Supabase
`hceahrzwxdzwmkdjtvko`:

| Etapa | Status |
|---|---|
| Projeto no Google Cloud + credenciais OAuth | ✅ criado |
| URIs de redirecionamento com **www** | ✅ cadastrado (o apex saiu) |
| Provider Google no Supabase + Site/Redirect URLs | ✅ configurado |
| `GOOGLE_*` e `NEXT_PUBLIC_APP_URL` no `.env` local | ✅ |
| As mesmas variáveis na **Vercel** (production + preview) | ✅ atualizadas para o projeto novo |
| `migration_v38_google_onboarding.sql` | ✅ aplicada |
| `migration_v39_cron_google.sql` (job `lume-google-sync`) | ✅ aplicada, a cada 15 min |
| Deploy do código novo em produção | ⬜ falta |
| Publicar o app (sai o limite de 7 dias do refresh token) | ✅ publicado |
| Verificação da **marca** (nome/logo) | ✅ aprovada |
| Verificação do **escopo** `calendar.events` | ⬜ falta — ver `docs/google-verificacao.md` |

---

## 1. Projeto no Google Cloud

Faça tudo logada na **conta Google profissional do domínio** — ela vira a dona
do app e é para ela que o Google escreve durante a verificação.

1. Acesse [console.cloud.google.com](https://console.cloud.google.com) e crie um
   projeto (ex.: `lume-agendamentos`).
2. **APIs e serviços → Biblioteca** → busque **Google Calendar API** → **Ativar**.

## 2. Tela de consentimento

Em **Google Auth Platform** (antiga "Tela de permissão OAuth"):

| Campo | Valor |
|---|---|
| Tipo de usuário / Público | **Externo** |
| Nome do app | Lume Agendamentos |
| E-mail de suporte | o e-mail da conta profissional |
| Domínio autorizado | `lumepage.com.br` |
| Página inicial | `https://lumepage.com.br` |
| Política de privacidade | `https://lumepage.com.br/privacidade` |
| Termos de uso | `https://lumepage.com.br/termos` |

> **Interno** só funciona para contas do mesmo Google Workspace — as
> profissionais que usam Gmail comum não conseguiriam conectar.

**Escopos** (Acesso a dados → Adicionar ou remover escopos):

- `.../auth/userinfo.email` e `openid` — quem é a pessoa (login)
- `.../auth/calendar.events` — criar/editar/ler eventos da agenda

`calendar.events` é **escopo sensível**. Consequências práticas:

- Enquanto o app estiver em **Teste**: até 100 contas, cadastradas uma a uma em
  "Usuários de teste", e o **refresh token expira em 7 dias** — a conexão de cada
  profissional cai sozinha toda semana. Serve para você testar, não para vender.
- Para liberar geral é preciso **publicar e passar pela verificação** do Google
  (veja o item 7). O login com Google (só e-mail/perfil) **não** precisa de
  verificação — por isso as duas coisas são separadas na Lume: entrar com Google
  funciona para qualquer pessoa desde o primeiro dia; conectar a agenda é opcional.

## 3. Credenciais OAuth

**APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth →
Aplicativo da Web**.

**Origens JavaScript autorizadas**
```
https://www.lumepage.com.br
https://lumepage.com.br
```

**URIs de redirecionamento autorizados** — sem barra no fim:
```
https://www.lumepage.com.br/api/google/callback
https://lumepage.com.br/api/google/callback
https://hceahrzwxdzwmkdjtvko.supabase.co/auth/v1/callback
```

> ⚠️ O **www** é o que importa: é o endereço em que o app responde de verdade
> (o apex redireciona para ele), e é o que o Lume envia como `redirect_uri`.
> Sem ele cadastrado, o Google recusa com `redirect_uri_mismatch`.

O primeiro é a conexão da agenda (rota da própria Lume). O último é o login com
Google, que passa pelo Supabase. Se for testar em `localhost`, acrescente
`http://localhost:3000/api/google/callback`.

Guarde o **ID do cliente** e a **chave secreta**.

## 4. Supabase (login com Google)

Já configurado no projeto `hceahrzwxdzwmkdjtvko` (via Management API):

- **Providers → Google**: ativado com o client do projeto
  `pioneering-fuze-506622-v6`.
- **URL Configuration** → *Site URL* `https://www.lumepage.com.br`;
  *Redirect URLs* com www, apex, `lume-agendamentos.vercel.app` e
  `http://localhost:3000/auth/callback`.

## 5. Variáveis de ambiente

Na Vercel (Production **e** Preview) e no `.env` local:

```
GOOGLE_CLIENT_ID=54508355675-...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
NEXT_PUBLIC_APP_URL=https://www.lumepage.com.br
```

Já estão no `.env` local e na Vercel (production + preview), incluindo
`GOOGLE_REDIRECT_URI=https://www.lumepage.com.br/api/google/callback`. Como
`NEXT_PUBLIC_APP_URL` entra no bundle em tempo de build, ela só vale a partir do
próximo deploy.

`GOOGLE_REDIRECT_URI` é opcional: sem ela, o app usa
`NEXT_PUBLIC_APP_URL + /api/google/callback`. Se preencher, tem que ser
**idêntica** à cadastrada no item 3.

> `NEXT_PUBLIC_APP_URL` errado quebra a integração inteira: é dela que saem o
> redirect do OAuth e o endereço do webhook que o Google chama.

## 6. Banco (SQL Editor do Supabase)

1. ✅ `migration_v25_google_calendar.sql` — tabela de conexões.
2. ✅ `migration_v38_google_onboarding.sql` — bloqueios com o id do evento, token
   do webhook e o campo de onboarding (aplicada em 25/08/2026).
3. ✅ `migration_v39_cron_google.sql` — job `lume-google-sync` a cada 15 min
   (aplicado em 25/08/2026 apontando para `https://www.lumepage.com.br`).

> O job `lume-reminders` (automações do WhatsApp) ainda chama
> `lume-agendamentos.vercel.app`. Continua funcionando, mas vale reapontar para
> o domínio novo quando mexer no SQL Editor — é o mesmo formato da v22.

## 7. Verificação do app (para vender)

Publique o app ("Publicar app" na Google Auth Platform) e envie para verificação.
O Google pede:

- **Domínio verificado** no [Search Console](https://search.google.com/search-console)
  com a mesma conta dona do projeto;
- política de privacidade no ar, no mesmo domínio, dizendo o que é feito com os
  dados da agenda (já está em `/privacidade`, seção 4.1, incluindo a declaração
  de *Limited Use* que eles exigem);
- **vídeo no YouTube** (pode ser não listado) mostrando: o consentimento do
  Google aparecendo no app, para que serve cada escopo, e a URL do app na barra
  de endereço;
- justificativa de por que `calendar.events` é necessário.

A análise costuma levar de dias a algumas semanas. Enquanto isso, quem conectar
vê a tela "O Google não verificou este app" (dá para prosseguir em *Avançado →
Acessar*), e continua valendo o limite de 100 usuários de teste.

---

## Como funciona por dentro

| Peça | Onde |
|---|---|
| Entrar/cadastrar com Google | `components/auth/GoogleButton.tsx` → `app/auth/callback/page.tsx` → `authService.loginWithGoogle` |
| Boas-vindas da conta nova | `app/(auth)/bem-vinda/page.tsx` + `completeOnboardingAction` |
| Conectar a agenda | `/api/google/auth` → Google → `/api/google/callback` |
| Lume → Google | `syncAppointmentToGoogle` (chamado ao criar/editar/cancelar) |
| Google → Lume | push em `/api/google/webhook`; fallback a cada 15 min em `/api/cron/google-sync` |
| Sincronizar na hora | botão em Configurações → Integrações (`/api/google/sync`) |

**Lume → Google:** cada agendamento vira um evento marcado com
`extendedProperties.private.source = lume`, o que evita que ele volte como
bloqueio no sentido contrário.

**Google → Lume:** todo evento que ocupa horário na agenda conectada vira um
`time_block`, e o horário some da página pública. Não viram bloqueio: eventos
marcados como "Disponível" (*transparent*), convites recusados e eventos
cancelados. Evento de dia inteiro bloqueia o dia (no máximo 62 dias por evento,
para um "aniversário" anual não gerar milhares de bloqueios).

**Ao desconectar**, os tokens são revogados, o canal de push é encerrado e os
bloqueios vindos do Google são apagados — senão a agenda ficaria travada por
compromissos que ninguém mais consegue atualizar.

## Quando não funcionar

| Sintoma | Causa provável |
|---|---|
| `redirect_uri_mismatch` | A URI do item 3 não bate com `NEXT_PUBLIC_APP_URL`/`GOOGLE_REDIRECT_URI` (barra no fim conta; `www` conta). |
| Botão "Conectar" volta com `?google=nao_configurado` | Falta `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` no ambiente. |
| Conexão cai depois de ~7 dias | App ainda em modo **Teste** (item 2). Publicar resolve. |
| Agenda só atualiza de 15 em 15 min | O push não foi registrado: o webhook precisa de HTTPS público — em `localhost` o Google não entrega, e o cron cobre. |
| `invalid_grant` no painel | A profissional revogou o acesso em myaccount.google.com. Desconectar e conectar de novo. |
| Horários chegam 3h adiantados | Sinal de código convertendo fuso na mão: toda conversão passa por `toBrParts` em `lib/google/calendar.ts`. |

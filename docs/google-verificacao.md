# Verificação do escopo sensível no Google

O app já está **publicado** e com a **marca verificada**. Falta a verificação do
escopo sensível `calendar.events` — enquanto ela não sai, quem conecta a agenda
vê "O Google não verificou este app" (dá para seguir em *Avançado → Acessar*) e
vale um teto de ~100 contas que concederam consentimento.

Onde: [Google Auth Platform → Acesso a dados](https://console.cloud.google.com/auth/scopes?project=pioneering-fuze-506622-v6)
→ **Preparar para verificação** / **Enviar para verificação**.

## Antes de enviar (checklist)

- [ ] `lumepage.com.br` verificado no [Search Console](https://search.google.com/search-console)
      com a **mesma conta** dona do projeto Google — é a trava que mais reprova.
- [ ] Domínio autorizado, política e termos preenchidos na Identidade visual:
      `https://www.lumepage.com.br/privacidade` e `/termos`.
- [ ] A política precisa estar **no ar** com a seção sobre dados da agenda
      (seção 4.1 — sobe no próximo deploy).
- [ ] Escopos pedidos: só `.../auth/calendar.events` como sensível.
      `openid`, `email` e `profile` (o login) não precisam de verificação.
- [ ] E-mail de contato que alguém leia — o Google responde por lá e o pedido
      caduca se ficar sem resposta.

## Justificativa do escopo (copiar e colar)

> **Português**
>
> O Lume é uma agenda online para profissionais de beleza e estética. As clientes
> agendam pela página pública da profissional, e a profissional gerencia esses
> horários no painel.
>
> Usamos `https://www.googleapis.com/auth/calendar.events` exclusivamente na
> agenda da própria profissional que autorizou o acesso, para duas funções:
> (1) criar, atualizar e cancelar no Google Agenda os eventos correspondentes aos
> agendamentos feitos no Lume, para que ela veja tudo em um lugar só; e (2) ler os
> eventos existentes para saber quais horários já estão ocupados e impedir que uma
> cliente agende em cima de um compromisso pessoal dela.
>
> Dos eventos lidos, guardamos apenas data, horário e o identificador do evento —
> nunca convidados, anexos ou o conteúdo da descrição. Não usamos esses dados para
> publicidade, não os vendemos, não os compartilhamos e não treinamos modelos de
> IA com eles. Um escopo mais restrito não atende: `calendar.readonly` não
> permitiria criar os agendamentos na agenda dela, e `calendar.app.created` não
> permitiria enxergar os compromissos que ela já tinha, que é justamente o que
> evita o conflito de horário.

> **English**
>
> Lume is an online scheduling tool for beauty and aesthetics professionals.
> Clients book through the professional's public page, and the professional
> manages those appointments in her dashboard.
>
> We use `https://www.googleapis.com/auth/calendar.events` only on the calendar of
> the professional who granted access, for two purposes: (1) create, update and
> cancel Google Calendar events matching the appointments booked in Lume, so she
> sees everything in one place; and (2) read existing events to know which time
> slots are busy and prevent a client from booking over her personal commitments.
>
> From the events we read, we store only date, time and the event id — never
> attendees, attachments or description content. We do not use this data for
> advertising, do not sell or share it, and do not train AI models with it. A
> narrower scope does not work: `calendar.readonly` would not let us write her
> appointments, and `calendar.app.created` would not let us see her pre-existing
> commitments, which is exactly what prevents double booking.

## Roteiro do vídeo (YouTube, pode ser "não listado")

Grave a tela com a **barra de endereço visível o tempo todo** — o Google reprova
vídeo sem a URL aparecendo. 2 a 3 minutos bastam.

1. Abra `https://www.lumepage.com.br` e mostre a URL.
2. Faça login como profissional e vá em **Configurações → Integrações**.
3. Clique em **Conectar Google Agenda** e mostre a tela de consentimento do
   Google inteira, com o nome do app e o escopo pedido aparecendo.
4. Autorize e mostre a volta para o painel com "Conectado como …".
5. Crie um agendamento no Lume e mostre o evento aparecendo no Google Agenda.
6. Crie um compromisso direto no Google Agenda e mostre aquele horário sumindo
   da página pública de agendamento (é a justificativa da leitura).
7. Termine em **Desconectar**, mostrando que a profissional revoga quando quiser.

Fale (ou legende) o que cada passo faz. Se o vídeo estiver em português, ative
legendas automáticas ou descreva os passos na descrição do vídeo em inglês.

## Depois de enviar

A análise leva de dias a algumas semanas e costuma vir com pedidos de ajuste por
e-mail. Nada disso bloqueia o uso: até lá, a integração funciona com o aviso de
app não verificado.

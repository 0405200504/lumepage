# Guia Completo de Integração com a Cloudflare

Este guia orienta a configuração completa da **Cloudflare** para a Lume, cobrindo:
1. **Configuração de DNS para o Resend** (garantir que os e-mails cheguem 100% na caixa de entrada)
2. **Ativação do Cloudflare Turnstile** (proteção anti-bot invisível e gratuita no agendamento)
3. **Configuração de SSL e Domínio (Vercel/Next.js)**

---

## 1. Configuração de DNS para o Resend (E-mails Transacionais)

Para que os e-mails de **Recuperação de Senha**, **Boas-vindas** e **Confirmação de Plano** saiam com o remetente oficial `nao-responda@lumepage.com.br` sem cair no spam, configure os registros DNS na Cloudflare:

### Passo a Passo:
1. Acesse **[resend.com/domains](https://resend.com/domains)** e clique em **Add Domain** (`lumepage.com.br`).
2. O Resend vai gerar 3 registros DNS principais.
3. No painel da **Cloudflare** ([dash.cloudflare.com](https://dash.cloudflare.com)):
   - Selecione o domínio `lumepage.com.br`.
   - Clique no menu lateral em **DNS** → **Records**.
   - Clique em **Add record** e insira os registros:

| Tipo | Nome (Name) | Conteúdo (Value / Target) | Proxy status |
| :--- | :--- | :--- | :--- |
| **TXT** (DKIM) | `resend._domainkey` | *(Copie o valor fornecido no painel do Resend)* | **DNS only (Cinza)** |
| **MX** (SPF/Bounces) | `bounces` | `feedback-smtp.us-east-1.amazonses.com` (prioridade 10) | **DNS only (Cinza)** |
| **TXT** (SPF) | `bounces` | `v=spf1 include:amazonses.com ~all` | **DNS only (Cinza)** |
| **TXT** (DMARC) | `_dmarc` | `v=DMARC1; p=none;` | **DNS only (Cinza)** |

> [!IMPORTANT]
> Todos os registros de e-mail (MX e TXT) devem ficar no modo **DNS only (nuvem cinza)**, sem o proxy laranja da Cloudflare.
> Após adicionar, volte ao Resend e clique em **Verify DNS Records**.

---

## 2. Ativação do Cloudflare Turnstile (Anti-Bot Invisível)

O projeto Lume já vem com código pronto para o Turnstile (`lib/turnstile.ts` e `components/booking/TurnstileWidget.tsx`).

### Como Ativar:
1. No painel da Cloudflare ([dash.cloudflare.com](https://dash.cloudflare.com)), clique em **Turnstile** no menu lateral.
2. Clique em **Add site**:
   - **Site name**: `Lume Agendamentos`
   - **Domain**: `lumepage.com.br` (adicione também `localhost` para testes locais)
   - **Widget Mode**: `Managed` (Invisível / não intrusivo)
3. Ao salvar, você receberá duas chaves:
   - **Site Key** (Pública)
   - **Secret Key** (Privada)
4. Adicione as chaves no arquivo `.env` e nas variáveis da **Vercel**:
   ```env
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAA...
   TURNSTILE_SECRET_KEY=0x4AAAAAA...
   INTERNAL_BOOKING_TOKEN=qualquer_string_secreta_pro_bot
   ```

---

## 3. Configuração de SSL e Domínio com a Vercel

Se o seu domínio `lumepage.com.br` passa pela Cloudflare e está hospedado na Vercel:

1. No painel da Cloudflare:
   - Vá em **SSL/TLS** → configure o modo de criptografia para **Full (Strict)**.
2. Em **DNS** → **Records**:
   - **CNAME** `www` → Apontar para `cname.vercel-dns.com` (com Proxy Laranja ativado).
   - **A** `@` (raiz) → Apontar para `76.76.21.21` (ou CNAME flattening para `cname.vercel-dns.com`).
3. Em **SSL/TLS** → **Edge Certificates**:
   - Ative **Always Use HTTPS** (Sempre usar HTTPS).
   - Ative **Automatic HTTPS Rewrites**.

# Lume Agenda - Sistema de Agendamentos Premium 🌸

O **Lume Agenda** é um ecossistema SaaS de agendamento online e painel administrativo desenvolvido para profissionais de estética e beleza. O sistema foi projetado com uma interface visual sofisticada, moderna, rápida e 100% responsiva (estilo bottom-sheet no mobile e modal desfocado no desktop).

---

## 🚀 Tecnologias Utilizadas

* **Frontend**: Next.js 16 (App Router + Turbopack), React 19, TypeScript
* **Estilização**: TailwindCSS v4 + PostCSS
* **Banco de Dados & Auth**: Supabase (PostgreSQL, Row Level Security RLS, Triggers, Auth)
* **Ícones**: Lucide React
* **Mensagens**: Custom Toast System

---

## 📂 Principais Rotas do Sistema

### Públicas (Landing Pages e Agendamento)
* **`/`**: Landing page principal institucional do Lume Agenda.
* **`/lp/demo-estetica`**: Demonstração de landing page premium da Amanda Costa integrada com o **`BookingModal`**.
* **`/agendar/[slug]`**: Rota pública de agendamento tradicional.
  * *Modo Embed*: Acesse `/agendar/[slug]?embed=true` para ocultar cabeçalhos decorativos e usar o agendamento embutido em iframes externos.

### Autenticação
* **`/login`**: Tela de acesso administrativo/profissional (senha padrão: `lume123456`).
* **`/register`**: Criação de novas contas de profissionais com provisionamento automático de regras e configurações no banco.

### Áreas Logadas (Painéis)
* **`/dashboard`**: Painel da profissional de estética (Amanda Costa).
  * Gerenciamento de agendamentos, clientes, serviços, regras de horário e configurações visuais/comerciais.
* **`/admin`**: Painel administrativo interno da Lume.
  * Cadastro, monitoramento e edição de profissionais da plataforma.

---

## 🛠️ Instalação e Execução

1. Certifique-se de configurar as chaves do Supabase no arquivo `.env`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Gere o build de produção:
   ```bash
   npm run build
   ```

---

## 📖 Tutoriais e Configurações

* Veja o passo a passo de como configurar o Supabase, migrar os dados de teste e como importar/utilizar o Widget de Agendamento no arquivo **[TUTORIAL.md](file:///Users/luiseduardofariafilho/Downloads/lume%20agendamentos/TUTORIAL.md)**.

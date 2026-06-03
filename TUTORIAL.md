# Guia de Configuração e Uso - Lume Agenda 🚀

Este guia vai te ajudar a colocar o banco de dados do **Lume Agenda** para funcionar 100% no seu Supabase e configurar os usuários de teste para o login.

---

## Passo 1: Executar os Scripts SQL no Supabase

Entre no painel do seu projeto no **Supabase** e clique em **SQL Editor** no menu lateral esquerdo. Siga a ordem abaixo criando uma nova query para cada arquivo:

### 1. Criar o Schema Principal (`schema.sql`)
1. Clique em **New query**.
2. Abra o arquivo [schema.sql](file:///Users/luiseduardofariafilho/Downloads/lume%20agendamentos/supabase/schema.sql) no seu editor e copie todo o seu conteúdo.
3. Cole no editor do Supabase e clique em **Run**.
   * *Nota: O arquivo foi atualizado para limpar execuções anteriores, então não dará mais erros de tipo ou tabela existente.*

### 2. Configurar Políticas de Segurança (`policies.sql`)
1. Clique em **New query**.
2. Abra o arquivo [policies.sql](file:///Users/luiseduardofariafilho/Downloads/lume%20agendamentos/supabase/policies.sql) e copie todo o seu conteúdo.
3. Cole no editor do Supabase e clique em **Run**.
   * *Isso habilitará as regras de segurança Row Level Security (RLS) para proteger os dados.*

### 3. Inserir Dados de Teste (`seed.sql`)
1. Clique em **New query**.
2. Abra o arquivo [seed.sql](file:///Users/luiseduardofariafilho/Downloads/lume%20agendamentos/supabase/seed.sql) e copie todo o seu conteúdo.
3. Cole no editor do Supabase e clique em **Run**.
   * *Isso preencherá o banco com o perfil da profissional de teste (Amanda Costa), serviços, regras de disponibilidade e agendamentos fictícios.*

---

## Passo 2: Cadastrar Usuários de Teste no Supabase Auth

Como o banco de dados foi configurado para rodar com o Supabase Auth real, você precisa criar as contas de login correspondentes no painel do Supabase.

1. No painel do Supabase, clique em **Authentication** (ícone de chave no menu lateral).
2. Clique no botão **Add user** e escolha **Create user**.
3. Crie os dois usuários abaixo com a senha de sua preferência (ex: `123456`):
   * **Administrador Lume**:
     * **Email**: `admin@lume.com`
   * **Profissional Estética (Amanda)**:
     * **Email**: `amanda@estetica.com`
4. Deixe marcada a opção para auto-confirmar o email (ou desmarque "Send invite email" para confirmar direto).

> [!IMPORTANT]
> **Como a mágica acontece:** 
> Nós configuramos um trigger no `schema.sql` chamado `on_auth_user_created`. No momento em que você criar esses usuários na aba Authentication, o Supabase irá sincronizar o `ID` deles com o perfil correspondente na tabela `profiles`.

---

## Passo 3: Executar a Aplicação Localmente

1. Certifique-se de que configurou o arquivo `.env.local` com a URL e a Anon Key do seu Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
   ```
2. No terminal do projeto, execute o comando para iniciar em modo de desenvolvimento:
   ```bash
   npm run dev
   ```
3. Abra [http://localhost:3000](http://localhost:3000) no seu navegador.
4. Clique em **Entrar** no canto superior direito e faça login:
   * Use o email `admin@lume.com` ou `amanda@estetica.com` com a senha que você definiu no painel do Supabase.

---

## Estrutura do Banco de Dados

* **`professionals`**: Cadastro das esteticistas (nome, cores da marca, slug da página de agendamento).
* **`profiles`**: Usuários do sistema vinculados ao Supabase Auth (Super Admins da Lume e Profissionais).
* **`services`**: Serviços oferecidos por cada profissional.
* **`availability_rules`**: Regras de horário de funcionamento semanal de cada uma.
* **`appointments`**: Agendamentos feitos pelas clientes finais.
* **`settings`**: Configurações de agendamento (antecedência mínima, confirmação automática ou manual).
* **`clients`**: Carteira de clientes de cada profissional.

---

## Passo 4: Como usar o Widget de Agendamento (Modal/Embed) 🌸

O Lume Agenda agora conta com um widget de agendamento embutível e responsivo, ideal para ser inserido em landing pages sem a necessidade de redirecionar a visitante.

### 1. Como importar e abrir o Modal (`BookingModal`)
Você pode importar o componente de modal diretamente em qualquer página ou componente React/Next.js:

```tsx
import { useState } from 'react';
import { BookingModal } from '@/components/booking/BookingModal';

export default function MinhaLandingPage() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  return (
    <div>
      {/* Botão de disparo */}
      <button onClick={() => setIsBookingOpen(true)}>
        Agendar Horário
      </button>

      {/* Componente Modal */}
      <BookingModal 
        professionalSlug="amanda-costa" 
        isOpen={isBookingOpen} 
        onClose={() => setIsBookingOpen(false)} 
      />
    </div>
  );
}
```

### 2. Uso simplificado com `OpenBookingButton`
Se você deseja apenas inserir um botão rápido que já contenha o modal e controle o estado de abertura de forma automática, utilize o `OpenBookingButton`:

```tsx
import { OpenBookingButton } from '@/components/booking/OpenBookingButton';

export default function Pagina() {
  return (
    <OpenBookingButton 
      professionalSlug="amanda-costa"
      className="px-6 py-3 bg-forest text-white rounded-xl font-bold"
    >
      Agendar agora
    </OpenBookingButton>
  );
}
```

### 3. Modo Embed via Iframe (`?embed=true`)
Para landing pages construídas fora do projeto (como WordPress, Webflow ou HTML estático), você pode embutir o agendamento diretamente via `<iframe>` utilizando o parâmetro `?embed=true`:

```html
<iframe
  src="http://localhost:3000/agendar/amanda-costa?embed=true"
  width="100%"
  height="700"
  style="border: none; border-radius: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);"
  allow="payment"
></iframe>
```
* **O que acontece:** Quando `embed=true` é passado como parâmetro de URL, o sistema oculta automaticamente o cabeçalho gigante do profissional, foto, bio e margens decorativas, renderizando apenas o formulário de etapas limpo de ponta a ponta.

### 4. Testando a Landing Page de Demonstração
Criamos uma landing page de demonstração premium em **[http://localhost:3000/lp/demo-estetica](http://localhost:3000/lp/demo-estetica)** que simula a página de vendas da profissional Amanda Costa. 

Nela você pode testar:
* Clicar em qualquer um dos botões CTA ("Marcar meu Horário Agora", "Reservar Horário") e ver o modal abrir instantaneamente sobre a página.
* Completar o agendamento em 6 etapas dinâmicas (incluindo a tela de sucesso final dentro do próprio modal).
* Fechar o modal ao final e continuar na mesma página sem redirecionamento.


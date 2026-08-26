import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Política de Privacidade | Lume Agenda',
  description: 'Como a Lume Agenda trata dados pessoais, conforme a LGPD.',
};

// Data da última atualização — troque ao revisar o documento.
const LAST_UPDATE = '22 de junho de 2026';

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-cream py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-[#efe9e6] shadow-sm p-7 sm:p-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:opacity-80 transition-opacity">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <h1 className="mt-5 text-2xl font-black text-gray-900 tracking-tight">Política de Privacidade</h1>
        <p className="mt-1 text-xs text-gray-450">Última atualização: {LAST_UPDATE}</p>

        <div className="mt-7 space-y-6 text-sm text-gray-600 leading-relaxed [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:tracking-tight [&_h2]:mt-7 [&_h2]:mb-2 [&_strong]:text-gray-800 [&_li]:ml-1">
          <p>
            Esta Política explica como a <strong>Lume Agenda</strong> trata dados pessoais, em conformidade com a
            Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD). Ao usar a plataforma, você concorda com as
            práticas aqui descritas.
          </p>

          <div>
            <h2>1. Quem trata os dados</h2>
            <p>
              Na plataforma, a <strong>profissional</strong> é a controladora dos dados das suas clientes (decide
              quais dados coleta e por quê). A <strong>Lume</strong> atua como operadora, fornecendo a tecnologia
              que armazena e processa esses dados em nome da profissional.
            </p>
          </div>

          <div>
            <h2>2. Dados que coletamos</h2>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Da profissional:</strong> nome, e-mail, telefone/WhatsApp, dados do negócio e de acesso.</li>
              <li><strong>Da cliente (no agendamento):</strong> nome, WhatsApp, e-mail (opcional), data de nascimento (opcional) e informações do agendamento (serviço, data, horário, observações).</li>
              <li><strong>De uso:</strong> registros técnicos necessários para segurança e funcionamento (ex.: endereço IP em verificações antifraude).</li>
            </ul>
          </div>

          <div>
            <h2>3. Para que usamos</h2>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Permitir o agendamento e a gestão da agenda da profissional;</li>
              <li>Enviar mensagens de confirmação e lembrete (quando a profissional ativa as automações);</li>
              <li>Garantir a segurança da plataforma e prevenir abusos/spam;</li>
              <li>Cumprir obrigações legais.</li>
            </ul>
            <p className="mt-2">
              As bases legais incluem a <strong>execução de contrato</strong> (realizar o agendamento solicitado),
              o <strong>legítimo interesse</strong> (segurança e melhoria do serviço) e o <strong>consentimento</strong>
              {' '}quando aplicável.
            </p>
          </div>

          <div>
            <h2>4. Com quem compartilhamos</h2>
            <p>
              Não vendemos seus dados. Compartilhamos apenas com prestadores que viabilizam o serviço, na condição de
              operadores e com obrigações de segurança:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Supabase</strong> — banco de dados e autenticação;</li>
              <li><strong>Vercel</strong> — hospedagem da aplicação;</li>
              <li><strong>Google Agenda (Google Calendar API)</strong> — quando a profissional conecta a própria conta Google, para manter as duas agendas iguais;</li>
              <li><strong>OpenAI</strong> — assistente de IA (quando usado pela profissional);</li>
              <li><strong>Provedor de mensageria do WhatsApp</strong> — envio das mensagens automáticas.</li>
            </ul>
          </div>

          <div>
            <h2>4.1. Uso dos dados da Google Agenda</h2>
            <p>
              A conexão com a Google Agenda é <strong>opcional</strong> e só acontece quando a profissional autoriza,
              na tela do próprio Google. Enquanto estiver conectada, o Lume:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>cria, edita e cancela na agenda do Google os eventos correspondentes aos agendamentos feitos no Lume;</li>
              <li>lê os eventos da agenda conectada para saber quais horários já estão ocupados e impedir agendamento
              em cima de um compromisso — desses eventos guardamos apenas data, horário e o identificador do evento,
              nunca convidados, anexos ou o conteúdo da descrição;</li>
              <li>não usa esses dados para publicidade, não os vende e não os compartilha com terceiros;</li>
              <li>não os utiliza para treinar modelos de inteligência artificial, próprios ou de terceiros.</li>
            </ul>
            <p className="mt-2">
              O uso das informações recebidas das APIs do Google segue a
              {' '}<a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
              Política de Dados do Usuário dos Serviços de API do Google</a>, incluindo os requisitos de Uso Limitado
              (<em>Limited Use</em>).
            </p>
            <p className="mt-2">
              A profissional pode desconectar quando quiser em <strong>Configurações → Integrações → Desconectar</strong>,
              ou em <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">myaccount.google.com/permissions</a>.
              Ao desconectar, apagamos os tokens de acesso e os bloqueios de horário que vieram do Google.
            </p>
          </div>

          <div>
            <h2>5. Seus direitos (LGPD)</h2>
            <p>
              Você pode solicitar a qualquer momento: confirmação de tratamento, acesso, correção, anonimização,
              portabilidade, eliminação dos dados e informações sobre compartilhamentos. Para exercer, entre em
              contato pelo e-mail abaixo. Pedidos sobre dados de uma cliente devem ser direcionados à profissional
              responsável (controladora).
            </p>
          </div>

          <div>
            <h2>6. Por quanto tempo guardamos</h2>
            <p>
              Os dados são mantidos enquanto a conta da profissional estiver ativa e pelo tempo necessário para as
              finalidades acima ou por exigência legal. O histórico de conversas com o assistente é limitado às
              mensagens mais recentes. Você pode solicitar a exclusão a qualquer momento.
            </p>
          </div>

          <div>
            <h2>7. Segurança</h2>
            <p>
              Adotamos medidas técnicas para proteger os dados, como sessões autenticadas e assinadas, controle de
              acesso por profissional, limitação de tentativas (antifraude) e verificação de robôs no agendamento
              público. Nenhum sistema é 100% imune, mas trabalhamos para reduzir riscos.
            </p>
          </div>

          <div>
            <h2>8. Cookies</h2>
            <p>
              Usamos um cookie essencial para manter a profissional autenticada (sessão). Ele é necessário para o
              funcionamento do painel e não é usado para publicidade.
            </p>
          </div>

          <div>
            <h2>9. Contato e Encarregado (DPO)</h2>
            <p>
              Para dúvidas ou solicitações sobre privacidade, escreva para <strong>contato@lumepremium.com</strong>.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Operado por [RAZÃO SOCIAL / NOME], CNPJ/CPF [CNPJ ou CPF], [CIDADE/UF].
              {' '}Encarregado pelo tratamento de dados (DPO): [NOME / E-MAIL].
              {' '}(Preencha com os dados reais antes de cobrar de clientes.)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Termos de Uso | Lume Agenda',
  description: 'Termos de Uso da plataforma Lume Agenda.',
};

// Data da última atualização — troque ao revisar o documento.
const LAST_UPDATE = '22 de junho de 2026';

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-cream py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-[#efe9e6] shadow-sm p-7 sm:p-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:opacity-80 transition-opacity">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <h1 className="mt-5 text-2xl font-black text-gray-900 tracking-tight">Termos de Uso</h1>
        <p className="mt-1 text-xs text-gray-450">Última atualização: {LAST_UPDATE}</p>

        <div className="mt-7 space-y-6 text-sm text-gray-600 leading-relaxed [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:tracking-tight [&_h2]:mt-7 [&_h2]:mb-2 [&_strong]:text-gray-800">
          <p>
            Estes Termos de Uso regem o acesso e a utilização da plataforma <strong>Lume Agenda</strong>
            {' '}(&quot;Lume&quot;, &quot;plataforma&quot; ou &quot;nós&quot;), um sistema de agendamento e gestão para
            profissionais de beleza e estética. Ao usar a plataforma, você concorda com estes Termos.
          </p>

          <div>
            <h2>1. O que a Lume oferece</h2>
            <p>
              A Lume é uma ferramenta que permite que profissionais organizem sua agenda, cadastrem serviços
              e clientes, recebam agendamentos por uma página pública e enviem mensagens automáticas. A Lume
              <strong> não presta os serviços de beleza/estética</strong> — estes são prestados exclusivamente
              pela profissional contratada pela cliente. A Lume é apenas o meio que conecta as duas partes.
            </p>
          </div>

          <div>
            <h2>2. Contas e responsabilidade da profissional</h2>
            <p>
              A profissional é responsável por manter a confidencialidade de sua senha, pelos dados que cadastra,
              pelos preços e condições que divulga e pelo cumprimento dos agendamentos. A profissional declara ter
              autorização para tratar os dados das clientes que insere na plataforma.
            </p>
          </div>

          <div>
            <h2>3. Uso pela cliente</h2>
            <p>
              Ao agendar, a cliente se compromete a fornecer informações verdadeiras e a comparecer no horário
              marcado ou avisar com antecedência. Pagamentos, valores, sinais e políticas de cancelamento são
              definidos e cobrados diretamente pela profissional — a Lume não processa pagamentos entre cliente e
              profissional.
            </p>
          </div>

          <div>
            <h2>4. Uso adequado</h2>
            <p>
              É proibido usar a plataforma para fins ilícitos, enviar spam, tentar burlar mecanismos de segurança,
              sobrecarregar o sistema ou acessar dados de terceiros sem autorização. Podemos suspender contas que
              violem estes Termos.
            </p>
          </div>

          <div>
            <h2>5. Disponibilidade</h2>
            <p>
              Empenhamo-nos para manter a plataforma no ar, mas ela pode passar por manutenções ou indisponibilidades
              temporárias. A Lume não se responsabiliza por prejuízos decorrentes de interrupções, falhas de terceiros
              (provedores de hospedagem, mensageria) ou força maior.
            </p>
          </div>

          <div>
            <h2>6. Limitação de responsabilidade</h2>
            <p>
              A Lume não se responsabiliza pela relação entre profissional e cliente, pela qualidade dos atendimentos,
              por desentendimentos sobre horários, valores ou cancelamentos. Esses pontos são de responsabilidade da
              profissional e da cliente.
            </p>
          </div>

          <div>
            <h2>7. Privacidade</h2>
            <p>
              O tratamento de dados pessoais é descrito na nossa{' '}
              <Link href="/privacidade" className="text-forest font-semibold hover:underline">Política de Privacidade</Link>,
              que faz parte destes Termos.
            </p>
          </div>

          <div>
            <h2>8. Alterações</h2>
            <p>
              Podemos atualizar estes Termos a qualquer momento. A versão vigente é sempre a publicada nesta página,
              com a data de atualização no topo. O uso continuado após mudanças significa concordância.
            </p>
          </div>

          <div>
            <h2>9. Contato</h2>
            <p>
              Dúvidas sobre estes Termos podem ser enviadas para <strong>contato@lumepremium.com</strong>.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Operado por [RAZÃO SOCIAL / NOME], inscrito no CNPJ/CPF [CNPJ ou CPF], [CIDADE/UF].
              {' '}(Preencha estes dados com as informações reais da empresa antes de cobrar de clientes.)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

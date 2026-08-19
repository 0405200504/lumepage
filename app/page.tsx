import { redirect } from 'next/navigation';
import { authService } from '@/lib/auth/auth';
import Link from 'next/link';

export default async function HomePage() {
  // Admin tem precedência: com as duas sessões abertas (admin + conta teste),
  // a raiz leva ao painel administrativo.
  const admin = await authService.getCurrentUser('admin');
  if (admin) redirect('/admin');

  const session = await authService.getCurrentUser('pro');
  if (session) redirect('/dashboard');

  // Página pública para aprovação do Google (não redireciona mais forçadamente)
  return (
    <div className="min-h-screen bg-cream flex flex-col font-sans">
      <header className="py-6 px-8 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="text-2xl font-black text-forest">Lume.</div>
        <Link 
          href="/login" 
          className="bg-forest text-white px-5 py-2 rounded-full font-semibold hover:bg-forest/90 transition-colors"
        >
          Acessar Painel
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto mt-20 mb-32">
        <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight">
          Gestão inteligente para profissionais de estética.
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl leading-relaxed">
          O Lume é uma plataforma completa de agendamentos e CRM. Permite que as profissionais gerenciem seus horários, clientes e recebam notificações automáticas, com integração bidirecional ao Google Calendar para evitar conflitos de horários.
        </p>
        <Link 
          href="/login" 
          className="bg-primary text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform"
        >
          Começar a usar
        </Link>
      </main>

      <footer className="py-8 border-t border-gray-200 text-center text-gray-500 text-sm">
        <div className="space-x-4 mb-4">
          <Link href="/privacidade" className="hover:text-forest underline">Política de Privacidade</Link>
          <Link href="/termos" className="hover:text-forest underline">Termos de Serviço</Link>
        </div>
        <p>© {new Date().getFullYear()} Lume Agendamentos. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

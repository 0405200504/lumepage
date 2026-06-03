import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { authService } from '@/lib/auth/auth';
import { Calendar, Scissors, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';

export default async function HomePage() {
  const session = await authService.getCurrentUser();

  // Redirecionamento automático se logado
  if (session) {
    if (session.role === 'super_admin') {
      redirect('/admin');
    } else {
      redirect('/dashboard');
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-cream selection:bg-lima selection:text-forest">
      {/* Navbar */}
      <header className="max-w-7xl w-full mx-auto px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-forest text-lima flex items-center justify-center font-black rounded-xl text-lg shadow-sm">
            L
          </div>
          <span className="font-display font-extrabold text-lg text-forest tracking-tight">Lume Agenda</span>
        </div>
        <Link 
          href="/login"
          className="px-5 py-2.5 bg-forest hover:bg-forest-hover text-white text-xs font-bold rounded-xl shadow-md transition-all duration-200"
        >
          Acessar Painel
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center max-w-5xl w-full mx-auto px-6 py-12 md:py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-forest/5 text-forest border border-forest/10 rounded-full text-[10px] font-bold uppercase tracking-wider mx-auto mb-6">
          <Sparkles className="h-3 w-3 text-forest" />
          <span>Transforme visitantes em clientes agendadas</span>
        </div>
        
        <h1 className="font-display text-4xl sm:text-6xl font-black text-forest leading-none tracking-tight max-w-3xl mx-auto">
          O sistema de agendamento que valoriza sua marca.
        </h1>
        
        <p className="mt-6 text-sm sm:text-base text-gray-500 max-w-xl mx-auto leading-relaxed">
          Páginas de agendamento completas, intuitivas e premium. Projetadas especificamente para profissionais de estética e beleza.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/login"
            className="flex items-center gap-2 px-8 py-4 bg-forest hover:bg-forest-hover text-white text-sm font-bold rounded-2xl shadow-xl transition-all duration-200 w-full sm:w-auto text-center justify-center"
          >
            <span>Experimente a Lume</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#features"
            className="px-8 py-4 border border-forest/15 text-forest hover:bg-forest/5 text-sm font-bold rounded-2xl transition-all duration-200 w-full sm:w-auto"
          >
            Conhecer recursos
          </a>
        </div>

        {/* Mockup da interface de agendamento */}
        <div className="mt-16 md:mt-24 bg-white rounded-3xl p-4 border border-[#e4e9e6] shadow-2xl relative overflow-hidden max-w-3xl mx-auto">
          <div className="flex items-center gap-1.5 border-b border-gray-100 pb-3 mb-4">
            <div className="h-3 w-3 bg-red-400 rounded-full" />
            <div className="h-3 w-3 bg-amber-400 rounded-full" />
            <div className="h-3 w-3 bg-emerald-400 rounded-full" />
            <span className="text-[10px] text-gray-400 ml-2 font-mono">lumeagenda.com/amanda-costa</span>
          </div>
          
          <div className="bg-[#faf9f6] rounded-2xl p-6 text-left border border-gray-100">
            <div className="flex gap-4 items-center mb-6">
              <div className="h-12 w-12 bg-forest text-lima flex items-center justify-center font-bold rounded-2xl text-xl shrink-0">
                AC
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-base">Amanda Costa Estética</h3>
                <p className="text-xs text-gray-400">Limpeza de pele, cílios e sobrancelhas</p>
              </div>
            </div>
            <div className="h-2 bg-gray-200 rounded-full w-2/3 mb-3 animate-pulse" />
            <div className="h-2 bg-gray-200 rounded-full w-1/2 mb-6 animate-pulse" />
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between h-24">
                <span className="text-[10px] font-bold text-gray-400">SERVIÇO</span>
                <span className="text-xs font-extrabold text-forest">Limpeza Profunda</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between h-24">
                <span className="text-[10px] font-bold text-gray-400">DATA</span>
                <span className="text-xs font-extrabold text-forest">Amanhã</span>
              </div>
              <div className="bg-[#500b18] p-4 rounded-xl border border-forest shadow-xs flex flex-col justify-between h-24 text-white col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-lima">HORÁRIO</span>
                <span className="text-xs font-extrabold text-lima">14:00</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="bg-white border-t border-[#e4e9e6] py-16 md:py-24">
        <div className="max-w-6xl w-full mx-auto px-6">
          <h2 className="font-display text-2xl md:text-3xl font-black text-center text-forest tracking-tight">
            Criado para valorizar o seu negócio
          </h2>
          <p className="text-xs text-gray-400 text-center mt-2 max-w-sm mx-auto">
            Recursos premium integrados para dar total autonomia e praticidade ao seu dia a dia.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 md:mt-16">
            <div className="p-6 rounded-3xl bg-cream border border-[#e4e9e6] shadow-xs">
              <div className="p-3 bg-forest text-lima rounded-2xl w-fit">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="font-display font-extrabold text-base text-forest mt-4">Agendamento Fluído</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Calendário intuitivo que guia o cliente final pelo fluxo de agendamento em segundos, do celular ou computador.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-cream border border-[#e4e9e6] shadow-xs">
              <div className="p-3 bg-forest text-lima rounded-2xl w-fit">
                <Scissors className="h-6 w-6" />
              </div>
              <h3 className="font-display font-extrabold text-base text-forest mt-4">Controle Comercial</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Gerencie seus serviços, altere regras de expediente, configure almoço, adicione buffers entre atendimentos e muito mais.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-cream border border-[#e4e9e6] shadow-xs">
              <div className="p-3 bg-forest text-lima rounded-2xl w-fit">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-display font-extrabold text-base text-forest mt-4">Evite Furos na Agenda</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Validações de antecipação comercial, bloqueios manuais de horários de folga e confirmações automáticas ou manuais.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-forest text-white/50 border-t border-[#1a443a] py-8 text-center text-xs">
        <p>&copy; {new Date().getFullYear()} Lume Agenda. Desenvolvido com amor para profissionais de beleza.</p>
      </footer>
    </div>
  );
}

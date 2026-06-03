'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, Star, Calendar, MessageSquare, Clock, Phone, MapPin, 
  Instagram, ShieldCheck, Heart, ArrowRight, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { BookingModal } from '@/components/booking/BookingModal';

export default function DemoEsteticaPage() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const professionalSlug = 'amanda-costa';

  return (
    <div className="bg-[#faf9f6] min-h-screen text-gray-800 font-sans selection:bg-lima selection:text-forest select-none">
      
      {/* Barra de Navegação */}
      <header className="sticky top-0 z-40 bg-[#faf9f6]/80 backdrop-blur-md border-b border-gray-150/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-forest text-lima flex items-center justify-center font-black rounded-xl text-lg shadow-sm">
              L
            </div>
            <span className="font-extrabold text-forest tracking-tight text-sm sm:text-base">
              Lume <span className="text-gray-400 font-medium">| Landing Page Demo</span>
            </span>
          </div>
          
          <button 
            onClick={() => setIsBookingOpen(true)}
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-forest hover:bg-forest-hover text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Calendar className="h-4 w-4 text-lima" />
            <span>Agendar Horário</span>
          </button>
        </div>
      </header>

      {/* 1. SEÇÃO HERO (Apresentação Principal) */}
      <section className="relative overflow-hidden py-16 sm:py-24 px-6 border-b border-gray-100 bg-gradient-to-b from-[#f2f4f2] to-[#faf9f6]">
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-forest/5 text-forest border border-forest/10 rounded-full text-xs font-bold animate-pulse">
            <Sparkles className="h-3.5 w-3.5 text-forest" />
            <span>Sua beleza tratada com exclusividade</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-forest tracking-tight leading-none max-w-3xl mx-auto font-display">
            Realce sua beleza natural e renove sua pele
          </h1>

          <p className="text-sm sm:text-base text-gray-500 max-w-xl mx-auto leading-relaxed">
            Tratamentos faciais e corporais personalizados com a esteticista **Amanda Costa**. Experimente o verdadeiro conceito de autocuidado e bem-estar na Av. Paulista.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setIsBookingOpen(true)}
              className="w-full sm:w-auto px-8 py-4 bg-forest hover:bg-forest-hover text-white text-xs font-bold rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2.5 hover:translate-y-[-1px]"
            >
              <Calendar className="h-4.5 w-4.5 text-lima" />
              <span>Marcar meu Horário Agora</span>
            </button>
            
            <a
              href="#servicos"
              className="w-full sm:w-auto px-6 py-4 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-2xl border border-gray-200 transition-all flex items-center justify-center gap-1.5"
            >
              <span>Ver Serviços</span>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </a>
          </div>

          {/* Destaque flutuante de benefício */}
          <div className="pt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-[11px] font-bold text-gray-450 uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-forest" />
              <span>Ambiente Seguro e Climatizado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-forest" />
              <span>Atendimento 100% Personalizado</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. BENEFÍCIOS / DIFERENCIAIS */}
      <section className="py-16 sm:py-24 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="bg-white border border-gray-150 p-6 rounded-3xl space-y-3 shadow-xs">
            <div className="h-10 w-10 bg-forest/5 rounded-2xl flex items-center justify-center text-forest">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-forest">Avaliação Detalhada</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Cada tratamento começa com uma análise minuciosa da sua pele para definir os ativos e técnicas mais recomendadas para você.
            </p>
          </div>

          <div className="bg-white border border-gray-150 p-6 rounded-3xl space-y-3 shadow-xs">
            <div className="h-10 w-10 bg-forest/5 rounded-2xl flex items-center justify-center text-forest">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-forest">Horário Sem Atrasos</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Respeitamos seu tempo. Nossa agenda é organizada com folga entre atendimentos para garantir que você seja atendida exatamente na hora.
            </p>
          </div>

          <div className="bg-white border border-gray-150 p-6 rounded-3xl space-y-3 shadow-xs">
            <div className="h-10 w-10 bg-forest/5 rounded-2xl flex items-center justify-center text-forest">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-forest">Cosméticos Premium</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Trabalhamos exclusivamente com marcas estéticas profissionais e dermatologicamente testadas, garantindo resultados rápidos e seguros.
            </p>
          </div>

        </div>
      </section>

      {/* 3. SEÇÃO SERVIÇOS */}
      <section id="servicos" className="py-16 sm:py-24 px-6 bg-forest text-white">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-[10px] font-black text-lima uppercase tracking-widest block">Nossos Tratamentos</span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">Serviços Mais Procurados</h2>
            <p className="text-xs sm:text-sm text-white/70 max-w-md mx-auto leading-relaxed">
              Tratamentos exclusivos realizados com todo cuidado e carinho. Escolha e reserve seu horário em poucos cliques.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Serviço 1 */}
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white">Limpeza de Pele Profunda</h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  Remoção completa de cravos e impurezas com vapor de ozônio, peeling ultrassônico e máscara calmante hidratante.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-lima font-bold pt-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>90 minutos</span>
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] text-white/40 block font-bold">INVESTIMENTO</span>
                  <span className="text-lg font-black text-lima">R$ 150,00</span>
                </div>
                <button 
                  onClick={() => setIsBookingOpen(true)}
                  className="w-full py-3 bg-white hover:bg-gray-100 text-forest text-xs font-bold rounded-xl transition-all cursor-pointer text-center block"
                >
                  Reservar Horário
                </button>
              </div>
            </div>

            {/* Serviço 2 */}
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white">Design de Sobrancelhas</h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  Modelagem personalizada e harmonização do olhar de acordo com o visagismo facial. Inclui aplicação opcional de henna.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-lima font-bold pt-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>45 minutos</span>
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] text-white/40 block font-bold">INVESTIMENTO</span>
                  <span className="text-lg font-black text-lima">R$ 80,00</span>
                </div>
                <button 
                  onClick={() => setIsBookingOpen(true)}
                  className="w-full py-3 bg-white hover:bg-gray-100 text-forest text-xs font-bold rounded-xl transition-all cursor-pointer text-center block"
                >
                  Reservar Horário
                </button>
              </div>
            </div>

            {/* Serviço 3 */}
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white">Massagem Modeladora</h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  Manobras rítmicas e intensas para modelar o corpo, combater a retenção de líquidos e melhorar a circulação local.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-lima font-bold pt-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>60 minutos</span>
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] text-white/40 block font-bold">INVESTIMENTO</span>
                  <span className="text-lg font-black text-lima">R$ 120,00</span>
                </div>
                <button 
                  onClick={() => setIsBookingOpen(true)}
                  className="w-full py-3 bg-white hover:bg-gray-100 text-forest text-xs font-bold rounded-xl transition-all cursor-pointer text-center block"
                >
                  Reservar Horário
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. DEPOIMENTOS (Prova Social) */}
      <section className="py-16 sm:py-24 px-6 max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-bold text-gray-450 uppercase tracking-widest block">Depoimentos reais</span>
          <h2 className="text-2xl sm:text-3xl font-black text-forest tracking-tight">O que dizem as clientes</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          <div className="bg-white border border-gray-150 p-6 rounded-3xl space-y-4 relative">
            <div className="flex text-amber-450 gap-0.5">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
            </div>
            <p className="text-xs text-gray-600 leading-relaxed italic">
              "A limpeza de pele com a Amanda é maravilhosa! A pele não fica marcada e os produtos têm um cheirinho delicioso de SPA. Super recomendo!"
            </p>
            <div>
              <p className="text-xs font-bold text-forest">Juliana Silva</p>
              <p className="text-[10px] text-gray-400">Cliente há 6 meses</p>
            </div>
          </div>

          <div className="bg-white border border-gray-150 p-6 rounded-3xl space-y-4 relative">
            <div className="flex text-amber-450 gap-0.5">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
            </div>
            <p className="text-xs text-gray-600 leading-relaxed italic">
              "Fiz o design de sobrancelha e amei o resultado. O estúdio é lindo, aconchegante e o atendimento é impecável desde a hora que você chega."
            </p>
            <div>
              <p className="text-xs font-bold text-forest">Beatriz Santos</p>
              <p className="text-[10px] text-gray-400">Cliente recorrente</p>
            </div>
          </div>

        </div>
      </section>

      {/* 5. CTA INFERIOR */}
      <section className="bg-gradient-to-t from-[#f2f4f2] to-[#faf9f6] py-16 sm:py-20 px-6 text-center border-t border-gray-100">
        <div className="max-w-xl mx-auto space-y-6">
          <h2 className="text-2xl sm:text-3xl font-black text-forest tracking-tight">Pronta para viver essa experiência?</h2>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
            Reserve o seu horário em poucos segundos. Escolha o serviço, a data e confirme sem precisar sair da página.
          </p>
          <button 
            onClick={() => setIsBookingOpen(true)}
            className="w-full sm:w-auto px-8 py-4 bg-forest hover:bg-forest-hover text-white text-xs font-bold rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 mx-auto"
          >
            <Calendar className="h-4.5 w-4.5 text-lima" />
            <span>Quero Meu Atendimento</span>
          </button>
        </div>
      </section>

      {/* 6. RODAPÉ */}
      <footer className="bg-white border-t border-gray-150 py-12 px-6 text-center text-xs text-gray-450 space-y-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-forest text-lima flex items-center justify-center font-black rounded-lg text-sm">
              L
            </div>
            <span className="font-extrabold text-forest tracking-tight">Amanda Costa Estética</span>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 font-bold text-gray-500">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-forest" />
              <span>Av. Paulista, 1000 - São Paulo/SP</span>
            </div>
            <div className="flex items-center gap-1">
              <Instagram className="h-4 w-4 text-forest" />
              <span>@amandacosta.estetica</span>
            </div>
          </div>

          <p className="text-[10px] text-gray-400">
            &copy; {new Date().getFullYear()} Lume Agenda. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* COMPONENTE WIDGET/MODAL EMBUTIDO */}
      <BookingModal
        professionalSlug={professionalSlug}
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
      />

    </div>
  );
}

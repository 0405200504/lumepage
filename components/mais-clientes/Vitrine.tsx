import React from 'react';
import {
  CalendarCheck, Instagram, MapPin, Megaphone, MessageCircle, Sparkles, BadgePercent, LineChart, Phone, Lock,
} from 'lucide-react';

/**
 * A aba bloqueada: explica o que a assessoria entrega e leva para a call.
 * Não promete número de clientes: promete o trabalho e mostra como medimos.
 */

const ENTREGAS = [
  { icone: Instagram, titulo: 'Instagram ajustado', texto: 'Diagnóstico do seu perfil com nota por item e o passo a passo para você mesma ajustar foto, nome, bio, link e destaques.' },
  { icone: MapPin, titulo: 'Google em dia', texto: 'Seu Perfil da Empresa revisado (categoria, serviços, fotos, avaliações) para você aparecer quando procuram o seu serviço na sua cidade.' },
  { icone: BadgePercent, titulo: 'Ofertas que trazem cliente nova', texto: 'Para os seus 3 serviços principais, uma oferta pensada para atrair quem ainda não te conhece, sem baixar seu preço à toa. Nada vai ao ar sem você aprovar.' },
  { icone: Sparkles, titulo: 'Criativos que já funcionam', texto: 'Anúncios montados nos formatos que estão há meses no ar no seu nicho, com as suas fotos reais e os seus preços.' },
  { icone: Megaphone, titulo: 'Anúncios na Meta e no Google', texto: 'Campanhas para a sua região (até 15 km no interior, até 25 km em cidade grande), com verba que você escolhe e paga direto à Meta, na sua própria conta de anúncios.' },
  { icone: MessageCircle, titulo: 'WhatsApp que agenda', texto: 'A cliente toca no anúncio, cai no seu WhatsApp e o atendimento do Lume responde na hora, apresenta a oferta e marca o horário.' },
];

const PASSOS = [
  { titulo: 'Call com a equipe', texto: 'Entendemos seu momento, seus serviços e quanto da sua agenda está vaga.' },
  { titulo: 'Você conta e manda fotos', texto: 'Um formulário curto (o Lume já sabe boa parte) e as fotos reais do seu trabalho.' },
  { titulo: 'Ajustamos sua vitrine', texto: 'Diagnóstico do Instagram e do Google com tutorial. Se já estiver 10/10, a gente pula.' },
  { titulo: 'Seu canal entra no ar', texto: 'Ofertas aprovadas, criativos, anúncios e o WhatsApp prontos para receber cliente.' },
];

const PERGUNTAS = [
  { p: 'Preciso entender de marketing?', r: 'Não. Você responde, aprova e acompanha. A estrutura é montada pela equipe Lume.' },
  { p: 'Quem paga os anúncios?', r: 'Você, direto para a Meta: os anúncios rodam na sua própria conta de anúncios, no seu cartão ou com saldo por Pix, e a Lume cobra só a assessoria. Você escolhe quanto, a partir de R$ 50 por semana, sem máximo. Conforme os agendamentos vão saindo, o orçamento pode subir até o limite que você definir.' },
  { p: 'Preciso mandar fotos?', r: 'Sim, fotos reais do seu trabalho. É o que mais vende, e a gente não usa resultado inventado: antes e depois só com foto sua, com autorização da cliente.' },
  { p: 'Como vou saber se está dando certo?', r: 'Pela sua agenda: o Lume mostra quantos agendamentos vieram dos anúncios e quanto você faturou com eles.' },
];

/** Com a agenda da Lume, o botão desce até o agendamento na própria tela; sem ela, abre o link externo. */
function Cta({ linkCall, interno = false, grande = false }: { linkCall: string; interno?: boolean; grande?: boolean }) {
  if (!linkCall) return <p className="text-body-sm text-white/80">Fale com o suporte do Lume para agendar a sua call.</p>;
  return (
    <a
      href={linkCall}
      {...(interno ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
      className={`inline-flex items-center justify-center gap-2 rounded-pill bg-white text-wine-800 font-semibold shadow-[var(--shadow-sm)] hover:bg-wine-50 transition-ui ${grande ? 'px-7 py-3.5 text-body' : 'px-5 py-3 text-body-sm'}`}
    >
      <Phone className="h-4 w-4" /> Agendar call com a equipe
    </a>
  );
}

export function Vitrine({ linkCall, agendaCall = '' }: { linkCall: string; agendaCall?: string }) {
  const interno = !!agendaCall;
  const destino = interno ? '#agendar-call' : linkCall;
  return (
    <div className="space-y-6 lg:space-y-8 pb-16">
      <section className="surface-wine rounded-hero text-white px-6 py-10 sm:px-10 sm:py-14 relative overflow-hidden">
        <div className="max-w-2xl relative">
          <p className="inline-flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-white/70">
            <Lock className="h-3.5 w-3.5" /> Assessoria Lume
          </p>
          <h1 className="mt-3 text-h1 sm:text-display leading-tight">Mais clientes na sua agenda, sem você virar especialista em marketing</h1>
          <p className="mt-4 text-body text-white/85 max-w-xl">
            A equipe Lume estrutura seu Instagram, seu Google, seus anúncios e seu WhatsApp para transformar visita em horário marcado.
            Você aprova as ofertas e acompanha tudo pela sua agenda.
          </p>
          <div className="mt-7"><Cta linkCall={destino} interno={interno} grande /></div>
        </div>
      </section>

      <section>
        <h2 className="text-h2 text-heading">O que a gente entrega</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ENTREGAS.map(e => (
            <article key={e.titulo} className="card p-5 sm:p-6">
              <span className="inline-grid place-items-center h-10 w-10 rounded-full bg-wine-50 text-wine-700"><e.icone className="h-5 w-5" /></span>
              <h3 className="mt-4 text-h3 text-heading">{e.titulo}</h3>
              <p className="mt-1.5 text-body-sm text-n-600">{e.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card p-6 sm:p-8">
        <h2 className="text-h2 text-heading">Como funciona</h2>
        <ol className="mt-5 grid gap-5 md:grid-cols-4">
          {PASSOS.map((p, i) => (
            <li key={p.titulo}>
              <span className="text-caption font-semibold text-wine-700">Passo {i + 1}</span>
              <p className="mt-1 text-body font-semibold text-heading">{p.titulo}</p>
              <p className="mt-1 text-body-sm text-n-600">{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="card p-6 sm:p-8">
          <span className="inline-grid place-items-center h-10 w-10 rounded-full bg-wine-50 text-wine-700"><LineChart className="h-5 w-5" /></span>
          <h2 className="mt-4 text-h3 text-heading">Sobre a verba de anúncio</h2>
          <p className="mt-2 text-body-sm text-n-600">
            Você escolhe quanto investir por semana, a partir de <strong className="text-heading">R$ 50</strong>, sem valor máximo.
            A verba sai da sua conta de anúncios direto para a Meta, sem passar pela Lume.
            Começamos pelo WhatsApp, que traz conversa mais rápido com pouca verba. Quando os agendamentos começam a sair,
            o orçamento pode subir sozinho até o teto que você definir, e a sua agenda manda: semana cheia, o anúncio desacelera.
          </p>
        </div>
        <div className="card p-6 sm:p-8">
          <h2 className="text-h3 text-heading">Perguntas comuns</h2>
          <dl className="mt-3 divide-y divide-line">
            {PERGUNTAS.map(q => (
              <div key={q.p} className="py-3">
                <dt className="text-body-sm font-semibold text-heading">{q.p}</dt>
                <dd className="mt-1 text-body-sm text-n-600">{q.r}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="surface-wine rounded-hero text-white px-6 py-8 sm:px-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarCheck className="h-6 w-6 text-white/80" />
          <p className="text-body font-semibold">Bora encher sua agenda? A conversa é rápida e sem compromisso.</p>
        </div>
        <Cta linkCall={destino} interno={interno} />
      </section>

      {interno && (
        <section id="agendar-call" className="card overflow-hidden scroll-mt-24">
          <div className="px-6 pt-6 sm:px-8 sm:pt-8">
            <h2 className="text-h2 text-heading">Escolha o melhor horário para a sua call</h2>
            <p className="mt-1 text-body-sm text-n-600">É uma conversa rápida com a equipe Lume, por vídeo ou WhatsApp. Você recebe a confirmação e o lembrete no seu WhatsApp.</p>
          </div>
          <iframe src={`${agendaCall}?embed=true`} title="Agendar call com a equipe Lume" className="mt-4 w-full border-0 h-[860px]" loading="lazy" />
        </section>
      )}
    </div>
  );
}

export default Vitrine;

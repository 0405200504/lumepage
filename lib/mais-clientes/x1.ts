/**
 * Funil do X1: a cliente toca no anúncio, cai no WhatsApp da profissional com
 * uma mensagem pronta, e o bot conduz até o horário marcado.
 *
 * O roteiro vira um BLOCO dentro da persona do bot, entre marcadores. Reaplicar
 * substitui só o bloco; o resto da persona (o jeito de falar que ela escolheu)
 * fica intacto. Sem persona, o bloco entra depois da apresentação padrão do bot,
 * para não apagar o "Você é a atendente da…" que existe hoje.
 */

import type { OfertaPlano } from '@/types/mais-clientes';

export const INICIO_BLOCO = '### Clientes que chegam pelos anúncios (Quero mais clientes)';
export const FIM_BLOCO = '### Fim das regras dos anúncios';

/** Mesma frase de abertura que o bot usa quando não há persona (bot-core.buildSystemPrompt). */
export const aberturaPadrao = (nomeProfissional: string) =>
  `Você é a atendente da ${nomeProfissional}. Responda como uma pessoa real no WhatsApp: sem markdown, sem listas, sem negrito, máximo 1 emoji por mensagem, respostas curtas e naturais.`;

export interface PassoX1 { titulo: string; texto: string }
export interface RoteiroX1 {
  /** Mensagem que já vem escrita quando a cliente toca no anúncio, uma por serviço. */
  mensagens: { servico: string; texto: string }[];
  passos: PassoX1[];
  bloco: string;
}

export function montarRoteiroX1(d: {
  nome: string;
  linkAgendamento: string;
  ofertas: Pick<OfertaPlano, 'servico' | 'titulo' | 'detalhe' | 'aprovada'>[];
}): RoteiroX1 {
  const ofertas = d.ofertas.filter(o => o.aprovada);
  const mensagens = ofertas.map(o => ({ servico: o.servico, texto: `Oi! Vi o anúncio de ${o.servico.toLowerCase()} e quero saber mais 😊` }));
  const listaOfertas = ofertas.map(o => `${o.titulo}: ${o.detalhe}`).join('; ');
  const link = d.linkAgendamento ? ` Se ela preferir agendar sozinha, mande o link ${d.linkAgendamento}.` : '';

  const passos: PassoX1[] = [
    { titulo: 'Resposta em segundos', texto: 'O bot responde na hora, cumprimenta pelo nome e confirma o serviço do anúncio. É a velocidade que faz o X1 converter.' },
    { titulo: 'Oferta aprovada', texto: ofertas.length ? `Apresenta só as ofertas que você aprovou: ${listaOfertas}.` : 'Aprove as ofertas acima para o bot saber o que oferecer.' },
    { titulo: 'Horário', texto: `Pergunta o dia e o período que ela prefere, mostra os horários livres da sua agenda e marca direto.${link}` },
    { titulo: 'Dúvidas', texto: 'Dúvida de preço: explica o que está incluso. Dúvida técnica ou medo: responde curto e oferece avaliação. As dúvidas que mais aparecem vão sendo mapeadas pelas suas conversas.' },
    { titulo: 'Sem pressão', texto: 'Se ela sumir, no máximo um lembrete gentil no dia seguinte. Nada de insistir.' },
  ];

  const bloco = [
    INICIO_BLOCO,
    'Quando a cliente disser que viu o anúncio (ex.: "vi o anúncio de ..."), siga estas regras:',
    `1. Responda na hora, cumprimente pelo nome se souber e confirme o serviço do anúncio.`,
    ofertas.length
      ? `2. Ofereça somente estas condições aprovadas pela ${d.nome}: ${listaOfertas}. Não invente outro desconto, brinde ou preço.`
      : '2. Informe o preço normal do serviço. Não invente desconto, brinde ou condição.',
    `3. Pergunte qual dia e período ela prefere e ofereça os horários livres. Agende direto quando ela escolher.${link}`,
    '4. Se ela hesitar pelo preço, explique o que está incluso no atendimento. Se for dúvida técnica ou medo, responda curto e ofereça uma avaliação.',
    '5. Nunca prometa resultado garantido. Se ela parar de responder, mande no máximo um lembrete gentil no dia seguinte.',
    FIM_BLOCO,
  ].join('\n');

  return { mensagens, passos, bloco };
}

/** Persona nova: a atual sem o bloco antigo + o bloco novo. */
export function aplicarNaPersona(personaAtual: string | null | undefined, bloco: string, nomeProfissional: string): string {
  const semBloco = removerBloco(personaAtual ?? '').trim();
  const base = semBloco || aberturaPadrao(nomeProfissional);
  return `${base}\n\n${bloco}`;
}

export function removerBloco(persona: string): string {
  const i = persona.indexOf(INICIO_BLOCO);
  if (i < 0) return persona;
  const f = persona.indexOf(FIM_BLOCO, i);
  return (persona.slice(0, i) + (f < 0 ? '' : persona.slice(f + FIM_BLOCO.length))).replace(/\n{3,}/g, '\n\n');
}

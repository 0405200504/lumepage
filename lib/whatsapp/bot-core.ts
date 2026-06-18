// Lógica pura do bot de WhatsApp — sem dependências de Next, Supabase ou rede.
// Mantida separada da rota para poder ser testada de forma isolada (ver scripts/test-bot.ts).

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

/** Marcador que a IA adiciona ao fim da resposta quando o atendimento deve ir para a profissional. */
export const PAUSE_MARKER = '[PAUSAR_BOT]';

export interface BotContext {
  /** Nome de exibição (marca ou nome) da profissional, ex.: "Amanda Costa Estética". */
  professionalName: string;
  /** Primeiro nome da profissional, usado nos handoffs ("vou chamar a Julia"). */
  professionalFirstName: string;
  /** Lista de serviços já formatada (uma por linha). */
  servicesList: string;
  /** Link de agendamento. */
  bookingUrl: string;
  /** Data/hora atual já formatada em pt-BR. */
  nowBR: string;
  /** Agenda/horários de atendimento já formatados (expediente + horários livres). */
  agendaText: string;
  /** Agendamentos da cliente já formatados (passado + futuro). */
  clientAppointmentsText: string;
  /** Resumo acumulado sobre a cliente, se houver. */
  clientSummary?: string | null;
  /** true quando já houve conversa anterior (evita reapresentação). */
  hasPriorExchange: boolean;
  /** Palavra-chave que a cliente pode digitar para falar com um humano. */
  stopKeyword: string;
}

/**
 * Bloco injetado pelo sistema. As instruções do campo "Treinar a IA" (a persona) são a fonte
 * PRINCIPAL e têm prioridade; este bloco é complementar — entra só para dados de agenda/agendamentos,
 * para o encaminhamento à profissional (pausa), e quando a persona não cobre o assunto.
 */
export function buildInjectedInfo(ctx: BotContext): string {
  const summaryLine = ctx.clientSummary ? `\nResumo desta cliente: ${ctx.clientSummary}` : '';
  const contactLine = ctx.hasPriorExchange ? '\n(contato recorrente)' : '\n(primeiro contato)';

  return `

---
As INSTRUÇÕES DE TREINAMENTO acima (o que a profissional escreveu no campo "Treinar a IA") são a sua fonte PRINCIPAL e têm prioridade total. Siga-as sempre que cobrirem a situação: saudação, endereço, formas de pagamento, como responder sobre dias e horários de agendamento, tom de voz, o que oferecer, etc.
Tudo abaixo é COMPLEMENTAR — só recorra a isto quando as instruções de treinamento NÃO responderem, para consultar a agenda/agendamentos, ou para encaminhar à profissional.

DADOS (use quando as instruções de treinamento não tiverem a resposta):
Data/hora atual: ${ctx.nowBR}
Serviços e preços: ${ctx.servicesList}
Link de agendamento: ${ctx.bookingUrl}
Agenda da profissional (expediente e horários livres): ${ctx.agendaText}
Agendamentos desta cliente (use sempre que ela perguntar sobre o horário dela): ${ctx.clientAppointmentsText}${summaryLine}${contactLine}

REGRAS FIXAS (valem sempre, sem sobrepor o tom e o conteúdo definidos nas instruções de treinamento):
- Analise TODO o histórico e o contexto antes de responder. A resposta precisa fazer sentido com o que a cliente realmente disse — responda com coerência mesmo que precise sair do roteiro.
- Nunca invente preço, data, horário, endereço, serviço ou agendamento. Se a informação não estiver nas instruções de treinamento nem nos dados acima, não chute.
- Encaminhe para a ${ctx.professionalFirstName} e termine a mensagem com ${PAUSE_MARKER} quando: a cliente pedir para falar com a ${ctx.professionalFirstName}/atendente/humano, reclamar, cancelar ou remarcar, digitar "${ctx.stopKeyword}", OU perguntar algo que não esteja nem nas instruções de treinamento nem nos dados acima. Nesses casos encaminhe DIRETO, na mesma mensagem, sem pedir confirmação e sem tentar resolver sozinha.
- REGRA ABSOLUTA: toda vez que a sua resposta disser, de qualquer forma, que vai confirmar, verificar, checar, perguntar, avisar depois ou chamar a ${ctx.professionalFirstName}, você é OBRIGADA a terminar essa mesma mensagem com ${PAUSE_MARKER}. Dizer que vai falar com a ${ctx.professionalFirstName} sem incluir ${PAUSE_MARKER} é proibido.
- Nunca repita uma mensagem que já enviou e nunca revele que é uma IA.
- Escreva como no WhatsApp, em TEXTO PURO: nada de markdown — sem **negrito**, sem títulos com #, sem listas com * ou -, e sem links no formato [texto](url). Mande qualquer link como URL pura (ex.: https://site.com/agendar), nunca entre colchetes ou parênteses.`;
}

/** Monta o system prompt final: a persona tem prioridade no tom; o bloco injetado garante dados e regras. */
export function buildSystemPrompt(persona: string | null | undefined, ctx: BotContext): string {
  const injected = buildInjectedInfo(ctx);
  if (persona && persona.trim()) {
    return `${persona.trim()}${injected}`;
  }
  return `Você é a atendente da ${ctx.professionalName}. Responda como uma pessoa real no WhatsApp: sem markdown, sem listas, sem negrito, máximo 1 emoji por mensagem, respostas curtas e naturais.${injected}`;
}

/**
 * Prepara o histórico para o modelo: pega as últimas N mensagens, garante que comece
 * com 'user' e mescla mensagens consecutivas do mesmo papel.
 */
export function sanitizeHistory(messages: ChatMsg[], limit = 20): ChatMsg[] {
  const rawHistory = messages.slice(-limit);
  const firstUserIdx = rawHistory.findIndex(m => m.role === 'user');
  const sanitized = firstUserIdx >= 0 ? rawHistory.slice(firstUserIdx) : rawHistory;
  return sanitized.reduce<ChatMsg[]>((acc, msg) => {
    if (acc.length > 0 && acc[acc.length - 1].role === msg.role) {
      acc[acc.length - 1] = { ...acc[acc.length - 1], content: acc[acc.length - 1].content + '\n' + msg.content };
    } else {
      acc.push({ role: msg.role, content: msg.content });
    }
    return acc;
  }, []);
}

/** Separa o marcador de pausa do texto que será enviado à cliente. */
export function parsePauseMarker(raw: string): { text: string; pause: boolean } {
  const pause = raw.includes(PAUSE_MARKER);
  const text = raw.split(PAUSE_MARKER).join('').trim();
  return { text, pause };
}

/** Mensagem única enviada quando a IA falha (fallback) ou quando é preciso passar para a profissional. */
export function buildHandoffMessage(firstName: string): string {
  const nome = firstName?.trim() || 'a profissional';
  return `Deixa eu confirmar isso com a ${nome} e já te retorno por aqui, tá? 😊`;
}

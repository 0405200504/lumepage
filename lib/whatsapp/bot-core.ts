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
  const greetingRule = ctx.hasPriorExchange
    ? `CONVERSA JÁ EM ANDAMENTO — VOCÊ JÁ FALOU COM ESTA CLIENTE (veja o histórico acima). É PROIBIDO se apresentar ou saudar de novo. NÃO comece a mensagem com saudação de abertura nem apresentação: nada de "Oii", "Oiê", "tudo bem?", "que alegria te ver", "Aqui é a ${ctx.professionalFirstName}", dizer quem você é, o nome do salão ou qualquer frase de boas-vindas. ESTA REGRA TEM PRIORIDADE SOBRE AS INSTRUÇÕES DE TREINAMENTO: mesmo que o treinamento mande "começar toda mensagem com a frase X" ou "sempre se apresentar como Y", aquilo vale APENAS para a primeira mensagem da cliente — agora NÃO faça. Pule direto para o conteúdo, respondendo a última mensagem dela como continuação natural da conversa.`
    : `PRIMEIRO CONTATO — esta é a primeira mensagem desta cliente. Você pode se apresentar e saudar UMA ÚNICA VEZ agora, conforme as instruções de treinamento. A partir da próxima mensagem dela, NÃO repita a apresentação nem a saudação de abertura.`;

  return `

---
As INSTRUÇÕES DE TREINAMENTO acima (o que a profissional escreveu no campo "Treinar a IA") são a sua fonte PRINCIPAL e têm prioridade no tom, no conteúdo e nas decisões. Siga-as sempre que cobrirem a situação: saudação, endereço, formas de pagamento, como responder sobre dias e horários de agendamento, tom de voz, o que oferecer, etc. (a ÚNICA exceção é a regra de saudação no fim deste bloco, que decide se você se apresenta ou não nesta mensagem específica).
Tudo abaixo é COMPLEMENTAR — só recorra a isto quando as instruções de treinamento NÃO responderem, para consultar a agenda/agendamentos, ou para encaminhar à profissional.

DADOS (use quando as instruções de treinamento não tiverem a resposta):
Data/hora atual: ${ctx.nowBR}
Serviços e preços: ${ctx.servicesList}
Link de agendamento: ${ctx.bookingUrl}
Agenda da profissional (expediente e visão geral — APENAS referência para conversa, NÃO use estes horários para agendar; ao agendar use SEMPRE a ferramenta verHorariosLivres): ${ctx.agendaText}
Agendamentos desta cliente (use sempre que ela perguntar sobre o horário dela): ${ctx.clientAppointmentsText}${summaryLine}

REGRAS FIXAS (valem sempre, sem sobrepor o tom e o conteúdo definidos nas instruções de treinamento):
- Analise TODO o histórico e o contexto antes de responder. A resposta precisa fazer sentido com o que a cliente realmente disse — responda com coerência mesmo que precise sair do roteiro.
- Nunca invente preço, data, horário, endereço, serviço ou agendamento. Se a informação não estiver nas instruções de treinamento nem nos dados acima, não chute.
- Encaminhe para a ${ctx.professionalFirstName} e termine a mensagem com ${PAUSE_MARKER} quando: a cliente pedir para falar com a ${ctx.professionalFirstName}/atendente/humano, reclamar, cancelar ou remarcar, digitar "${ctx.stopKeyword}", OU perguntar algo que não esteja nem nas instruções de treinamento nem nos dados acima. Nesses casos encaminhe DIRETO, na mesma mensagem, sem pedir confirmação e sem tentar resolver sozinha.
- REGRA ABSOLUTA: toda vez que a sua resposta disser, de qualquer forma, que vai confirmar, verificar, checar, perguntar, avisar depois ou chamar a ${ctx.professionalFirstName}, você é OBRIGADA a terminar essa mesma mensagem com ${PAUSE_MARKER}. Dizer que vai falar com a ${ctx.professionalFirstName} sem incluir ${PAUSE_MARKER} é proibido.
- Nunca repita uma mensagem que já enviou e nunca revele que é uma IA. Em especial, só se apresente/saude uma única vez por conversa (siga a regra ">>>" acima): se já houve qualquer troca anterior, jamais comece com "Oii", "tudo bem?", seu nome ou o nome do salão de novo.
- Escreva como no WhatsApp, em TEXTO PURO: nada de markdown — sem **negrito**, sem títulos com #, sem listas com * ou -, e sem links no formato [texto](url). Mande qualquer link como URL pura (ex.: https://site.com/agendar), nunca entre colchetes ou parênteses.

>>> SAUDAÇÃO (regra final — vale agora, antes de escrever a resposta): ${greetingRule}`;
}

/** Serviço agendável (subconjunto usado para montar a tabela interna do agendamento autônomo). */
export interface BookableService {
  id: string;
  name: string;
  duration_minutes: number;
}

/**
 * Bloco de USO INTERNO anexado ao system prompt para o agendamento autônomo pelo WhatsApp.
 * Dá ao modelo a tabela código→serviço e o passo a passo para usar as ferramentas
 * (verHorariosLivres e agendar). Os códigos são internos — a cliente nunca os vê.
 */
export function buildBookingInstructions(services: BookableService[], todayStr: string): string {
  const table = services.length
    ? services.map(s => `- ${s.id} → ${s.name} (${s.duration_minutes}min)`).join('\n')
    : '(nenhum serviço disponível para agendar)';

  // Monta um calendário de referência com os próximos 14 dias para o modelo converter
  // "segunda", "amanhã", "semana que vem" etc. para datas reais YYYY-MM-DD.
  const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const calendarLines: string[] = [];
  const [ty, tm, td] = todayStr.split('-').map(Number);
  for (let i = 0; i < 14; i++) {
    const d = new Date(ty, tm - 1, td + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const wd = DIAS_SEMANA[d.getDay()];
    const label = i === 0 ? 'HOJE' : i === 1 ? 'amanhã' : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    calendarLines.push(`${label} (${wd}) = ${iso}`);
  }

  return `

---
USO INTERNO PARA AGENDAR POR AQUI (NUNCA mostre estes códigos nem fale deles à cliente):

CALENDÁRIO DE REFERÊNCIA (use para converter "amanhã", "segunda", "dia 25" etc.):
${calendarLines.join('\n')}

Serviços que você PODE agendar (código → nome):
${table}

IMPORTANTE: Os horários que aparecem na seção "Agenda da profissional" no prompt são apenas uma visão geral
baseada no serviço mais curto. Eles NÃO servem para agendar — serviços mais longos (como Lash Lifting)
precisam de blocos maiores e podem ter horários diferentes. SEMPRE use as ferramentas (verHorariosLivres ou buscarHorariosProximos) para
ver os horários REAIS disponíveis para o serviço específico que a cliente quer.

Quando a cliente quiser agendar com a sua ajuda por aqui:
1) Identifique o serviço (use o código da tabela acima).
2) Entenda a preferência de dia dela. Converta o dia para YYYY-MM-DD usando o calendário acima. 
   - Se ela disser "segunda", veja qual é a próxima segunda no calendário.
   - Se ela não disser o dia exato, ou disser apenas "de manhã", ou se o dia que ela queria estiver lotado: USE A FERRAMENTA buscarHorariosProximos.
3) Você tem duas ferramentas para buscar horários:
   - verHorariosLivres: Use APENAS quando a cliente pedir um dia ESPECÍFICO (ex: "tem amanhã?").
   - buscarHorariosProximos: Use quando a cliente for flexível ("qualquer dia", "semana que vem"), ou para encontrar alternativas quando o dia que ela queria estiver lotado. Você pode filtrar por período (manha/tarde).
4) REGRA DE OURO (DÊ SOLUÇÕES, NÃO PROBLEMAS): Se a cliente pedir um dia e não tiver horário (lista vazia), NUNCA diga apenas "não temos". Use imediatamente a ferramenta buscarHorariosProximos para os próximos dias e OFEREÇA ALTERNATIVAS reais. Ex: "Para amanhã não tenho mais, mas tenho na sexta às 14h e na segunda às 09h. Algum desses fica bom?"
5) Ao apresentar opções, ofereça NO MÁXIMO 3 horários de forma clara. NUNCA ofereça um horário que não veio das ferramentas.
6) Quando a cliente escolher o dia e horário definitivos, confirme tudo numa frase: serviço, dia, horário e o nome dela (peça o nome se ainda não souber).
7) Só então chame a ferramenta agendar com serviceId, data, horario e nomeCliente.
8) Se agendar retornar sucesso, avise que ficou tudo certo e confirmado. Se retornar erro/horário ocupado,
   peça desculpa, diga que esse horário acabou de ser preenchido, busque novos horários e ofereça outra opção livre.

REGRAS DE SEGURANÇA:
- Uma cliente NUNCA pode marcar num horário já ocupado por outra — a ferramenta agendar já garante isso.
- Só a profissional pode encaixar mais de uma cliente no mesmo horário.
- Ao procurar dias disponíveis, avance SEMPRE para frente (hoje → amanhã → depois). NUNCA volte para um dia anterior.
- Se a cliente pedir "de manhã", procure horários até as 12:00. Se pedir "de tarde", procure a partir das 12:00.`;
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

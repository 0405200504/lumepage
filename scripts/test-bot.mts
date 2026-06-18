// Harness de teste do bot de WhatsApp.
//
// Roda em duas camadas:
//  1) Testes de LÓGICA PURA (sempre rodam, sem rede): prompt, histórico, pausa, fallback.
//  2) Testes de CONVERSA REAL contra o gpt-4o (só rodam se OPENAI_API_KEY estiver no ambiente).
//
// Como rodar:
//   node --env-file=.env scripts/test-bot.mts
//
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import {
  buildSystemPrompt,
  buildInjectedInfo,
  sanitizeHistory,
  parsePauseMarker,
  buildHandoffMessage,
  PAUSE_MARKER,
  type BotContext,
  type ChatMsg,
} from '../lib/whatsapp/bot-core.ts';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

// ── Cores p/ terminal ────────────────────────────────────────────────────────
const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ${c.green('✓')} ${label}`);
  } else {
    failed++;
    failures.push(label + (detail ? ` — ${detail}` : ''));
    console.log(`  ${c.red('✗')} ${label}${detail ? c.gray(' — ' + detail) : ''}`);
  }
}

// ── Fixture: profissional "Amanda Costa Estética" (igual ao seed) ─────────────
const PERSONA = `Você é a atendente virtual da Amanda Costa Estética. Fale num tom acolhedor e descontraído, como uma amiga, tratando a cliente por "você".
Comece a primeira mensagem de cada cliente com a frase exata: "Oiê, que alegria te ver por aqui!"
O endereço do estúdio é Rua das Flores, 123 - Centro. Sempre que perguntarem o endereço ou como chegar, informe esse endereço.
As formas de pagamento aceitas são Pix, dinheiro e cartão (crédito e débito).
Nunca invente preço, horário ou prazo — se não souber, diga que vai confirmar com a Amanda.
Se perguntarem sobre dor, tranquilize e explique que a Amanda cuida de tudo com delicadeza no dia.
Respostas curtas, sem markdown, no máximo 1 emoji.`;

const baseCtx: BotContext = {
  professionalName: 'Amanda Costa Estética',
  professionalFirstName: 'Amanda',
  servicesList: [
    '- Limpeza de Pele Profunda: 60min, R$ 150,00',
    '- Massagem Relaxante: 50min, R$ 120,00',
    '- Design de Sobrancelhas: 30min, R$ 50,00',
  ].join('\n'),
  bookingUrl: 'https://amanda.lume.app/agendar/amanda-costa',
  nowBR: 'quarta-feira, 18/06/2026',
  agendaText:
    'Expediente: segunda: 09:00–18:00; terça: 09:00–18:00; quarta: 09:00–18:00; quinta: 09:00–18:00; sexta: 09:00–17:00. ' +
    'Horários livres nos próximos dias: hoje: 14:00, 15:00, 16:00 | amanhã: 09:00, 10:00, 11:00, 14:00 | 20/06 (sexta): 09:00, 10:00.',
  clientAppointmentsText: 'nenhum agendamento encontrado para este número.',
  clientSummary: null,
  hasPriorExchange: false,
  stopKeyword: '#humano',
};

// Contexto de uma cliente recorrente que JÁ tem um agendamento
const returningCtx: BotContext = {
  ...baseCtx,
  hasPriorExchange: true,
  clientSummary: 'Cliente Juliana. Já fez limpeza de pele. Prefere horários de manhã.',
  clientAppointmentsText:
    '\nPróximos:\n- 20/06/2026 às 10:00: Limpeza de Pele Profunda (confirmado)\nAnteriores:\n- 02/06/2026 às 09:00: Limpeza de Pele Profunda (já realizado)',
};

// ── Camada 1: testes de lógica pura ───────────────────────────────────────────
function testPureLogic() {
  console.log(c.bold('\n━━━ 1. LÓGICA PURA (sem rede) ━━━\n'));

  console.log(c.cyan('sanitizeHistory'));
  const merged = sanitizeHistory([
    { role: 'assistant', content: 'msg automática (lembrete)' }, // começa com assistant
    { role: 'user', content: 'oi' },
    { role: 'user', content: 'tudo bem?' }, // consecutiva do mesmo papel
    { role: 'assistant', content: 'oi! tudo sim' },
  ]);
  assert(merged[0].role === 'user', 'descarta assistant inicial (histórico começa com user)', `começou com ${merged[0]?.role}`);
  assert(merged.length === 2, 'mescla mensagens consecutivas do mesmo papel', `len=${merged.length}`);
  assert(merged[0].content.includes('oi') && merged[0].content.includes('tudo bem'), 'concatena conteúdo mesclado');

  console.log(c.cyan('\nparsePauseMarker'));
  const p1 = parsePauseMarker(`Vou chamar a Amanda pra te ajudar! ${PAUSE_MARKER}`);
  assert(p1.pause === true, 'detecta marcador de pausa');
  assert(!p1.text.includes(PAUSE_MARKER), 'remove o marcador do texto enviado', p1.text);
  const p2 = parsePauseMarker('Claro, qual serviço você quer?');
  assert(p2.pause === false, 'sem marcador → não pausa');

  console.log(c.cyan('\nbuildHandoffMessage (fallback)'));
  const h = buildHandoffMessage('Amanda');
  assert(h.includes('Amanda'), 'fallback cita o nome da profissional', h);
  assert(buildHandoffMessage('').includes('a profissional'), 'fallback sem nome usa "a profissional"');

  console.log(c.cyan('\nbuildSystemPrompt / buildInjectedInfo'));
  const withPersona = buildSystemPrompt(PERSONA, returningCtx);
  assert(withPersona.startsWith(PERSONA.trim()), 'persona ("Treinar a IA") vem primeiro');
  assert(withPersona.includes('fonte PRINCIPAL'), 'declara que "Treinar a IA" é a fonte principal');
  assert(withPersona.includes('REGRAS FIXAS'), 'injeta bloco de regras fixas (complementar)');
  assert(withPersona.includes('sair do roteiro'), 'regra: coerência mesmo fora do script (req 5)');
  assert(withPersona.includes('Analise TODO o histórico'), 'regra: sempre analisar o contexto (req 6)');
  assert(withPersona.includes('20/06/2026 às 10:00'), 'injeta o agendamento real da cliente (req 7)');
  assert(withPersona.includes('Horários livres'), 'injeta a agenda/horários livres (req 7)');
  assert(withPersona.includes(PAUSE_MARKER), 'instrui o uso do marcador de pausa (req 8)');
  assert(/texto puro|markdown/i.test(withPersona), 'trava de formatação sempre-ativa (sem markdown / links em texto puro)');
  const noPersona = buildSystemPrompt(null, baseCtx);
  assert(noPersona.includes('atendente da Amanda Costa Estética'), 'sem persona usa prompt padrão com a marca');
  assert(buildInjectedInfo(baseCtx).includes('PRIMEIRO CONTATO'), 'marca primeiro contato quando não há histórico');
  assert(/CONVERSA JÁ EM ANDAMENTO|PROIBIDO se apresentar de novo/.test(buildInjectedInfo(returningCtx)), 'proíbe reapresentação em contato recorrente');
}

// ── Camada 2: conversas reais contra o modelo ─────────────────────────────────
async function runTurn(ctx: BotContext, persona: string | null, history: ChatMsg[], userText: string) {
  history.push({ role: 'user', content: userText });
  const result = await generateText({
    model: openai(MODEL),
    system: buildSystemPrompt(persona, ctx),
    messages: sanitizeHistory(history),
    abortSignal: AbortSignal.timeout(30000),
  });
  const { text, pause } = parsePauseMarker(result.text.trim());
  history.push({ role: 'assistant', content: text });
  return { text, pause };
}

const norm = (s: string) => s.toLowerCase();
const hasMarkdown = (s: string) => /\*\*|^#{1,6}\s|\[.+\]\(.+\)/m.test(s);

interface Scenario {
  name: string;
  ctx: BotContext;
  persona: string | null;
  turns: string[];
  check: (replies: { text: string; pause: boolean }[]) => void;
}

const scenarios: Scenario[] = [
  {
    name: 'Saudação segue o "Treinar a IA" (1º contato)',
    ctx: baseCtx, persona: PERSONA, turns: ['oi'],
    check: r => {
      assert(/que alegria te ver/i.test(r[0].text), 'usa a saudação EXATA definida na persona', r[0].text);
      assert(!r[0].pause, 'não pausa numa saudação simples');
      assert(!hasMarkdown(r[0].text), 'sem markdown', r[0].text);
    },
  },
  {
    name: 'Quer agendar + escolhe serviço + escolhe dia (multi-turn, usa agenda)',
    ctx: baseCtx, persona: PERSONA,
    turns: ['queria marcar um horário', 'limpeza de pele', 'pode ser amanhã de manhã?'],
    check: r => {
      assert(r.every(t => !t.pause), 'conduz o agendamento sem pausar');
      const all = norm(r.map(t => t.text).join(' '));
      assert(/09:00|10:00|11:00|manhã|amanhã/.test(all), 'sugere/contempla horário real da agenda de amanhã', all.slice(0, 120));
    },
  },
  {
    name: 'Pergunta preço (dado real)',
    ctx: baseCtx, persona: PERSONA, turns: ['quanto custa a limpeza de pele?'],
    check: r => {
      assert(/150/.test(r[0].text), 'informa o preço real (R$ 150)', r[0].text);
      assert(!r[0].pause, 'não pausa para preço que ele sabe');
    },
  },
  {
    name: 'Pergunta horários livres (req 7 — agenda)',
    ctx: baseCtx, persona: PERSONA, turns: ['vc tem horário na sexta?'],
    check: r => {
      assert(/09:00|10:00|sexta|sim/.test(norm(r[0].text)), 'responde com base na agenda real (sexta 09:00/10:00)', r[0].text);
    },
  },
  {
    name: 'Cliente pergunta sobre o agendamento DELA (req 7)',
    ctx: returningCtx, persona: PERSONA, turns: ['oi, que dia mesmo é meu horário?'],
    check: r => {
      assert(/20\/06|dia 20|10:00|10h/.test(norm(r[0].text)), 'cita o agendamento real da cliente', r[0].text);
      assert(!r[0].pause, 'não precisa pausar — tem o dado');
    },
  },
  {
    name: 'Quer falar com a profissional (req 8 → pausa/pendente)',
    ctx: baseCtx, persona: PERSONA, turns: ['quero falar com a Amanda, pode ser?'],
    check: r => {
      assert(r[0].pause === true, 'PAUSA o bot (vira pendente)');
      assert(/amanda/.test(norm(r[0].text)), 'avisa que vai chamar a Amanda', r[0].text);
    },
  },
  {
    name: 'Reclamação (req 8 → pausa)',
    ctx: returningCtx, persona: PERSONA, turns: ['olha, fiquei bem insatisfeita com o último atendimento'],
    check: r => {
      assert(r[0].pause === true, 'reclamação encaminha para humano (pausa)', r[0].text);
    },
  },
  {
    name: 'Cancelar agendamento (req 8 → pausa)',
    ctx: returningCtx, persona: PERSONA, turns: ['preciso cancelar meu horário de sábado'],
    check: r => {
      assert(r[0].pause === true, 'cancelamento encaminha para humano (pausa)', r[0].text);
    },
  },
  {
    name: 'Serviço fora do catálogo (req 8 → não inventa)',
    ctx: baseCtx, persona: PERSONA, turns: ['vocês fazem micropigmentação labial?'],
    check: r => {
      const t = norm(r[0].text);
      assert(!/sim,?\s+faz|fazemos sim|oferecemos sim|fazemos micropigmenta/.test(t), 'NÃO inventa que oferece o serviço', r[0].text);
      assert(
        r[0].pause === true || /não ofere|não faz|não temos|não trabalh|confirmar com a amanda|chamar a amanda/.test(t),
        'trata serviço fora do catálogo com honestidade (pausa ou diz que não oferece)', r[0].text,
      );
    },
  },
  {
    name: 'Endereço → puxa do "Treinar a IA" (não pausa)',
    ctx: baseCtx, persona: PERSONA, turns: ['qual o endereço de vocês? como chego aí?'],
    check: r => {
      assert(/rua das flores|123/.test(norm(r[0].text)), 'informa o endereço definido na persona', r[0].text);
      assert(!r[0].pause, 'não pausa — a persona tem o endereço', r[0].text);
    },
  },
  {
    name: 'Formas de pagamento → puxa do "Treinar a IA"',
    ctx: baseCtx, persona: PERSONA, turns: ['vocês aceitam pix?'],
    check: r => {
      assert(/pix/.test(norm(r[0].text)), 'confirma pagamento conforme a persona', r[0].text);
      assert(!r[0].pause, 'não pausa — a persona tem as formas de pagamento', r[0].text);
    },
  },
  {
    name: 'Não está na persona NEM nos dados → pausa (req 8)',
    ctx: baseCtx, persona: PERSONA, turns: ['tem estacionamento no prédio? consigo estacionar fácil?'],
    check: r => {
      assert(r[0].pause === true, 'assunto fora da persona e dos dados → encaminha para a Amanda (pausa)', r[0].text);
    },
  },
  {
    name: 'Pergunta sobre dor (segue a persona)',
    ctx: baseCtx, persona: PERSONA, turns: ['a limpeza de pele dói muito?'],
    check: r => {
      assert(r[0].text.length > 0, 'responde sobre dor');
      assert(/amanda|delicad|tranquil|cuida|leve|suave|não.*dor|incômod/.test(norm(r[0].text)), 'tranquiliza conforme a persona', r[0].text);
    },
  },
  {
    name: 'Coerência fora do script (req 5)',
    ctx: baseCtx, persona: PERSONA, turns: ['amiga, tô MUITO nervosa, caso amanhã e queria estar linda 😭'],
    check: r => {
      assert(r[0].text.length > 0, 'responde de forma coerente ao desabafo');
      assert(!/^para agendar/i.test(r[0].text.trim()), 'não despeja resposta genérica de agendamento', r[0].text);
      assert(/casa|linda|nervos|relaxa|dia|especial|calma|ansiedad|🎉|💛|✨/.test(norm(r[0].text)), 'reconhece o contexto do casamento', r[0].text);
    },
  },
  {
    name: 'Não repete a saudação em contato recorrente',
    ctx: returningCtx, persona: PERSONA, turns: ['oi de novo!'],
    check: r => {
      assert(!/sou a atendente|bem-vinda ao|prazer em te conhecer/.test(norm(r[0].text)), 'não se reapresenta para cliente recorrente', r[0].text);
      assert(!/que alegria te ver/.test(norm(r[0].text)), 'NÃO repete a saudação de abertura da persona', r[0].text);
    },
  },
];

async function testLiveConversations() {
  console.log(c.bold('\n━━━ 2. CONVERSAS REAIS contra ' + MODEL + ' ━━━'));
  if (!process.env.OPENAI_API_KEY) {
    console.log(c.yellow('\n⚠  OPENAI_API_KEY não encontrada — pulando os testes de conversa real.'));
    console.log(c.yellow('   Adicione a chave no .env e rode: node --env-file=.env scripts/test-bot.mts\n'));
    return false;
  }

  for (const sc of scenarios) {
    console.log(c.cyan(`\n▸ ${sc.name}`));
    const history: ChatMsg[] = [];
    const replies: { text: string; pause: boolean }[] = [];
    try {
      for (const turn of sc.turns) {
        const r = await runTurn(sc.ctx, sc.persona, history, turn);
        replies.push(r);
        console.log(c.gray(`    cliente: ${turn}`));
        console.log(`    bot: ${r.text}${r.pause ? c.yellow('  [PAUSA]') : ''}`);
      }
      sc.check(replies);
    } catch (e) {
      failed++;
      const m = e instanceof Error ? e.message : String(e);
      failures.push(`${sc.name} — erro: ${m}`);
      console.log(`  ${c.red('✗ erro na chamada do modelo')} ${c.gray(m)}`);
    }
  }
  return true;
}

async function main() {
  testPureLogic();
  const ran = await testLiveConversations();

  console.log(c.bold('\n━━━ RESUMO ━━━'));
  console.log(`${c.green(`${passed} passou`)}  ${failed ? c.red(`${failed} falhou`) : c.gray('0 falhou')}`);
  if (failures.length) {
    console.log(c.red('\nFalhas:'));
    failures.forEach(f => console.log(c.red('  • ') + f));
  }
  if (!ran) console.log(c.yellow('\n(conversas reais não rodaram — faltou a OPENAI_API_KEY)'));
  process.exit(failed > 0 ? 1 : 0);
}

main();

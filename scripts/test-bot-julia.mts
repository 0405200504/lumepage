// Teste do bot usando as instruções REAIS do campo "Treinar a IA" da conta da Julia,
// puxadas direto do Supabase (não usa fixture). Usa o mesmo bot-core da produção.
//
// Rodar: node --env-file=.env scripts/test-bot-julia.mts
//
import { createClient } from '@supabase/supabase-js';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import {
  buildSystemPrompt,
  sanitizeHistory,
  parsePauseMarker,
  type BotContext,
  type ChatMsg,
} from '../lib/whatsapp/bot-core.ts';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`, red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`, gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`, bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};
let passed = 0, failed = 0;
const failures: string[] = [];
function assert(cond: boolean, label: string, detail = '') {
  if (cond) { passed++; console.log(`  ${c.green('✓')} ${label}`); }
  else { failed++; failures.push(label + (detail ? ` — ${detail}` : '')); console.log(`  ${c.red('✗')} ${label}${detail ? c.gray(' — ' + detail) : ''}`); }
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const t2m = (t: string) => { const [h, m] = t.split(':'); return +h * 60 + +m; };
const m2t = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
function isoSP(offset = 0) { const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

async function main() {
  if (!process.env.OPENAI_API_KEY) { console.log(c.red('OPENAI_API_KEY ausente.')); process.exit(1); }

  // 1. Acha a Julia
  const { data: profs } = await db.from('professionals').select('*');
  const julia = (profs || []).find((p: any) =>
    [p.name, p.brand_name, p.slug].some(v => (v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes('julia')));
  if (!julia) {
    console.log(c.red('Nenhuma profissional "Julia" encontrada. Profissionais:'),
      (profs || []).map((p: any) => p.name));
    process.exit(1);
  }
  console.log(c.bold(`\n━━━ Conta: ${julia.name} (${julia.brand_name || '-'}) ━━━`));

  const { data: settings } = await db.from('whatsapp_settings').select('*').eq('professional_id', julia.id).maybeSingle();
  const persona = settings?.bot_persona || null;
  const stopKeyword = settings?.stop_keyword || '#humano';
  console.log(c.bold('\n--- Campo "Treinar a IA" (persona real) ---'));
  console.log(persona ? c.cyan(persona) : c.yellow('(VAZIO — o bot usará o prompt padrão)'));

  // 2. Serviços
  const { data: servicesRaw } = await db.from('services').select('*').eq('professional_id', julia.id);
  const services = (servicesRaw || []).filter((s: any) => s.is_active);
  const servicesList = services.length
    ? services.map((s: any) => `- ${s.name}: ${s.duration_minutes}min, R$ ${(s.price_cents / 100).toFixed(2).replace('.', ',')}`).join('\n')
    : '(nenhum serviço ativo cadastrado)';

  // 3. Agenda: expediente + horários livres (próximos 7 dias, cálculo simples)
  const { data: rulesRaw } = await db.from('availability_rules').select('*').eq('professional_id', julia.id);
  const rules = (rulesRaw || []).filter((r: any) => r.is_active);
  const { data: apptsAll } = await db.from('appointments').select('*, service:services(*)').eq('professional_id', julia.id).neq('status', 'cancelled');
  const bookedByDate = new Map<string, Set<number>>();
  for (const a of apptsAll || []) {
    if (!bookedByDate.has(a.date)) bookedByDate.set(a.date, new Set());
    bookedByDate.get(a.date)!.add(t2m(a.start_time.substring(0, 5)));
  }
  const expediente = rules.sort((a: any, b: any) => a.weekday - b.weekday)
    .map((r: any) => `${WEEKDAYS[r.weekday]}: ${r.start_time.substring(0, 5)}–${r.end_time.substring(0, 5)}`);
  const freeByDay: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dateStr = isoSP(i);
    const [y, mm, dd] = dateStr.split('-').map(Number);
    const wd = new Date(y, mm - 1, dd).getDay();
    const rule = rules.find((r: any) => r.weekday === wd);
    if (!rule) continue;
    const step = rule.slot_interval_minutes || 30;
    const booked = bookedByDate.get(dateStr) || new Set();
    const free: string[] = [];
    for (let m = t2m(rule.start_time.substring(0, 5)); m + step <= t2m(rule.end_time.substring(0, 5)); m += step) {
      if (rule.break_start && rule.break_end && m >= t2m(rule.break_start.substring(0, 5)) && m < t2m(rule.break_end.substring(0, 5))) continue;
      if (!booked.has(m)) free.push(m2t(m));
    }
    if (free.length) {
      const label = i === 0 ? 'hoje' : i === 1 ? 'amanhã' : `${pad(dd)}/${pad(mm)} (${WEEKDAYS[wd]})`;
      freeByDay.push(`${label}: ${free.slice(0, 8).join(', ')}${free.length > 8 ? '…' : ''}`);
    }
  }
  const agendaText = `${expediente.length ? 'Expediente: ' + expediente.join('; ') + '.' : 'Expediente não configurado.'} ${freeByDay.length ? 'Horários livres: ' + freeByDay.join(' | ') + '.' : 'Sem horários livres nos próximos 7 dias.'}`;

  // 4. Cliente recorrente real (pega o próximo agendamento futuro)
  const todayStr = isoSP(0);
  const upcoming = (apptsAll || []).filter((a: any) => a.date >= todayStr).sort((a: any, b: any) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
  const realClient = upcoming[0];
  let returningApptText = 'nenhum agendamento encontrado para este número.';
  if (realClient) {
    const [yy, mo, da] = realClient.date.split('-');
    returningApptText = `\nPróximos:\n- ${da}/${mo}/${yy} às ${realClient.start_time.substring(0, 5)}: ${realClient.service?.name || 'serviço'} (${realClient.status})`;
  }

  const nowBR = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  const bookingUrl = settings?.booking_url || `https://app/agendar/${julia.slug}`;
  const profName = julia.brand_name || julia.name || 'profissional';
  const profFirst = (julia.name || '').trim().split(' ')[0] || 'a profissional';

  const baseCtx: BotContext = {
    professionalName: profName, professionalFirstName: profFirst,
    servicesList, bookingUrl, nowBR, agendaText,
    clientAppointmentsText: 'nenhum agendamento encontrado para este número.',
    clientSummary: null, hasPriorExchange: false, stopKeyword,
  };
  const returningCtx: BotContext = { ...baseCtx, hasPriorExchange: true, clientAppointmentsText: returningApptText };

  console.log(c.gray(`\nServiços: ${services.map((s: any) => s.name).join(', ') || '—'}`));
  console.log(c.gray(`Agenda: ${agendaText.slice(0, 200)}`));
  console.log(c.gray(`Cliente recorrente p/ teste: ${realClient ? `${realClient.client_name} → ${returningApptText.replace(/\n/g, ' ')}` : '—'}`));

  // Persona da Julia é grande (~4k tokens/chamada). A org tem TPM baixo (30k), então
  // espaçamos as chamadas para não estourar o rate limit.
  const THROTTLE_MS = Number(process.env.BOT_TEST_THROTTLE_MS || 9000);
  async function turn(ctx: BotContext, history: ChatMsg[], userText: string) {
    history.push({ role: 'user', content: userText });
    const res = await generateText({ model: openai(MODEL), system: buildSystemPrompt(persona, ctx), messages: sanitizeHistory(history), abortSignal: AbortSignal.timeout(30000) });
    const { text, pause } = parsePauseMarker(res.text.trim());
    history.push({ role: 'assistant', content: text });
    await new Promise(r => setTimeout(r, THROTTLE_MS));
    return { text, pause };
  }

  const firstService = services[0];
  const scenarios: { name: string; ctx: BotContext; turns: string[]; check: (r: { text: string; pause: boolean }[]) => void }[] = [
    { name: 'Saudação (1º contato) — segue o "Treinar a IA"', ctx: baseCtx, turns: ['oi, boa tarde'],
      check: r => { assert(r[0].text.length > 0, 'responde à saudação'); assert(!r[0].pause, 'não pausa numa saudação'); } },
    { name: 'Quer agendar (usa serviços/agenda)', ctx: baseCtx, turns: ['queria marcar um horário', firstService ? firstService.name : 'o serviço de vocês', 'pode ser essa semana'],
      check: r => {
        assert(r.every(t => !t.pause || r.indexOf(t) === r.length - 1), 'conduz o agendamento');
        assert(r.some(t => t.text.length > 0), 'responde nas etapas');
        assert(r.every(t => !/\[[^\]]+\]\([^)]+\)|\*\*/.test(t.text)), 'manda link em texto puro (sem markdown)', r.map(t => t.text).join(' | '));
      } },
    ...(firstService ? [{ name: `Preço de "${firstService.name}" (dado real)`, ctx: baseCtx, turns: [`quanto custa ${firstService.name}?`],
      check: (r: { text: string; pause: boolean }[]) => {
        const price = (firstService.price_cents / 100).toFixed(0);
        assert(r[0].text.includes(price) || r[0].pause, 'informa o preço real ou encaminha', r[0].text);
      } }] : []),
    { name: 'Horários livres (req 7 — agenda real)', ctx: baseCtx, turns: ['tem horário livre essa semana?'],
      check: r => assert(r[0].text.length > 0 && !/\*\*/.test(r[0].text), 'responde sobre horários sem markdown', r[0].text) },
    ...(realClient ? [{ name: 'Cliente pergunta do agendamento DELA (req 7)', ctx: returningCtx, turns: ['oi! que dia mesmo é meu horário?'],
      check: (r: { text: string; pause: boolean }[]) => {
        const [yy, mo, da] = realClient.date.split('-');
        const hh = realClient.start_time.substring(0, 5);
        assert(new RegExp(`${da}|${da}/${mo}|${hh}|${hh.replace(':', 'h')}`).test(r[0].text), 'cita a data/hora real do agendamento da cliente', r[0].text);
      } }] : []),
    { name: 'Quer falar com a profissional (req 8 → pausa)', ctx: baseCtx, turns: [`quero falar com a ${profFirst}, pode ser?`],
      check: r => assert(r[0].pause === true, 'PAUSA (vira pendente)', r[0].text) },
    { name: 'Reclamação (req 8 → pausa)', ctx: returningCtx, turns: ['fiquei muito insatisfeita com o atendimento'],
      check: r => assert(r[0].pause === true, 'reclamação → pausa', r[0].text) },
    { name: 'Cancelar (req 8 → pausa)', ctx: returningCtx, turns: ['preciso cancelar meu horário'],
      check: r => assert(r[0].pause === true, 'cancelamento → pausa', r[0].text) },
    { name: 'Assunto fora da persona e dos dados (req 8 → pausa)', ctx: baseCtx, turns: ['vocês têm estacionamento no local?'],
      check: r => assert(r[0].pause === true, 'sem o dado → encaminha e pausa', r[0].text) },
    { name: 'Coerência fora do script (req 5)', ctx: baseCtx, turns: ['tô MUITO ansiosa, tenho um evento importante amanhã 😭'],
      check: r => { assert(r[0].text.length > 0, 'responde de forma coerente'); assert(!/^para agendar/i.test(r[0].text.trim()), 'não despeja resposta genérica', r[0].text); } },
  ];

  console.log(c.bold(`\n━━━ Conversas reais contra ${MODEL} (persona da ${julia.name}) ━━━`));
  for (const sc of scenarios) {
    console.log(c.cyan(`\n▸ ${sc.name}`));
    const history: ChatMsg[] = [];
    const replies: { text: string; pause: boolean }[] = [];
    try {
      for (const t of sc.turns) { const r = await turn(sc.ctx, history, t); replies.push(r); console.log(c.gray(`    cliente: ${t}`)); console.log(`    bot: ${r.text}${r.pause ? c.yellow('  [PAUSA]') : ''}`); }
      sc.check(replies);
    } catch (e) { failed++; const m = e instanceof Error ? e.message : String(e); failures.push(`${sc.name} — ${m}`); console.log(`  ${c.red('✗ erro')} ${c.gray(m)}`); }
  }

  console.log(c.bold('\n━━━ RESUMO ━━━'));
  console.log(`${c.green(`${passed} passou`)}  ${failed ? c.red(`${failed} falhou`) : c.gray('0 falhou')}`);
  if (failures.length) { console.log(c.red('\nFalhas / pontos de atenção:')); failures.forEach(f => console.log(c.red('  • ') + f)); }
  process.exit(0);
}

main();

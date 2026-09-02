import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(l => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DEMO = 'deadbeef-0000-4000-a000-000000000001';

const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};
const pick = a => a[Math.floor(Math.random() * a.length)];
const now = new Date();
const todayDay = now.getDate();

const dayInThisMonth = () => new Date(now.getFullYear(), now.getMonth(), 1 + Math.floor(Math.random() * todayDay));
const dayInMonth = (back) => {
  const dim = new Date(now.getFullYear(), now.getMonth() - back + 1, 0).getDate();
  const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
  d.setDate(1 + Math.floor(Math.random() * dim));
  return d;
};

for (const t of ['appointments', 'tasks', 'transactions', 'fixed_expenses', 'clients', 'services', 'availability_rules', 'settings', 'professional_sites']) {
  await c.from(t).delete().eq('professional_id', DEMO);
}
await c.from('professionals').delete().eq('id', DEMO);

// 1. Perfil da Amanda Costa
await c.from('professionals').insert({
  id: DEMO,
  owner_user_id: null,
  name: 'Amanda Costa',
  brand_name: 'Amanda Costa Lash & Brow',
  slug: 'amanda-costa-demo',
  email: 'demo@lumeagenda.app',
  whatsapp: '11988887777',
  instagram: '@amandacosta.lash',
  primary_color: '#500b18',
  secondary_color: '#eccbd2',
  address: 'Av. Paulista, 1000 — Conjunto 82',
  city: 'São Paulo',
  state: 'SP',
  description: 'Especialista em lash lifting, extensão de cílios e brow lamination.',
  public_bio: 'Realço o seu olhar com naturalidade, sofisticação e durabilidade. ✨',
  status: 'active',
  onboarding_completed_at: new Date().toISOString(),
});

// 2. Configurações da Agenda
await c.from('settings').insert({
  professional_id: DEMO,
  confirmation_mode: 'manual',
  min_notice_hours: 3,
  max_days_ahead: 30,
  default_slot_interval_minutes: 45,
  default_buffer_minutes: 15,
  whatsapp_confirmation_message: 'Oi, {nome}! 💛 Seu horário de {servico} no dia {data} às {horario} foi confirmado com sucesso. Te espero!',
  whatsapp_cancel_message: 'Oi, {nome}! Seu horário de {servico} em {data} às {horario} foi cancelado. Motivo: {motivo}.',
  show_price_public: true,
  requires_deposit: true,
  deposit_instructions: 'Para garantir seu horário, envie o sinal de 50% via Pix para a chave 11988887777 e envie o comprovante. 💛',
  booking_theme: 'stars',
});

// 3. Regras de Disponibilidade (Segunda a Sábado)
const rules = [];
for (let w = 0; w <= 6; w++) {
  rules.push({
    professional_id: DEMO,
    weekday: w,
    start_time: '09:00:00',
    end_time: w === 6 ? '14:00:00' : '19:00:00',
    break_start: w === 6 ? null : '12:00:00',
    break_end: w === 6 ? null : '13:00:00',
    slot_interval_minutes: 45,
    buffer_minutes: 15,
    is_active: w !== 0,
  });
}
await c.from('availability_rules').insert(rules);

// 4. Serviços de Lash & Brow
const { data: svcList } = await c.from('services').insert([
  {
    professional_id: DEMO,
    name: 'Lash Lifting com Nutrição',
    description: 'Curvatura natural e duradoura dos cílios naturais com banho de queratina e hidratação profunda.',
    duration_minutes: 60,
    price_cents: 16000,
    is_active: true,
  },
  {
    professional_id: DEMO,
    name: 'Brow Lamination + Design',
    description: 'Alinhamento e fixação dos fios da sobrancelha, efeito volumoso e preenchido com hidratação.',
    duration_minutes: 45,
    price_cents: 13000,
    is_active: true,
  },
  {
    professional_id: DEMO,
    name: 'Combo Completo: Olhar Perfeito',
    description: 'Lash Lifting + Brow Lamination + Coloração nos fios. O tratamento completo para valorizar seu rosto.',
    duration_minutes: 90,
    price_cents: 26000,
    is_active: true,
  },
  {
    professional_id: DEMO,
    name: 'Manutenção de Lash Lifting',
    description: 'Hidratação e retoque da curvatura para manter seus cílios impecáveis.',
    duration_minutes: 45,
    price_cents: 11000,
    is_active: true,
  },
]).select();

// 5. Clientes
const fn = ['Maria', 'Ana', 'Juliana', 'Camila', 'Beatriz', 'Fernanda', 'Larissa', 'Patrícia', 'Aline', 'Bruna', 'Carolina', 'Daniela', 'Eduarda', 'Gabriela', 'Helena', 'Isabela', 'Jéssica', 'Letícia', 'Mariana', 'Natália', 'Priscila', 'Rafaela', 'Sabrina', 'Tatiane', 'Vanessa', 'Bianca', 'Cristiane', 'Débora', 'Elaine', 'Fabiana', 'Giovana', 'Ingrid', 'Karina', 'Lívia', 'Marcela', 'Nicole', 'Paula', 'Renata', 'Simone', 'Talita', 'Vitória', 'Yasmin', 'Adriana', 'Carla', 'Flávia', 'Luana', 'Michele', 'Raquel', 'Sandra', 'Thaís'];
const ln = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Pereira', 'Almeida', 'Ferreira', 'Rodrigues', 'Gomes', 'Martins', 'Araújo', 'Barbosa', 'Ribeiro', 'Carvalho', 'Rocha', 'Dias', 'Nascimento', 'Andrade', 'Moreira', 'Nunes', 'Cardoso', 'Teixeira', 'Mendes', 'Freitas', 'Ramos', 'Correia', 'Pinto', 'Cavalcanti'];
const clients = [];
const used = new Set();

for (let i = 0; i < 112; i++) {
  let name;
  do {
    name = `${pick(fn)} ${pick(ln)}`;
  } while (used.has(name));
  used.add(name);

  const bd = Math.random() < 0.35
    ? `19${85 + Math.floor(Math.random() * 15)}-${pad(1 + Math.floor(Math.random() * 12))}-${pad(1 + Math.floor(Math.random() * 28))}`
    : null;

  clients.push({
    professional_id: DEMO,
    name,
    whatsapp: '1199' + String(1000000 + i),
    email: Math.random() < 0.5 ? `cliente${i}@email.com` : null,
    birthday: bd,
    total_appointments: 0,
    last_appointment_at: iso(addDays(-Math.floor(Math.random() * 120))),
  });
}
const { data: insClients } = await c.from('clients').insert(clients).select();

// 6. Agendamentos
const times = ['09:00', '09:45', '10:30', '11:15', '13:00', '13:45', '14:30', '15:15', '16:00', '16:45', '17:30'];
const end = (t, dur) => {
  const [h, m] = t.split(':').map(Number);
  const tot = h * 60 + m + dur;
  return `${pad(Math.floor(tot / 60))}:${pad(tot % 60)}:00`;
};

const mk = (cl, s, date, status, extra = {}) => ({
  professional_id: DEMO,
  service_id: s.id,
  client_id: cl.id,
  client_name: cl.name,
  client_whatsapp: cl.whatsapp,
  client_email: cl.email,
  date: typeof date === 'string' ? date : iso(date),
  start_time: (extra.start_time || pick(times)) + ':00',
  end_time: '00:00:00',
  status,
  notes: null,
  ...extra,
});

const fix = a => {
  const s = svcList.find(x => x.id === a.service_id);
  a.end_time = end(a.start_time.slice(0, 5), s.duration_minutes);
  return a;
};

const appts = [];
let revenue = 0, i = 0;

// Agendamentos para o dia de HOJE (para a agenda de hoje estar sempre cheia!)
appts.push(fix(mk(insClients[0], svcList[0], now, 'completed', { start_time: '09:00' })));
appts.push(fix(mk(insClients[1], svcList[1], now, 'confirmed', { start_time: '11:00' })));
appts.push(fix(mk(insClients[2], svcList[2], now, 'confirmed', { start_time: '14:30' })));
appts.push(fix(mk(insClients[3], svcList[0], now, 'pending', { start_time: '16:30' })));
revenue += svcList[0].price_cents;

// Agendamentos do mês atual
while (revenue < 2150000) {
  const cl = insClients[i % insClients.length];
  const s = pick(svcList);
  appts.push(fix(mk(cl, s, dayInThisMonth(), 'completed')));
  revenue += s.price_cents;
  i++;
}

// Agendamentos de meses anteriores
for (let k = 0; k < 40; k++) {
  const s = pick(svcList);
  appts.push(fix(mk(pick(insClients), s, dayInMonth(1 + Math.floor(Math.random() * 4)), 'completed')));
}

// Agendamentos futuros confirmados
for (let k = 0; k < 15; k++) {
  const s = pick(svcList);
  appts.push(fix(mk(pick(insClients), s, addDays(1 + Math.floor(Math.random() * 18)), 'confirmed')));
}

// Agendamentos futuros pendentes
for (let k = 0; k < 12; k++) {
  const s = pick(svcList);
  appts.push(fix(mk(pick(insClients), s, addDays(1 + Math.floor(Math.random() * 14)), 'pending')));
}

// Faltas e cancelados
for (let k = 0; k < 8; k++) {
  const s = pick(svcList);
  appts.push(fix(mk(pick(insClients), s, addDays(-(2 + Math.floor(Math.random() * 40))), 'no_show')));
}
for (let k = 0; k < 5; k++) {
  const s = pick(svcList);
  appts.push(fix(mk(pick(insClients), s, addDays(-(1 + Math.floor(Math.random() * 30))), 'cancelled', { cancellation_reason: 'Imprevisto da cliente' })));
}

for (let j = 0; j < appts.length; j += 200) {
  await c.from('appointments').insert(appts.slice(j, j + 200));
}

// 7. Despesas Fixas
await c.from('fixed_expenses').insert([
  { professional_id: DEMO, name: 'Aluguel do espaço', amount_cents: 160000, active: true },
  { professional_id: DEMO, name: 'Energia, água e internet', amount_cents: 45000, active: true },
  { professional_id: DEMO, name: 'Produtos de lash e queratina', amount_cents: 85000, active: true },
  { professional_id: DEMO, name: 'Marketing / Anúncios Instagram', amount_cents: 35000, active: true },
]);

// 8. Transações do Mês Atual
const ym = iso(new Date(now.getFullYear(), now.getMonth(), 5));
await c.from('transactions').insert([
  { professional_id: DEMO, type: 'income', amount_cents: 18000, category: 'Venda de produto', description: 'Kit Home Care Pós-Lash (Sérum + Escovinha)', date: ym },
  { professional_id: DEMO, type: 'income', amount_cents: 9500, category: 'Venda de produto', description: 'Espuma de Limpeza Específica', date: ym },
  { professional_id: DEMO, type: 'expense', amount_cents: 25000, category: 'Impostos', description: 'Guia DAS / MEI', date: ym },
  { professional_id: DEMO, type: 'expense', amount_cents: 14000, category: 'Equipamentos', description: 'Pinças de Alta Precisão', date: ym },
]);

// 9. Tarefas com Vencimento Hoje e Próximos Dias
await c.from('tasks').insert([
  { professional_id: DEMO, content: 'Confirmar clientes de amanhã pelo WhatsApp', done: false, due_date: iso(now), due_time: '18:00:00' },
  { professional_id: DEMO, content: 'Repor estoque de queratina e pads descartáveis', done: false, due_date: iso(addDays(1)), due_time: '10:00:00' },
  { professional_id: DEMO, content: 'Postar resultado do Lash Lifting no Instagram', done: false, due_date: iso(addDays(2)), due_time: null },
  { professional_id: DEMO, content: 'Pagar fornecedor de insumos', done: true, due_date: null, due_time: null },
  { professional_id: DEMO, content: 'Enviar mensagem de retorno para clientes de 30 dias', done: false, due_date: null, due_time: null },
]);

// 10. Site da Amanda Costa (Template Rose Champagne)
const siteConfig = {
  identity: {
    professionalName: 'Amanda Costa',
    studioName: 'Amanda Costa Lash & Brow',
    role: 'Especialista em Lash Lifting & Sobrancelhas',
    city: 'São Paulo - SP',
    address: 'Av. Paulista, 1000 — Sala 82',
    whatsapp: '11988887777',
    instagram: 'amandacosta.lash',
    bio: 'Mais de 6 anos transformando olhares com naturalidade e saúde para os seus fios. Atendimento exclusivo e produtos de alta tecnologia.',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
    logoUrl: '',
  },
  theme: {
    preset: 'rose',
    primaryColor: '#7a2238',
    secondaryColor: '#f7ebeb',
    fontFamily: 'Playfair Display',
  },
  content: {
    hero: {
      eyebrow: 'Especialista em Lash Lifting',
      headline: 'Realce o seu olhar com naturalidade e',
      highlight: 'sofisticação duradoura',
      subheadline: 'Técnicas exclusivas de lash lifting e brow lamination que tratam e valorizam seus fios naturais.',
      ctaPrimary: 'Agendar meu horário',
      ctaSecondary: 'Ver procedimentos',
      imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
    },
    about: {
      title: 'Olá, sou a Amanda Costa',
      text: 'Apaixonada pela beleza natural do olhar. Meu propósito é valorizar seus traços com leveza, sem procedimentos pesados ou artificiais.\n\nUtilizo os melhores produtos internacionais enriquecidos com aminoácidos e queratina para fortalecer seus fios a cada aplicação.',
      imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
    },
    services: {
      title: 'Procedimentos em Destaque',
      subtitle: 'Tratamentos pensados para realçar a harmonia do seu rosto',
    },
    gallery: {
      title: 'Resultados Reais',
      subtitle: 'Acompanhe algumas transformações recentes',
      items: [
        { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80', caption: 'Lash Lifting com curvatura perfeita' },
        { url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=800&q=80', caption: 'Brow Lamination alinhada' },
        { url: 'https://images.unsplash.com/photo-1588516903720-8ceb67f9ef84?auto=format&fit=crop&w=800&q=80', caption: 'Combo Olhar Perfeito' },
      ],
    },
    beforeAfter: {
      title: 'Antes e Depois',
      subtitle: 'Veja a diferença do alinhamento e curvatura',
      items: [
        {
          title: 'Lash Lifting Natural',
          description: 'Fios alinhados, curvados e tratados com queratina.',
          beforeUrl: 'https://images.unsplash.com/photo-1583001809873-a128495da465?auto=format&fit=crop&w=600&q=80',
          afterUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
        },
      ],
    },
    testimonials: {
      title: 'O que dizem as clientes',
      items: [
        { name: 'Camila Ferreira', role: 'Cliente há 2 anos', quote: 'A Amanda é incrível! Meus cílios duram mais de 6 semanas perfeitos e super saudáveis.', rating: 5 },
        { name: 'Beatriz Lima', role: 'Cliente frequente', quote: 'Nunca mais fiz extensão depois que conheci o Lash Lifting da Amanda. O atendimento é impecável!', rating: 5 },
      ],
    },
    faq: {
      title: 'Dúvidas Frequentes',
      items: [
        { question: 'Quanto tempo dura o Lash Lifting?', answer: 'A curvatura dura em média de 6 a 8 semanas, acompanhando o ciclo natural de renovação dos seus fios.' },
        { question: 'Posso usar rímel após o procedimento?', answer: 'Sim! Após as primeiras 24 horas você pode usar maquiagem normalmente, embora a maioria das clientes nem sinta mais necessidade.' },
      ],
    },
    stats: {
      items: [
        { value: '+1.500', label: 'Olhares transformados' },
        { value: '6 anos', label: 'De experiência' },
        { value: '5.0 ★', label: 'Avaliação das clientes' },
      ],
    },
  },
  sections: {
    hero: true,
    about: true,
    services: true,
    gallery: true,
    beforeAfter: true,
    testimonials: true,
    faq: true,
    stats: true,
    location: true,
    contact: true,
  },
  seo: {
    title: 'Amanda Costa Lash & Brow — Especialista em Cílios e Sobrancelhas',
    description: 'Agende seu horário com a Amanda Costa. Lash Lifting, Brow Lamination e tratamentos para o seu olhar em São Paulo.',
    ogImageUrl: '',
  },
};

await c.from('professional_sites').insert({
  professional_id: DEMO,
  template_id: 'rose-champagne',
  config: siteConfig,
  status: 'published',
  published_at: new Date().toISOString(),
});

console.log('✅ Conta da Amanda Costa populada com sucesso!');
console.log('Clientes:', insClients.length, '| Agendamentos:', appts.length, '| Faturamento Mês Atual: R$', (revenue / 100).toFixed(2));

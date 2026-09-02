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

console.log('🧹 Limpando dados anteriores da Amanda...');
for (const t of [
  'appointments',
  'tasks',
  'transactions',
  'fixed_expenses',
  'clients',
  'services',
  'availability_rules',
  'settings',
  'professional_sites'
]) {
  await c.from(t).delete().eq('professional_id', DEMO);
}
await c.from('professionals').delete().eq('id', DEMO);

// 1. Perfil da Amanda Costa
console.log('👤 Criando perfil profissional da Amanda Costa...');
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
  public_bio: 'Realço o seu olhar com naturalidade, sofisticação e saúde para seus fios. ✨',
  status: 'active',
  onboarding_completed_at: new Date().toISOString(),
});

// 2. Configurações da Agenda
await c.from('settings').insert({
  professional_id: DEMO,
  confirmation_mode: 'manual',
  min_notice_hours: 3,
  max_days_ahead: 45,
  default_slot_interval_minutes: 45,
  default_buffer_minutes: 15,
  whatsapp_confirmation_message: 'Oi, {nome}! 💛 Seu horário de {servico} no dia {data} às {horario} foi confirmado com sucesso. Te espero!',
  whatsapp_cancel_message: 'Oi, {nome}! Seu horário de {servico} em {data} às {horario} foi cancelado. Motivo: {motivo}.',
  show_price_public: true,
  requires_deposit: true,
  deposit_instructions: 'Para garantir seu horário, envie o sinal de 50% via Pix para a chave 11988887777 e envie o comprovante. 💛',
  booking_theme: 'stars',
});

// 3. Regras de Disponibilidade (Segunda a Sexta 09:00-18:30, Sábado 09:00-14:00)
const rules = [];
for (let w = 0; w <= 6; w++) {
  rules.push({
    professional_id: DEMO,
    weekday: w,
    start_time: '09:00:00',
    end_time: w === 6 ? '14:00:00' : '18:30:00',
    break_start: w === 6 ? null : '12:00:00',
    break_end: w === 6 ? null : '13:00:00',
    slot_interval_minutes: 45,
    buffer_minutes: 15,
    is_active: w !== 0,
  });
}
await c.from('availability_rules').insert(rules);

// 4. Serviços de Lash & Brow
console.log('💅 Criando catálogo de procedimentos...');
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

// 5. Clientes Realistas
console.log('👥 Cadastrando clientes recorrentes...');
const firstNames = [
  'Maria Eduarda', 'Ana Clara', 'Juliana', 'Camila', 'Beatriz', 'Fernanda', 'Larissa', 'Patrícia',
  'Aline', 'Bruna', 'Carolina', 'Daniela', 'Eduarda', 'Gabriela', 'Helena', 'Isabela',
  'Jéssica', 'Letícia', 'Mariana', 'Natália', 'Priscila', 'Rafaela', 'Sabrina', 'Tatiane',
  'Vanessa', 'Bianca', 'Cristiane', 'Débora', 'Elaine', 'Fabiana', 'Giovana', 'Ingrid',
  'Karina', 'Lívia', 'Marcela', 'Nicole', 'Paula', 'Renata', 'Simone', 'Talita',
  'Vitória', 'Yasmin', 'Adriana', 'Carla', 'Flávia', 'Luana', 'Michele', 'Raquel',
  'Sandra', 'Thaís', 'Monique', 'Lorena', 'Clara', 'Renata', 'Mirella', 'Valéria',
  'Camila', 'Fernanda', 'Bárbara', 'Luciana', 'Thaís', 'Patrícia', 'Lívia', 'Paloma'
];

const lastNames = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Pereira', 'Almeida',
  'Ferreira', 'Rodrigues', 'Gomes', 'Martins', 'Araújo', 'Barbosa', 'Ribeiro', 'Carvalho',
  'Rocha', 'Dias', 'Nascimento', 'Andrade', 'Moreira', 'Nunes', 'Cardoso', 'Teixeira',
  'Mendes', 'Freitas', 'Ramos', 'Correia', 'Pinto', 'Cavalcanti', 'Macedo', 'Guimarães',
  'Barros', 'Miranda', 'Borges', 'Fonseca', 'Duarte', 'Castro', 'Pacheco', 'Vieira'
];

const clientsData = [];
const usedNames = new Set();
const totalClients = 80;

for (let i = 0; i < totalClients; i++) {
  let fn = firstNames[i % firstNames.length];
  let ln = lastNames[i % lastNames.length];
  let fullName = `${fn} ${ln}`;
  if (usedNames.has(fullName)) {
    fullName = `${fn} ${lastNames[(i + 5) % lastNames.length]}`;
  }
  usedNames.add(fullName);

  const bMonth = pad(1 + (i % 12));
  const bDay = pad(1 + ((i * 3) % 28));
  const bYear = 1988 + (i % 14);

  clientsData.push({
    professional_id: DEMO,
    name: fullName,
    whatsapp: `1199${pad(10 + (i % 80))}${pad(1000 + i)}`,
    email: i % 3 === 0 ? `${fn.toLowerCase().replace(/\s+/g, '.')}${i}@gmail.com` : null,
    birthday: `${bYear}-${bMonth}-${bDay}`,
    total_appointments: 0,
    last_appointment_at: null,
  });
}

const { data: insClients } = await c.from('clients').insert(clientsData).select();

// 6. Agendamentos Estruturados para o Ano Todo de 2026
console.log('📅 Gerando agendamentos realistas para 2026...');

// Slots realistas de atendimento em dias de semana
const weekdaySlots = [
  { start: '09:00', end: '10:00' },
  { start: '10:30', end: '11:30' },
  { start: '13:30', end: '14:30' },
  { start: '15:00', end: '16:00' },
  { start: '16:30', end: '17:30' },
];

// Slots de sábado (manhã)
const saturdaySlots = [
  { start: '09:00', end: '10:00' },
  { start: '10:30', end: '11:30' },
  { start: '12:00', end: '13:00' },
];

const appts = [];
const clientStats = new Map(); // id -> { count, lastDate }

const today = new Date();
const todayIso = iso(today);

// Iterar todos os dias de 2026 (01/01/2026 a 31/12/2026)
const startDate = new Date(2026, 0, 1);
const endDate = new Date(2026, 11, 31);

let clientIndex = 0;

for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
  const curIso = iso(d);
  const weekday = d.getDay(); // 0 = Dom, 6 = Sáb

  // Domingo: Folga total
  if (weekday === 0) continue;

  const isPast = curIso < todayIso;
  const isToday = curIso === todayIso;
  const isFuture = curIso > todayIso;

  // Determinar quantos slots preencher no dia
  let slotsToUse = [];

  if (isToday) {
    // HOJE: Exatamente 5 agendamentos bem organizados ao longo do dia
    // 2 concluídos de manhã, 2 confirmados de tarde, 1 pendente no final da tarde
    const todayAppointments = [
      { slot: weekdaySlots[0], svcIdx: 0, status: 'completed' }, // 09:00 - Lash Lifting
      { slot: weekdaySlots[1], svcIdx: 1, status: 'completed' }, // 10:30 - Brow Lamination
      { slot: weekdaySlots[2], svcIdx: 2, status: 'confirmed' }, // 13:30 - Combo Completo
      { slot: weekdaySlots[3], svcIdx: 3, status: 'confirmed' }, // 15:00 - Manutenção
      { slot: weekdaySlots[4], svcIdx: 0, status: 'confirmed' }, // 16:30 - Lash Lifting
    ];

    for (const item of todayAppointments) {
      const client = insClients[clientIndex % insClients.length];
      clientIndex++;
      const svc = svcList[item.svcIdx];

      appts.push({
        professional_id: DEMO,
        service_id: svc.id,
        client_id: client.id,
        client_name: client.name,
        client_whatsapp: client.whatsapp,
        client_email: client.email,
        date: curIso,
        start_time: `${item.slot.start}:00`,
        end_time: `${item.slot.end}:00`,
        status: item.status,
        notes: null,
      });

      const st = clientStats.get(client.id) || { count: 0, lastDate: curIso };
      st.count++;
      st.lastDate = curIso;
      clientStats.set(client.id, st);
    }
    continue;
  }

  if (isPast) {
    // Dias passados: 3 a 5 agendamentos por dia útil, 2 a 3 no sábado
    const availableSlots = weekday === 6 ? saturdaySlots : weekdaySlots;
    // Ocupação de 70% a 90% dos slots
    const numSlots = weekday === 6 ? (Math.random() < 0.3 ? 2 : 3) : (Math.random() < 0.4 ? 3 : Math.random() < 0.7 ? 4 : 5);
    slotsToUse = availableSlots.slice(0, numSlots);

    for (const slot of slotsToUse) {
      const client = insClients[clientIndex % insClients.length];
      clientIndex++;
      const svcIdx = (clientIndex + d.getDate()) % svcList.length;
      const svc = svcList[svcIdx];

      // 94% concluído, 4% falta, 2% cancelado
      const randStatus = Math.random();
      let status = 'completed';
      let cancelReason = null;
      if (randStatus > 0.96) {
        status = 'cancelled';
        cancelReason = 'Desmarcou por imprevisto de trabalho';
      } else if (randStatus > 0.92) {
        status = 'no_show';
      }

      appts.push({
        professional_id: DEMO,
        service_id: svc.id,
        client_id: client.id,
        client_name: client.name,
        client_whatsapp: client.whatsapp,
        client_email: client.email,
        date: curIso,
        start_time: `${slot.start}:00`,
        end_time: `${slot.end}:00`,
        status,
        cancellation_reason: cancelReason,
        notes: null,
      });

      if (status === 'completed') {
        const st = clientStats.get(client.id) || { count: 0, lastDate: curIso };
        st.count++;
        st.lastDate = curIso;
        clientStats.set(client.id, st);
      }
    }
    continue;
  }

  if (isFuture) {
    // Dias futuros:
    const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const availableSlots = weekday === 6 ? saturdaySlots : weekdaySlots;

    if (diffDays <= 7) {
      // Próximos 7 dias: agenda cheia (3 a 4 clientes por dia)
      const numSlots = weekday === 6 ? 2 : (Math.random() < 0.5 ? 3 : 4);
      slotsToUse = availableSlots.slice(0, numSlots);

      for (let sIdx = 0; sIdx < slotsToUse.length; sIdx++) {
        const slot = slotsToUse[sIdx];
        const client = insClients[clientIndex % insClients.length];
        clientIndex++;
        const svc = svcList[clientIndex % svcList.length];
        const status = sIdx === slotsToUse.length - 1 && Math.random() < 0.4 ? 'pending' : 'confirmed';

        appts.push({
          professional_id: DEMO,
          service_id: svc.id,
          client_id: client.id,
          client_name: client.name,
          client_whatsapp: client.whatsapp,
          client_email: client.email,
          date: curIso,
          start_time: `${slot.start}:00`,
          end_time: `${slot.end}:00`,
          status,
          notes: null,
        });
      }
    } else if (diffDays <= 20) {
      // 8 a 20 dias à frente: 1 a 2 clientes por dia
      if (Math.random() < 0.65) {
        const numSlots = 1 + (Math.random() < 0.4 ? 1 : 0);
        slotsToUse = availableSlots.slice(0, numSlots);

        for (const slot of slotsToUse) {
          const client = insClients[clientIndex % insClients.length];
          clientIndex++;
          const svc = svcList[clientIndex % svcList.length];

          appts.push({
            professional_id: DEMO,
            service_id: svc.id,
            client_id: client.id,
            client_name: client.name,
            client_whatsapp: client.whatsapp,
            client_email: client.email,
            date: curIso,
            start_time: `${slot.start}:00`,
            end_time: `${slot.end}:00`,
            status: Math.random() < 0.25 ? 'pending' : 'confirmed',
            notes: null,
          });
        }
      }
    } else if (diffDays <= 90) {
      // Restante do ano (Outubro a Dezembro): marcações antecipadas esparsas
      if (Math.random() < 0.25) {
        const slot = availableSlots[0];
        const client = insClients[clientIndex % insClients.length];
        clientIndex++;
        const svc = svcList[clientIndex % svcList.length];

        appts.push({
          professional_id: DEMO,
          service_id: svc.id,
          client_id: client.id,
          client_name: client.name,
          client_whatsapp: client.whatsapp,
          client_email: client.email,
          date: curIso,
          start_time: `${slot.start}:00`,
          end_time: `${slot.end}:00`,
          status: 'confirmed',
          notes: 'Agendamento antecipado de fim de ano',
        });
      }
    }
  }
}

// Inserir agendamentos em lotes
console.log(`📦 Inserindo ${appts.length} agendamentos realistas...`);
for (let j = 0; j < appts.length; j += 150) {
  await c.from('appointments').insert(appts.slice(j, j + 150));
}

// Atualizar métricas dos clientes com base nos agendamentos
console.log('🔄 Atualizando métricas dos clientes...');
for (const [clientId, stats] of clientStats.entries()) {
  await c.from('clients').update({
    total_appointments: stats.count,
    last_appointment_at: stats.lastDate,
  }).eq('id', clientId);
}

// 7. Despesas Fixas Mensais
console.log('💰 Configurando finanças anuais...');
await c.from('fixed_expenses').insert([
  { professional_id: DEMO, name: 'Aluguel do Studio (Bela Vista)', amount_cents: 160000, active: true },
  { professional_id: DEMO, name: 'Energia, Água e Condomínio', amount_cents: 42000, active: true },
  { professional_id: DEMO, name: 'Internet Fibra e Telefonia', amount_cents: 12000, active: true },
  { professional_id: DEMO, name: 'Reposição de Insumos e Queratina', amount_cents: 85000, active: true },
  { professional_id: DEMO, name: 'Marketing / Anúncios Instagram', amount_cents: 35000, active: true },
]);

// 8. Transações Financeiras (Janeiro a Dezembro de 2026)
const transactions = [];

for (let month = 0; month <= 11; month++) {
  const mStr = pad(month + 1);
  const isPastOrCurrentMonth = month <= today.getMonth();

  if (!isPastOrCurrentMonth) continue;

  // Receitas extras com venda de produtos de Home Care
  transactions.push({
    professional_id: DEMO,
    type: 'income',
    amount_cents: 18000 + (month * 1500),
    category: 'Venda de produto',
    description: 'Kits Home Care Pós-Lash (Sérum Nutritivo + Escovinhas)',
    date: `2026-${mStr}-08`,
  });

  transactions.push({
    professional_id: DEMO,
    type: 'income',
    amount_cents: 9500 + ((month % 3) * 1000),
    category: 'Venda de produto',
    description: 'Espuma de Higienização Específica para Cílios',
    date: `2026-${mStr}-18`,
  });

  // Despesas do mês
  transactions.push({
    professional_id: DEMO,
    type: 'expense',
    amount_cents: 25000,
    category: 'Impostos',
    description: 'Guia DAS / MEI Estética',
    date: `2026-${mStr}-20`,
  });

  if (month % 2 === 0) {
    transactions.push({
      professional_id: DEMO,
      type: 'expense',
      amount_cents: 14500,
      category: 'Equipamentos',
      description: 'Esterilização e Afiação de Pinças de Precisão',
      date: `2026-${mStr}-12`,
    });
  }

  if (month === 4) {
    transactions.push({
      professional_id: DEMO,
      type: 'expense',
      amount_cents: 65000,
      category: 'Cursos e Treinamentos',
      description: 'Masterclass Internacional de Brow Lamination Avançada',
      date: `2026-${mStr}-15`,
    });
  }
}

await c.from('transactions').insert(transactions);

// 9. Tarefas Diárias da Amanda
console.log('📝 Criando lista de tarefas...');
await c.from('tasks').insert([
  { professional_id: DEMO, content: 'Confirmar clientes da tarde no WhatsApp', done: false, due_date: todayIso, due_time: '13:00:00' },
  { professional_id: DEMO, content: 'Esterilizar pinças e preparar bancada para amanhã', done: false, due_date: todayIso, due_time: '18:00:00' },
  { professional_id: DEMO, content: 'Repor estoque de pads descartáveis e queratina', done: false, due_date: iso(new Date(2026, today.getMonth(), today.getDate() + 1)), due_time: '10:00:00' },
  { professional_id: DEMO, content: 'Postar resultado do Lash Lifting no Reels do Instagram', done: false, due_date: iso(new Date(2026, today.getMonth(), today.getDate() + 2)), due_time: null },
  { professional_id: DEMO, content: 'Pagar taxa de condomínio da sala', done: true, due_date: null, due_time: null },
  { professional_id: DEMO, content: 'Enviar mensagem de retorno para clientes que fizeram procedimento há 30 dias', done: false, due_date: null, due_time: null },
]);

// 10. Site Publicado da Amanda Costa
console.log('🌐 Publicando página na bio da Amanda Costa...');
const siteConfig = {
  identity: {
    professionalName: 'Amanda Costa',
    studioName: 'Amanda Costa Lash & Brow',
    role: 'Especialista em Lash Lifting & Sobrancelhas',
    city: 'São Paulo - SP',
    address: 'Av. Paulista, 1000 — Sala 82',
    whatsapp: '11988887777',
    instagram: 'amandacosta.lash',
    bio: 'Mais de 6 anos transformando olhares com naturalidade, saúde e elegância. Atendimento exclusivo e produtos de alta tecnologia.',
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

console.log('✨ Seed concluído com sucesso!');
console.log(`- Total de clientes: ${insClients.length}`);
console.log(`- Total de agendamentos no ano: ${appts.length}`);
const todayAppts = appts.filter(a => a.date === todayIso);
console.log(`- Agendamentos hoje (${todayIso}): ${todayAppts.length}`);
todayAppts.forEach(a => console.log(`  🕒 ${a.start_time.slice(0, 5)} - ${a.client_name} (${a.status})`));

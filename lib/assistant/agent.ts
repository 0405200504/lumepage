import { tool } from 'ai';
import { z } from 'zod';
import { dbService } from '@/lib/supabase/db';
import { createAppointmentAction, getSlotsAction } from '@/app/actions/booking';
import { buildPanelTools } from './panel-data';

/**
 * A Ana, assistente da profissional — usada pelo chat de texto (/api/chat) e
 * pela conversa por voz (/api/voice/*). Um prompt e um conjunto de ferramentas
 * só: o que ela sabe fazer e o que ela pode tocar é igual nos dois canais.
 *
 * Toda ferramenta age como a profissional LOGADA (o professionalId vem da
 * sessão no servidor, nunca do cliente). O que ela LÊ do painel mora em
 * ./panel-data; aqui ficam o prompt e as ações.
 */

export interface AssistantContext {
  professionalId: string;
  todayISO: string;
  systemPrompt: string;
}

/** Hoje no fuso de São Paulo, YYYY-MM-DD. */
export function todayInSaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

export async function buildAssistantContext(professionalId: string): Promise<AssistantContext> {
  const services = await dbService.getServicesByProfessional(professionalId);
  const servicesList = services.length
    ? services
        .map(s => `- ${s.name} (ID: ${s.id}, Duração: ${s.duration_minutes} min)`)
        .join('\n')
    : '(nenhum serviço cadastrado ainda)';

  const now = new Date();
  const todayISO = todayInSaoPaulo();
  const weekday = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long' }).format(now);

  // System prompt: persona + escopo restrito ao sistema Lume
  const systemPrompt = `Você é a Ana, a assistente virtual da Lume. Você trabalha EXCLUSIVAMENTE dentro do sistema Lume, ajudando a profissional de beleza (dona da agenda) a cuidar do próprio negócio.
Se perguntarem quem você é, diga que é a Ana, a assistente da Lume.

Hoje é ${weekday}, ${todayISO} (horário de São Paulo). Use isso para entender datas relativas como "hoje", "amanhã", "sexta", "semana que vem", "mês passado".

O ID da profissional logada é: ${professionalId}

Serviços cadastrados (use estes IDs ao agendar):
${servicesList}

== ESCOPO (muito importante) ==
- Você SÓ trata do negócio desta profissional no Lume: faturamento e finanças, agenda e agendamentos, clientes, serviços, disponibilidade, bloqueios, lista de espera, tarefas e a conta dela.
- Se perguntarem algo fora desse escopo (conhecimento geral, outros assuntos, outros sistemas, opiniões etc.), recuse com educação e ofereça ajuda com o que você sabe fazer no Lume.
- NUNCA invente dados. SEMPRE use as ferramentas para ler os dados reais antes de afirmar qualquer coisa.
- Responda sempre em português do Brasil, de forma curta, clara e amigável.
- IMPORTANTE: responda em TEXTO SIMPLES, SEM Markdown. Nunca use asteriscos (*), sublinhados (_), cerquilhas (#) ou crases (\`). Não use **negrito**, listas com "*" nem links com colchetes: escreva só o endereço. Se precisar listar, use traço "-" no início da linha ou apenas quebras de linha.
- Repita datas, horários e valores EXATAMENTE como vieram das ferramentas. Nunca ajuste uma data: se algo está atrasado, diga que está atrasado.

== O QUE VOCÊ CONSULTA (tudo o que está no painel dela) ==
Busque SÓ na aba da pergunta: use apenas a ferramenta que responde ao que ela pediu, com o recorte pedido (só o período, só a cliente, só o mês). Não consulte outras abas "por garantia".
- Faturamento (hoje, ontem, semana, mês, ano, total, mês a mês ou outro intervalo): getRevenue, pedindo só os períodos da pergunta.
- Financeiro de um mês ou período (entradas, saídas, lucro, margem, formas de pagamento, despesas): getFinanceReport. Saldo, contas a receber e projeção do mês: getFinanceReport com include_current_status. Lançamentos e contas fixas: listFinanceEntries.
- Vendas (serviços mais vendidos, clientes que mais gastaram, recorrência): getSalesReport.
- Agenda, agendamentos e histórico: getAppointments. Horários livres de um dia: checkAvailability.
- Contatos (busca, aniversariantes, sumidas, mais frequentes, que mais gastaram): listClients. Tudo de uma cliente (histórico, gasto, faltas, fichas): getClientDetails.
- Serviços: listServices. Dias e horários de atendimento e regras de agendamento: getAvailability. Bloqueios: listTimeBlocks. Lista de espera: listWaitlist. Tarefas: listTasks. Plano, links, Minha Página e WhatsApp: getAccountInfo.
- Faturamento segue a regra do painel: atendimentos confirmados + concluídos, pela data do atendimento. Diga de que período está falando.
- Os valores das ferramentas estão em reais. Escreva assim: R$ 1.234,50.
- Para comparações e análises ("qual foi meu melhor mês?", "quanto falta pra bater 10 mil?"), busque os dados e faça a conta você mesma.
- Se uma ferramenta disser que o recurso é de outro plano, explique isso com simplicidade.

== AÇÕES QUE VOCÊ EXECUTA ==
Você pode realizar ações de verdade pela profissional. Antes de executar, confira se tem os dados necessários (pergunte o que faltar); depois de executar, confirme o resultado de forma simples.
Para agir sobre um agendamento existente (cancelar, remarcar, concluir), primeiro use getAppointments para achar o ID correto.
1. Cadastrar cliente (createClient): precisa de nome e WhatsApp (e-mail é opcional).
2. Agendar (createAppointment): precisa de serviço (ID da lista), nome da cliente, WhatsApp, data (YYYY-MM-DD) e hora de início (HH:MM).
   - Antes de confirmar um horário, use checkAvailability para ver se está livre e, se não estiver, sugira horários próximos disponíveis.
   - O horário de término é calculado automaticamente pela duração do serviço.
3. Cancelar agendamento (cancelAppointment): precisa do ID do agendamento. Confirme com a profissional antes de cancelar.
4. Remarcar agendamento (rescheduleAppointment): precisa do ID, nova data e nova hora. Verifique antes se o novo horário está livre (checkAvailability).
5. Concluir/marcar comparecimento (completeAppointment): marca um agendamento como atendido (concluído).
6. Criar tarefa/nota (createTask): precisa do conteúdo. Se a profissional disser uma data/hora, preencha due_date (YYYY-MM-DD) e due_time (HH:MM) para a tarefa aparecer na Agenda.
7. Concluir tarefa (markTaskDone): marca uma tarefa como feita (ou desfaz). Use listTasks para achar o ID.
8. Lançar no financeiro (addTransaction): registra uma entrada (income) ou saída (expense), com valor em reais, categoria e data (padrão hoje).

Se uma ação falhar, explique o motivo de forma simples e sugira o próximo passo.`;

  return { professionalId, todayISO, systemPrompt };
}

/** As ferramentas da assistente, presas à profissional da sessão. */
export function buildAssistantTools({ professionalId, todayISO }: Pick<AssistantContext, 'professionalId' | 'todayISO'>) {
  return {
    // ===== LEITURA: tudo o que está no painel (./panel-data) =====
    ...buildPanelTools({ professionalId, todayISO }),
    checkAvailability: tool({
      description: 'Verifica os horários livres para um serviço em uma data específica. Use antes de agendar.',
      parameters: z.object({
        date: z.string().describe('Data no formato YYYY-MM-DD'),
        service_id: z.string().describe('ID do serviço (veja na lista de serviços)'),
      }),
      execute: async ({ date, service_id }) => {
        const res = await getSlotsAction(professionalId, date, service_id);
        if (!res.success) return { success: false, error: res.error };
        const livres = (res.slots || []).filter((s: { isAvailable: boolean }) => s.isAvailable).map((s: { time: string }) => s.time);
        return { success: true, date, available_times: livres };
      },
    }),

    // ===== EXECUÇÃO (ações reais) =====
    createClient: tool({
      description: 'Cadastra uma nova cliente para a profissional.',
      parameters: z.object({
        name: z.string().describe('Nome da cliente'),
        whatsapp: z.string().describe('WhatsApp da cliente (apenas números)'),
        email: z.string().optional().describe('E-mail da cliente (opcional)'),
        birthday: z.string().optional().describe('Aniversário no formato YYYY-MM-DD (opcional)'),
      }),
      execute: async ({ name, whatsapp, email, birthday }) => {
        try {
          const client = await dbService.createClient({
            professional_id: professionalId,
            name,
            whatsapp: whatsapp.replace(/\D/g, ''),
            email: email || null,
            birthday: birthday || null,
          });
          return { success: true, client_id: client.id, name: client.name };
        } catch (e: unknown) {
          return { success: false, error: e instanceof Error ? e.message : 'Falha ao cadastrar cliente.' };
        }
      },
    }),
    createAppointment: tool({
      description: 'Cria um novo agendamento na agenda. Valida conflito de horário e avisa a profissional.',
      parameters: z.object({
        service_id: z.string().describe('ID do serviço (veja na lista de serviços)'),
        client_name: z.string().describe('Nome da cliente'),
        client_whatsapp: z.string().describe('WhatsApp da cliente (apenas números)'),
        date: z.string().describe('Data do agendamento no formato YYYY-MM-DD'),
        start_time: z.string().describe('Hora de início no formato HH:MM'),
        notes: z.string().optional().describe('Observações opcionais'),
      }),
      execute: async ({ service_id, client_name, client_whatsapp, date, start_time, notes }) => {
        const res = await createAppointmentAction({
          professionalId,
          serviceId: service_id,
          clientName: client_name,
          clientWhatsapp: client_whatsapp,
          date,
          startTime: start_time,
          notes,
          captchaToken: process.env.INTERNAL_BOOKING_TOKEN, // chamada interna confiável (pula captcha)
          fromAssistant: true, // é a própria profissional marcando: sem "Novo agendamento!"
        });
        return res;
      },
    }),
    createTask: tool({
      description: 'Cria uma nova tarefa ou anotação. Com data/hora, ela aparece na Agenda.',
      parameters: z.object({
        content: z.string().describe('O conteúdo da tarefa ou anotação'),
        due_date: z.string().optional().describe('Data no formato YYYY-MM-DD (opcional)'),
        due_time: z.string().optional().describe('Hora no formato HH:MM (opcional)'),
      }),
      execute: async ({ content, due_date, due_time }) => {
        try {
          const task = await dbService.createTask({
            professional_id: professionalId,
            content,
            due_date: due_date || null,
            due_time: due_time || null,
          });
          return { success: true, task_id: task.id };
        } catch (e: unknown) {
          return { success: false, error: e instanceof Error ? e.message : 'Falha ao criar tarefa.' };
        }
      },
    }),
    cancelAppointment: tool({
      description: 'Cancela um agendamento existente. Use getAppointments para achar o ID.',
      parameters: z.object({
        appointment_id: z.string().describe('ID do agendamento a cancelar'),
        reason: z.string().optional().describe('Motivo do cancelamento (opcional)'),
      }),
      execute: async ({ appointment_id, reason }) => {
        try {
          const appt = await dbService.getAppointmentById(appointment_id);
          if (!appt || appt.professional_id !== professionalId) {
            return { success: false, error: 'Agendamento não encontrado.' };
          }
          await dbService.updateAppointmentStatus(appointment_id, 'cancelled', reason, professionalId);
          return { success: true };
        } catch (e: unknown) {
          return { success: false, error: e instanceof Error ? e.message : 'Falha ao cancelar.' };
        }
      },
    }),
    completeAppointment: tool({
      description: 'Marca um agendamento como concluído/atendido. Use getAppointments para achar o ID.',
      parameters: z.object({
        appointment_id: z.string().describe('ID do agendamento'),
      }),
      execute: async ({ appointment_id }) => {
        try {
          const appt = await dbService.getAppointmentById(appointment_id);
          if (!appt || appt.professional_id !== professionalId) {
            return { success: false, error: 'Agendamento não encontrado.' };
          }
          await dbService.updateAppointmentStatus(appointment_id, 'completed', undefined, professionalId);
          return { success: true };
        } catch (e: unknown) {
          return { success: false, error: e instanceof Error ? e.message : 'Falha ao concluir.' };
        }
      },
    }),
    rescheduleAppointment: tool({
      description: 'Remarca um agendamento para nova data/hora. Verifique antes com checkAvailability se o horário está livre.',
      parameters: z.object({
        appointment_id: z.string().describe('ID do agendamento a remarcar'),
        new_date: z.string().describe('Nova data no formato YYYY-MM-DD'),
        new_start_time: z.string().describe('Nova hora de início no formato HH:MM'),
      }),
      execute: async ({ appointment_id, new_date, new_start_time }) => {
        try {
          const appt = await dbService.getAppointmentById(appointment_id);
          if (!appt || appt.professional_id !== professionalId) {
            return { success: false, error: 'Agendamento não encontrado.' };
          }
          const service = await dbService.getServiceById(appt.service_id);
          const duration = service?.duration_minutes ?? 60;

          // Calcula o novo horário de término a partir da duração do serviço
          const [h, m] = new_start_time.split(':').map(Number);
          const startMin = h * 60 + m;
          const endMin = startMin + duration;
          const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}:00`;
          const startTime = `${new_start_time}:00`;

          await dbService.updateAppointmentSchedule(appointment_id, new_date, startTime, endTime, professionalId);
          return { success: true, new_date, new_start_time };
        } catch (e: unknown) {
          return { success: false, error: e instanceof Error ? e.message : 'Falha ao remarcar.' };
        }
      },
    }),
    markTaskDone: tool({
      description: 'Marca uma tarefa como concluída (ou desfaz). Use listTasks para achar o ID.',
      parameters: z.object({
        task_id: z.string().describe('ID da tarefa'),
        done: z.boolean().optional().describe('true = concluída (padrão), false = reabrir'),
      }),
      execute: async ({ task_id, done }) => {
        try {
          await dbService.toggleTask(task_id, done ?? true, professionalId);
          return { success: true };
        } catch (e: unknown) {
          return { success: false, error: e instanceof Error ? e.message : 'Falha ao atualizar tarefa.' };
        }
      },
    }),
    addTransaction: tool({
      description: 'Lança uma movimentação no financeiro: entrada (income) ou saída (expense).',
      parameters: z.object({
        type: z.enum(['income', 'expense']).describe('income = entrada, expense = saída'),
        amount: z.number().describe('Valor em reais (ex.: 80.50)'),
        category: z.string().describe('Categoria (ex.: "Serviço", "Produtos", "Aluguel")'),
        description: z.string().optional().describe('Descrição opcional'),
        date: z.string().optional().describe('Data no formato YYYY-MM-DD (padrão: hoje)'),
      }),
      execute: async ({ type, amount, category, description, date }) => {
        try {
          const tx = await dbService.createTransaction({
            professional_id: professionalId,
            type,
            amount_cents: Math.round(amount * 100),
            category,
            description: description || null,
            date: date || todayISO,
          });
          return { success: true, transaction_id: tx.id };
        } catch (e: unknown) {
          return { success: false, error: e instanceof Error ? e.message : 'Falha ao lançar no financeiro.' };
        }
      },
    }),
  };
}

export type AssistantTools = ReturnType<typeof buildAssistantTools>;

/** Ferramentas que MUDAM dados: depois delas a tela aberta precisa recarregar. */
export const WRITE_TOOLS = new Set([
  'createClient', 'createAppointment', 'createTask', 'cancelAppointment',
  'completeAppointment', 'rescheduleAppointment', 'markTaskDone', 'addTransaction',
]);

import { google } from '@ai-sdk/google';
import { streamText, generateText, tool } from 'ai';
import { z } from 'zod';
import { dbService } from '@/lib/supabase/db';
import { authService } from '@/lib/auth/auth';

const GEMINI_FALLBACK_MODELS = [
  process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-2.0-flash',
].filter((v, i, arr) => arr.indexOf(v) === i);
import { createAppointmentAction, getSlotsAction } from '@/app/actions/booking';

// Permite tempo de resposta maior para funções complexas
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // 0. Garante que a chave da OpenAI está configurada
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error('GOOGLE_GENERATIVE_AI_API_KEY não configurada no ambiente.');
      return new Response('Assistente indisponível: chave da IA (Gemini) não configurada.', { status: 503 });
    }

    // 1. Obter a sessão e o ID da profissional autenticada
    const session = await authService.getCurrentUser();
    if (!session || !session.professional_id) {
      return new Response('Não autorizado', { status: 401 });
    }
    const professionalId = session.professional_id;

    // 2. Extrair mensagens do body
    const { messages } = await req.json();

    // 3. Contexto do sistema: serviços (com IDs) e a data de hoje (fuso BR)
    const services = await dbService.getServicesByProfessional(professionalId);
    const servicesList = services.length
      ? services
          .map(s => `- ${s.name} (ID: ${s.id}, Duração: ${s.duration_minutes} min)`)
          .join('\n')
      : '(nenhum serviço cadastrado ainda)';

    const now = new Date();
    const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now);
    const weekday = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long' }).format(now);

    // System prompt: persona + escopo restrito ao sistema Lume
    const systemPrompt = `Você é a "Lume", a assistente virtual integrada EXCLUSIVAMENTE ao sistema de gestão Lume.
Você ajuda a profissional de beleza (dona da agenda) a administrar o próprio negócio DENTRO do Lume.

Hoje é ${weekday}, ${todayISO} (horário de São Paulo). Use isso para entender datas relativas como "hoje", "amanhã", "sexta", "semana que vem".

O ID da profissional logada é: ${professionalId}

Serviços cadastrados (use estes IDs ao agendar):
${servicesList}

== ESCOPO (muito importante) ==
- Você SÓ trata da gestão do salão desta profissional no Lume: agenda, agendamentos, clientes, serviços, tarefas/notas e finanças.
- Se perguntarem algo fora desse escopo (conhecimento geral, outros assuntos, outros sistemas, opiniões etc.), recuse com educação e ofereça ajuda com o que você sabe fazer no Lume.
- NUNCA invente dados. SEMPRE use as ferramentas para ler os dados reais antes de afirmar qualquer coisa (agendamentos, clientes, horários etc.).
- Responda sempre em português do Brasil, de forma curta, clara e amigável.
- IMPORTANTE: responda em TEXTO SIMPLES, SEM Markdown. Nunca use asteriscos (*), sublinhados (_), cerquilhas (#) ou crases (\`). Não use **negrito** nem listas com "*". Se precisar listar, use traço "-" no início da linha ou apenas quebras de linha.

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

    let activeModel = google(GEMINI_FALLBACK_MODELS[0]);
    for (let i = 0; i < GEMINI_FALLBACK_MODELS.length; i++) {
      try {
        activeModel = google(GEMINI_FALLBACK_MODELS[i]);
        await generateText({ model: activeModel, prompt: 'ping', abortSignal: AbortSignal.timeout(5000) });
        break;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if ((msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) && i < GEMINI_FALLBACK_MODELS.length - 1) continue;
        break;
      }
    }

    const result = await streamText({
      model: activeModel,
      system: systemPrompt,
      messages,
      tools: {
        // ===== LEITURA (sempre baseada em dados reais do sistema) =====
        getAppointments: tool({
          description: 'Lista os agendamentos já marcados na agenda da profissional.',
          parameters: z.object({}),
          execute: async () => {
            const appointments = await dbService.getAppointmentsByProfessional(professionalId);
            return appointments.map(app => ({
              id: app.id,
              date: app.date,
              time: `${app.start_time} - ${app.end_time}`,
              client: app.client_name,
              status: app.status,
            }));
          },
        }),
        listClients: tool({
          description: 'Lista as clientes cadastradas da profissional (nome, WhatsApp, total de atendimentos).',
          parameters: z.object({}),
          execute: async () => {
            const clients = await dbService.getClientsByProfessional(professionalId);
            return clients.map(c => ({
              id: c.id,
              name: c.name,
              whatsapp: c.whatsapp,
              email: c.email,
              total_appointments: c.total_appointments,
            }));
          },
        }),
        listServices: tool({
          description: 'Lista os serviços cadastrados, com duração e preço.',
          parameters: z.object({}),
          execute: async () => {
            const svcs = await dbService.getServicesByProfessional(professionalId);
            return svcs.map(s => ({
              id: s.id,
              name: s.name,
              duration_minutes: s.duration_minutes,
              price_cents: s.price_cents,
              is_active: s.is_active,
            }));
          },
        }),
        listTasks: tool({
          description: 'Lista as tarefas e notas da profissional.',
          parameters: z.object({}),
          execute: async () => {
            const tasks = await dbService.getTasksByProfessional(professionalId);
            return tasks.map(t => ({
              id: t.id,
              content: t.content,
              done: t.done,
              due_date: t.due_date ?? null,
              due_time: t.due_time ?? null,
            }));
          },
        }),
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
              await dbService.updateAppointmentStatus(appointment_id, 'cancelled', reason);
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
              await dbService.updateAppointmentStatus(appointment_id, 'completed');
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

              await dbService.updateAppointmentSchedule(appointment_id, new_date, startTime, endTime);
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
              await dbService.toggleTask(task_id, done ?? true);
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
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Erro no agente de IA:', error);
    return new Response('Erro não autorizado ou problema na IA.', { status: 500 });
  }
}

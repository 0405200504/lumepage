import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { dbService } from '@/lib/supabase/db';
import { authService } from '@/lib/auth/auth';

// Permite tempo de resposta maior para funções complexas
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // 0. Garante que a chave do Gemini está configurada
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

    // 3. Buscar contexto para passar para o agente
    // Pega serviços para que a IA possa saber os IDs dos serviços para agendamento
    const services = await dbService.getServicesByProfessional(professionalId);
    const servicesList = services.map(s => `- ${s.name} (ID: ${s.id}, Duração: ${s.duration_minutes} min)`).join('\n');

    // System prompt define o comportamento do agente
    const systemPrompt = `Você é um assistente virtual super inteligente integrado ao sistema de agenda 'Lume'.
Seu objetivo é ajudar a profissional de beleza (dona da agenda) a gerenciar seu salão.
Você pode visualizar a agenda, marcar clientes, criar tarefas e responder dúvidas de forma concisa e amigável.
O ID da profissional logada é: ${professionalId}

Aqui está a lista de serviços cadastrados que ela oferece (com seus respectivos IDs):
${servicesList}

Regras importantes:
1. Sempre use as ferramentas disponíveis para buscar informações antes de afirmar que algo não existe.
2. Para agendar, você PRECISARÁ de: Nome da cliente, WhatsApp, Data (YYYY-MM-DD), Hora de Início (HH:MM) e o ID do serviço. Calcule o horário de término baseado na duração do serviço.
3. Ao usar ferramentas, confirme para o usuário que a ação foi realizada de forma amigável.
`;

    const result = await streamText({
      model: google(process.env.GEMINI_MODEL || 'gemini-2.5-flash'),
      system: systemPrompt,
      messages,
      tools: {
        getAppointments: tool({
          description: 'Busca os agendamentos já marcados na agenda da profissional.',
          parameters: z.object({}),
          // @ts-ignore: Tipagem da lib 'ai' falha com parâmetros vazios
          execute: async (args) => {
            const appointments = await dbService.getAppointmentsByProfessional(professionalId);
            return appointments.map(app => ({
              id: app.id,
              date: app.date,
              time: `${app.start_time} - ${app.end_time}`,
              client: app.client_name,
              status: app.status
            }));
          },
        }),
        createAppointment: tool({
          description: 'Cria um novo agendamento na agenda da profissional.',
          parameters: z.object({
            service_id: z.string().describe('ID do serviço que será realizado (veja na lista de serviços)'),
            client_name: z.string().describe('Nome da cliente'),
            client_whatsapp: z.string().describe('WhatsApp da cliente (Apenas números)'),
            date: z.string().describe('Data do agendamento no formato YYYY-MM-DD'),
            start_time: z.string().describe('Hora de início no formato HH:MM'),
            end_time: z.string().describe('Hora de término no formato HH:MM'),
            notes: z.string().optional().describe('Observações opcionais')
          }),
          execute: async (args) => {
            const appointment = await dbService.createAppointment({
              professional_id: professionalId,
              service_id: args.service_id,
              client_id: null, // A função no BD cria o cliente ou busca pelo whatsapp
              client_name: args.client_name,
              client_whatsapp: args.client_whatsapp,
              client_email: null,
              date: args.date,
              start_time: args.start_time,
              end_time: args.end_time,
              notes: args.notes || null,
            } as any);
            return { success: true, appointment_id: appointment.id };
          },
        }),
        createTask: tool({
          description: 'Cria uma nova tarefa ou anotação para a profissional.',
          parameters: z.object({
            content: z.string().describe('O conteúdo da tarefa ou anotação')
          }),
          execute: async ({ content }) => {
            const task = await dbService.createTask({
              professional_id: professionalId,
              content
            });
            return { success: true, task_id: task.id };
          },
        })
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Erro no agente de IA:', error);
    return new Response('Erro não autorizado ou problema na IA.', { status: 500 });
  }
}

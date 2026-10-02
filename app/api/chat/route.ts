import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { authService } from '@/lib/auth/auth';
import { buildAssistantContext, buildAssistantTools } from '@/lib/assistant/agent';
import { BudgetUnavailable, BUDGET_REACHED_MSG, addAiCost, chatCostMicros, remainingMicros } from '@/lib/assistant/budget';
import { accessBlockForProfessional } from '@/lib/subscription/access';
import { ACCESS_BLOCK_MESSAGE } from '@/lib/subscription/access-rules';

// Permite tempo de resposta maior para funções complexas
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // 0. Garante que a chave da OpenAI está configurada
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY não configurada no ambiente.');
      return new Response('A Ana está indisponível: chave da IA não configurada.', { status: 503 });
    }

    // 1. Obter a sessão e o ID da profissional autenticada
    const session = await authService.getCurrentUser();
    if (!session || !session.professional_id) {
      return new Response('Não autorizado', { status: 401 });
    }
    const professionalId = session.professional_id;

    // 1b. Conta vencida/pausada não gasta IA — mesma regra do painel e das actions.
    const block = await accessBlockForProfessional(professionalId);
    if (block) return new Response(ACCESS_BLOCK_MESSAGE[block], { status: 402 });

    // 2. Teto de IA do mês (migração v43). Sem a migração o chat segue sem
    //    contar: custa frações de centavo por mensagem. A voz, essa sim, fica
    //    desligada sem o teto.
    let metered = true;
    try {
      if ((await remainingMicros(professionalId)) <= 0) {
        return new Response(BUDGET_REACHED_MSG, { status: 402 });
      }
    } catch (e) {
      if (!(e instanceof BudgetUnavailable)) throw e;
      metered = false;
    }

    // 3. Extrair mensagens do body
    const { messages } = await req.json();

    // 4. Prompt e ferramentas compartilhados com a conversa por voz
    const ctx = await buildAssistantContext(professionalId);
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const result = await streamText({
      model: openai(model),
      system: ctx.systemPrompt,
      messages,
      maxSteps: 5,
      tools: buildAssistantTools(ctx),
      // Soma no mês o custo real (todos os passos, inclusive os de ferramenta).
      onFinish: async ({ usage }) => {
        if (metered) await addAiCost(professionalId, chatCostMicros(model, usage)).catch(() => {});
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Erro no agente de IA:', error);
    return new Response('Erro não autorizado ou problema na IA.', { status: 500 });
  }
}

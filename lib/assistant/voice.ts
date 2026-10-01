import { zodToJsonSchema } from 'zod-to-json-schema';
import type { AssistantTools } from './agent';
import { SCREENS } from './screens';

/**
 * Configuração da conversa por VOZ (OpenAI Realtime, via WebRTC).
 *
 * O áudio vai direto do navegador para a OpenAI; o servidor só faz duas
 * coisas: cria a chave temporária da sessão (/api/voice/session) e executa
 * as ferramentas que a voz pedir (/api/voice/tool), sempre como a
 * profissional logada.
 */

/** Modelo de voz. O mini custa cerca de 1/3 do completo no áudio; troque por
 *  `gpt-realtime-2.1` na variável se quiser mais qualidade de raciocínio. */
export const VOICE_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1-mini';
export const VOICE_NAME = process.env.OPENAI_REALTIME_VOICE || 'marin';

/** A única ferramenta que roda no navegador: navegar. */
const OPEN_SCREEN_TOOL = {
  type: 'function' as const,
  name: 'openScreen',
  description:
    'Abre uma tela do Lume no aparelho da profissional. Use quando ela pedir para ver/abrir algo, ou quando ela concordar com a sua sugestão de abrir ("pode abrir", "abre aí").',
  parameters: {
    type: 'object',
    properties: {
      screen: { type: 'string', enum: Object.keys(SCREENS), description: 'Qual tela abrir.' },
      date: { type: 'string', description: 'Só para a agenda: o dia a mostrar, no formato YYYY-MM-DD (opcional).' },
    },
    required: ['screen'],
  },
};

/** As ferramentas do servidor no formato da Realtime API (JSON Schema). */
export function realtimeTools(tools: AssistantTools) {
  const server = Object.entries(tools).map(([name, t]) => {
    const schema = zodToJsonSchema(t.parameters, { target: 'jsonSchema7', $refStrategy: 'none' }) as Record<string, unknown>;
    delete schema.$schema;
    return { type: 'function' as const, name, description: t.description ?? '', parameters: schema };
  });
  return [...server, OPEN_SCREEN_TOOL];
}

/** O jeito de falar — vai DEPOIS do prompt do chat de texto. */
export function voiceInstructions(basePrompt: string, firstName: string) {
  return `${basePrompt}

== CONVERSA POR VOZ (vale acima das regras de texto) ==
Agora você está conversando por VOZ, ao vivo, como uma assistente pessoal. A profissional se chama ${firstName}.
- Fale em português do Brasil, natural e calorosa, em frases curtas: no máximo 2 ou 3 frases por vez.
- Nada de listas, símbolos ou leitura de IDs. Diga datas, horários e valores como uma pessoa diria ("amanhã às três da tarde", "cento e trinta reais").
- Antes de usar uma ferramenta, diga uma frase bem curta, tipo "Já olho pra você" ou "Um segundinho".
- Antes de AÇÕES que mudam dados (agendar, cancelar, remarcar, lançar valor, cadastrar), repita o essencial em uma frase e espere ela confirmar.
- Quando ajudar ver algo na tela, ofereça abrir ("Quer que eu abra a agenda de amanhã?"). Se ela concordar, use openScreen.
- Se não entendeu o que ela disse, peça para repetir, sem adivinhar.
- Se ela se despedir, despeça-se em uma frase.`;
}

/** A sessão de voz completa (vai junto com a oferta SDP para a OpenAI). */
export function voiceSessionConfig(opts: { instructions: string; tools: ReturnType<typeof realtimeTools> }) {
  return {
    type: 'realtime',
    model: VOICE_MODEL,
    instructions: opts.instructions,
    tools: opts.tools,
    tool_choice: 'auto',
    // Respostas curtas (~40 s de fala no máximo) e memória enxuta: a cada
    // resposta a conversa inteira é relida e cobrada; acima de 8 mil tokens
    // o começo é esquecido em blocos (20%), o que preserva o cache barato.
    max_output_tokens: 800,
    truncation: { type: 'retention_ratio', retention_ratio: 0.8, token_limits: { post_instructions: 8000 } },
    audio: {
      input: {
        transcription: { model: 'gpt-4o-mini-transcribe', language: 'pt' },
        // Detecção por SENTIDO: espera ela terminar a frase, não só uma pausa.
        turn_detection: { type: 'semantic_vad', eagerness: 'medium' },
        noise_reduction: { type: 'near_field' },
      },
      output: { voice: VOICE_NAME },
    },
  };
}

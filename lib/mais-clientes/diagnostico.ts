/**
 * Diagnóstico do Instagram e do Google a partir dos prints que a profissional
 * manda. Funciona hoje, sem depender da aprovação das APIs da Meta e do Google:
 * a IA de visão olha o print e avalia cada item da lista fixa (tutoriais.ts).
 *
 * A nota NÃO vem da IA: sai de notaDosItens (regras.ts), a partir do status de
 * cada item. Assim "10/10" significa a mesma coisa para todo mundo.
 */

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { itensDe } from './tutoriais';
import { notaDosItens } from './regras';
import type { DiagPlataforma } from '@/types/mais-clientes';

export const MODELO_DIAGNOSTICO = 'gpt-4o';

export interface ContextoNegocio {
  nome: string;
  cidade: string;
  servicos: string[];
  diferenciais: string;
  linkAgendamento: string;
  whatsapp: string;
}

export class DiagnosticoIndisponivel extends Error {}

export async function diagnosticar(
  plataforma: 'instagram' | 'google',
  prints: { bytes: Uint8Array; mime: string }[],
  ctx: ContextoNegocio,
): Promise<DiagPlataforma & { custoTokens: { promptTokens: number; completionTokens: number } }> {
  if (!process.env.OPENAI_API_KEY) throw new DiagnosticoIndisponivel('O diagnóstico com IA está desligado neste ambiente (falta OPENAI_API_KEY).');
  if (!prints.length) throw new DiagnosticoIndisponivel('Envie pelo menos um print do perfil.');

  const itens = itensDe(plataforma);
  const ids = itens.map(i => i.id) as [string, ...string[]];
  const schema = z.object({
    perfil_valido: z.boolean().describe(plataforma === 'instagram'
      ? 'true se os prints mostram a página de perfil do Instagram (foto, nome, bio, números de seguidores).'
      : 'true se os prints mostram o Perfil da Empresa no Google (ficha no Google Maps ou na busca).'),
    resumo: z.string().describe('Duas frases para a profissional: o que está bom e o que mais vai fazer diferença ajustar.'),
    itens: z.array(z.object({
      id: z.enum(ids),
      status: z.enum(['ok', 'ajustar', 'falta', 'nao_visto']),
      o_que_vimos: z.string().describe('O que aparece no print sobre este item, em uma frase concreta.'),
      sugestao: z.string().describe('O que colocar no lugar. Para nome, bio e descrição: o texto pronto para copiar. Para os outros: a ação em uma frase. Vazio se status = ok.'),
    })),
  });

  const nomePlataforma = plataforma === 'instagram' ? 'Instagram' : 'Perfil da Empresa no Google';
  const criterios = itens.map(i => `- ${i.id} (${i.titulo}): ${i.criterio}`).join('\n');
  const limites = plataforma === 'instagram'
    ? 'Nome: até 64 caracteres, no formato "Nome | Serviço Cidade". Bio: até 150 caracteres, com serviço, cidade, uma prova (atendimentos, anos) e chamada para agendar.'
    : 'Descrição: até 750 caracteres, citando serviços, cidade e diferencial, sem link e sem promoção (o Google não permite).';

  const { object, usage } = await generateObject({
    model: openai(MODELO_DIAGNOSTICO),
    schema,
    temperature: 0.2,
    system: `Você é especialista em perfil de negócio local de beleza e estética no Brasil. Avalie o ${nomePlataforma} de uma profissional a partir dos prints.
Regras:
- Avalie TODOS os itens da lista, um objeto por id, na mesma ordem.
- "ok": está bom de verdade. "ajustar": existe mas pode melhorar. "falta": não existe. "nao_visto": o print não mostra esse item (não chute).
- Seja concreto e honesto. Não elogie à toa: o objetivo é ela ganhar mais clientes.
- Escreva em português do Brasil, frases curtas, falando com ela ("você").
- Nunca invente dado (número de atendimentos, prêmios, anos de experiência) que não esteja nos prints ou no contexto.
- ${limites}

Itens e critérios:
${criterios}`,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Contexto do negócio (vem do sistema da profissional):
Nome: ${ctx.nome}
Cidade: ${ctx.cidade || 'não informada'}
Serviços em foco: ${ctx.servicos.join(', ') || 'não informados'}
Diferenciais que ela contou: ${ctx.diferenciais || 'não informou'}
Link de agendamento dela: ${ctx.linkAgendamento || 'não tem'}
WhatsApp: ${ctx.whatsapp || 'não informado'}

Seguem ${prints.length} print(s) do ${nomePlataforma}.`,
        },
        ...prints.map(p => ({ type: 'image' as const, image: p.bytes, mimeType: p.mime })),
      ],
    }],
  });

  // Garante um item por id da lista fixa, na ordem da lista, mesmo se a IA pular algum.
  const porId = new Map(object.itens.map(i => [i.id, i]));
  const completos = itens.map(i => {
    const r = porId.get(i.id);
    return {
      id: i.id,
      titulo: i.titulo,
      status: r?.status ?? 'nao_visto',
      o_que_vimos: r?.o_que_vimos ?? 'Não deu para ver no print.',
      sugestao: r?.status === 'ok' ? '' : (r?.sugestao ?? ''),
      feito: false,
    };
  });
  const { nota } = notaDosItens(completos);

  return {
    nota: object.perfil_valido ? nota : 0,
    resumo: object.resumo,
    itens: completos,
    gerado_em: new Date().toISOString(),
    perfil_valido: object.perfil_valido,
    custoTokens: { promptTokens: usage.promptTokens, completionTokens: usage.completionTokens },
  };
}

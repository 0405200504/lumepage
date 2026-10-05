/**
 * Diagnóstico do Instagram e do Google a partir dos prints que a profissional
 * manda. Funciona hoje, sem depender da aprovação das APIs da Meta e do Google:
 * a IA de visão olha o print e avalia cada item da lista fixa (tutoriais.ts).
 *
 * Calibração (out/2026, perfil da Júlia Roberta, bem estruturado): a primeira
 * versão dava 7/10 porque (1) marcava como problema o que não aparecia no
 * print, (2) implicava com item que já estava bom e (3) mandava trocar o link
 * dela pelo do Lume. Agora:
 *   - a IA transcreve o que vê ANTES de julgar, e cada item cita a evidência;
 *     sem evidência no print, o código força "nao_visto" (não tira nota);
 *   - o padrão é "ok"; melhoria opcional é "dica" e não tira nota;
 *   - "ajustar"/"falta" só com problema concreto que custa cliente.
 *
 * A nota NÃO vem da IA: sai de notaDosItens (regras.ts).
 */

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { itensDe } from './tutoriais';
import { notaDosItens } from './regras';
import type { DiagPlataforma, ItemStatus } from '@/types/mais-clientes';

export const MODELO_DIAGNOSTICO = process.env.DIAGNOSTICO_MODELO || 'gpt-4.1';

export interface ContextoNegocio {
  nome: string;
  cidade: string;
  servicos: string[];
  diferenciais: string;
  linkAgendamento: string;
  whatsapp: string;
}

export class DiagnosticoIndisponivel extends Error {}

/** Evidência que, na prática, diz "não apareceu no print". */
const SEM_EVIDENCIA = /^\s*$|n[ãa]o (aparece|est[áa] vis[íi]vel|vis[íi]vel|mostra|d[áa] para ver)|n[ãa]o h[áa] .*(no|nos) print/i;

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
    transcricao: z.string().describe('Primeiro passo: transcreva tudo o que dá para ler nos prints (nome, textos, botões, nomes dos destaques, categoria, nota, número de avaliações, endereço, horário, site, telefone, seções visíveis). Só o que aparece.'),
    itens: z.array(z.object({
      id: z.enum(ids),
      evidencia: z.string().describe('Trecho da transcrição que embasa a avaliação, como aparece no print. Vazio se o item não aparece em nenhum print.'),
      status: z.enum(['ok', 'dica', 'ajustar', 'falta', 'nao_visto']),
      o_que_vimos: z.string().describe('Uma frase concreta sobre o que aparece. Se está bom, diga o que está bom.'),
      sugestao: z.string().describe('Só para dica, ajustar e falta: o que fazer. Para nome, bio e descrição, o texto pronto, preservando o que ela já tem de bom. Vazio para ok e nao_visto.'),
    })),
    resumo: z.string().describe('Duas frases para a profissional, começando pelo que está bom. Se está tudo certo, diga isso com todas as letras.'),
  });

  const nomePlataforma = plataforma === 'instagram' ? 'Instagram' : 'Perfil da Empresa no Google';
  const criterios = itens.map(i => `- ${i.id} (${i.titulo}): ${i.criterio} [aparece em: ${i.ondeVer}]`).join('\n');

  const { object, usage } = await generateObject({
    model: openai(MODELO_DIAGNOSTICO),
    schema,
    temperature: 0,
    system: `Você avalia o ${nomePlataforma} de uma profissional de beleza no Brasil a partir de prints, para a assessoria da Lume que vai trazer clientes pelos anúncios.

Como avaliar:
1. Transcreva o que dá para ler nos prints.
2. Para cada item da lista, copie a evidência da transcrição e só então escolha o status.
3. O padrão é "ok". Use "ok" sempre que o item atende o critério, mesmo que você conseguisse escrever de outro jeito.
4. "dica": está bom, mas existe uma melhoria opcional que pode trazer mais cliente. Não tira nota. Use com parcimônia.
5. "ajustar": existe, mas tem um problema concreto que faz perder cliente (descreva o problema).
6. "falta": o item claramente não existe no perfil, e o print mostra a parte onde ele estaria.
7. "nao_visto": o print não mostra a parte do perfil onde o item fica. Nunca marque "ajustar" ou "falta" para algo que não aparece no print.

Não faça:
- Não sugira trocar o que já está bom só para padronizar (nome, bio, link, capas).
- Não mande trocar um link que já leva para site, agendamento ou WhatsApp dela.
- Não apague da sugestão informação boa que ela já tem (serviços, cidade, provas, público de alunas).
- Não invente dado que não esteja nos prints ou no contexto.
Um perfil bem estruturado deve sair com 10/10: isso é esperado e é uma boa notícia para ela.

Escreva em português do Brasil, frases curtas, falando com ela ("você"). Nome: até 64 caracteres. Bio: até 150 caracteres. Descrição do Google: até 750 caracteres, sem link e sem promoção.

Itens e critérios:
${criterios}`,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Contexto (vem do cadastro dela no Lume):
Nome: ${ctx.nome}
Cidade: ${ctx.cidade || 'não informada'}
Serviços em foco: ${ctx.servicos.join(', ') || 'não informados'}
Diferenciais que ela contou: ${ctx.diferenciais || 'não informou'}
Página de agendamento do Lume (sugira só se ela não tiver link nenhum): ${ctx.linkAgendamento || 'não tem'}
WhatsApp: ${ctx.whatsapp || 'não informado'}

Seguem ${prints.length} print(s) do ${nomePlataforma}.`,
        },
        ...prints.map(p => ({ type: 'image' as const, image: p.bytes, mimeType: p.mime })),
      ],
    }],
  });

  // Um item por id da lista fixa, na ordem da lista. Sem evidência no print,
  // "ajustar"/"falta" viram "nao_visto": o perfil não perde ponto pelo que não apareceu.
  const porId = new Map(object.itens.map(i => [i.id, i]));
  const completos = itens.map(i => {
    const r = porId.get(i.id);
    let status: ItemStatus = r?.status ?? 'nao_visto';
    const semEvidencia = !r || SEM_EVIDENCIA.test(r.evidencia);
    if (semEvidencia && (status === 'ajustar' || status === 'falta')) status = 'nao_visto';
    return {
      id: i.id,
      titulo: i.titulo,
      status,
      evidencia: r?.evidencia ?? '',
      o_que_vimos: status === 'nao_visto' ? `Não apareceu nos prints. Fica em: ${i.ondeVer.charAt(0).toLowerCase()}${i.ondeVer.slice(1)}` : (r?.o_que_vimos ?? ''),
      sugestao: status === 'ok' || status === 'nao_visto' ? '' : (r?.sugestao ?? ''),
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

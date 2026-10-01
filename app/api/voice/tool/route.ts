import { authService } from '@/lib/auth/auth';
import { rateLimit } from '@/lib/rate-limit';
import { buildAssistantTools, todayInSaoPaulo, WRITE_TOOLS } from '@/lib/assistant/agent';

// Algumas ferramentas leem a agenda inteira; o mesmo teto do chat de texto.
export const maxDuration = 30;

/**
 * Executa UMA ferramenta pedida pela conversa por voz.
 *
 * Quem decide QUAL ferramenta é o modelo de voz; quem decide SOBRE QUEM ela
 * age é a sessão do cookie — o professionalId nunca vem do corpo da
 * requisição. Os argumentos passam pelo mesmo schema (zod) do chat de texto.
 */
export async function POST(req: Request) {
  const session = await authService.getCurrentUser();
  if (!session?.professional_id) {
    return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  const professionalId = session.professional_id;

  const rl = await rateLimit(`voice-tool:${professionalId}`, 120, 10 * 60 * 1000);
  if (!rl.ok) {
    return Response.json({ error: 'Muitas ações seguidas. Aguarde um pouco.' }, { status: 429 });
  }

  let body: { name?: unknown; args?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  // Só a data de hoje: o prompt inteiro (com a lista de serviços) não serve aqui.
  const tools = buildAssistantTools({ professionalId, todayISO: todayInSaoPaulo() });
  const name = typeof body.name === 'string' ? body.name : '';
  if (!Object.prototype.hasOwnProperty.call(tools, name)) {
    return Response.json({ error: `Ferramenta desconhecida: ${name || '(vazia)'}` }, { status: 400 });
  }
  const t = tools[name as keyof typeof tools];

  const parsed = t.parameters.safeParse(body.args ?? {});
  if (!parsed.success) {
    // Volta para o modelo como resultado, para ele perguntar o que faltou.
    return Response.json({ result: { success: false, error: 'Argumentos inválidos: ' + parsed.error.issues.map(i => i.path.join('.') + ' ' + i.message).join('; ') } });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (t.execute as (args: any, opts: any) => Promise<unknown>)(parsed.data, { toolCallId: 'voice', messages: [] });
    return Response.json({ result, changedData: WRITE_TOOLS.has(name) });
  } catch (e: unknown) {
    console.error('Ferramenta de voz falhou:', name, e);
    return Response.json({ result: { success: false, error: 'Não consegui concluir essa ação agora.' } });
  }
}

/**
 * Cliente mínimo da Graph API da Meta, usado pelo robô de anúncios da Lume.
 *
 * Fala em nome do usuário do sistema "Lume Robo" do Gerenciador de Negócios da
 * Lume (META_SYSTEM_USER_TOKEN). Esse token nunca vai para log, resposta ou
 * mensagem de erro: só sai daqui no corpo da requisição para graph.facebook.com.
 *
 * Com META_APP_SECRET configurado, toda chamada leva o appsecret_proof, e o app
 * pode ligar "Exigir chave secreta do app" (um token vazado sozinho não serve).
 *
 * Só roda no servidor.
 */

import { createHmac } from 'crypto';

export const META_VERSAO = process.env.META_API_VERSION || 'v25.0';
const BASE = `https://graph.facebook.com/${META_VERSAO}`;

/** Códigos de erro passageiros (limite de chamadas, instabilidade): vale tentar de novo. */
const PASSAGEIROS = new Set([1, 2, 4, 17, 32, 341, 613, 80000, 80003, 80004, 80014]);

export class MetaErro extends Error {
  constructor(
    message: string,
    readonly codigo?: number,
    readonly subcodigo?: number,
    /** Texto que a Meta preparou para mostrar a quem usa (quando existe). */
    readonly paraUsuario?: string,
  ) {
    super(message);
    this.name = 'MetaErro';
  }
}

export class MetaNaoConfigurada extends Error {
  constructor() {
    super('O robô da Meta não está configurado neste ambiente (falta META_SYSTEM_USER_TOKEN).');
    this.name = 'MetaNaoConfigurada';
  }
}

export const metaConfigurada = () => !!process.env.META_SYSTEM_USER_TOKEN;

type Valor = string | number | boolean | null | undefined | object;
type Opcoes = { metodo?: 'GET' | 'POST' | 'DELETE'; params?: Record<string, Valor>; token?: string };

/** Objetos e listas vão como JSON, do jeito que a Graph API espera em form/query. */
function serializar(params: Record<string, Valor>): URLSearchParams {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    u.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  return u;
}

const esperar = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function graph<T = Record<string, unknown>>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const token = opcoes.token ?? process.env.META_SYSTEM_USER_TOKEN;
  if (!token) throw new MetaNaoConfigurada();
  const metodo = opcoes.metodo ?? 'GET';
  const params = serializar(opcoes.params ?? {});
  params.set('access_token', token);
  const segredo = process.env.META_APP_SECRET;
  if (segredo) params.set('appsecret_proof', createHmac('sha256', segredo).update(token).digest('hex'));

  const url = `${BASE}/${caminho.replace(/^\/+/, '')}`;
  for (let tentativa = 0; ; tentativa++) {
    const resposta = await fetch(metodo === 'GET' ? `${url}?${params}` : url, {
      method: metodo,
      body: metodo === 'GET' ? undefined : params,
      signal: AbortSignal.timeout(25_000),
      cache: 'no-store',
    });
    const corpo = await resposta.json().catch(() => ({})) as { error?: { message?: string; code?: number; error_subcode?: number; error_user_msg?: string; error_user_title?: string } } & T;
    if (!corpo.error && resposta.ok) return corpo;

    const e = corpo.error ?? {};
    if (PASSAGEIROS.has(e.code ?? -1) && tentativa < 2) { await esperar(1500 * (tentativa + 1) ** 2); continue; }
    throw new MetaErro(
      e.message || `A Meta respondeu ${resposta.status}.`,
      e.code,
      e.error_subcode,
      [e.error_user_title, e.error_user_msg].filter(Boolean).join(': ') || undefined,
    );
  }
}

/** Percorre a paginação (`paging.next`) até `limite` itens. */
export async function todas<T>(caminho: string, params: Record<string, Valor> = {}, limite = 500): Promise<T[]> {
  const itens: T[] = [];
  let depois: string | undefined;
  do {
    const pagina = await graph<{ data?: T[]; paging?: { cursors?: { after?: string }; next?: string } }>(caminho, {
      params: { limit: 100, ...params, after: depois },
    });
    itens.push(...(pagina.data ?? []));
    depois = pagina.paging?.next ? pagina.paging.cursors?.after : undefined;
  } while (depois && itens.length < limite);
  return itens.slice(0, limite);
}

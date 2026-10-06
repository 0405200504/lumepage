/**
 * O que o robô da Lume enxerga na Meta: o próprio robô, a empresa (Gerenciador
 * de Negócios da Lume) e os ativos que as profissionais compartilharam com ela
 * como parceira — conta de anúncios, Página e Instagram.
 *
 * Modelo (decidido em out/2026): a conta de anúncios é DELA, paga por ela
 * direto à Meta (cartão ou Pix); a Lume entra como parceira e o robô opera.
 */

import { graph, todas } from './graph';

const BUSINESS_ID = () => process.env.META_BUSINESS_ID || process.env.LUME_META_BUSINESS_ID || '';

/** account_status da Meta → texto curto para o admin. */
const STATUS_CONTA: Record<number, string> = {
  1: 'ativa', 2: 'desativada', 3: 'pagamento pendente', 7: 'em análise de risco', 8: 'acerto pendente',
  9: 'em período de carência', 100: 'encerrando', 101: 'encerrada', 201: 'ativa', 202: 'encerrada',
};

export interface ContaAnuncio {
  /** act_123… (o id que a API usa). */
  id: string;
  nome: string;
  ativa: boolean;
  status: string;
  moeda: string;
  /** Total já gasto na conta, em centavos. */
  gasto_cents: number;
  /** Tem forma de pagamento (cartão ou saldo pré-pago). */
  pagamento: string | null;
  /** De quem é: da Lume (owned) ou de uma profissional que compartilhou (client). */
  dono: 'lume' | 'profissional';
  empresa: string | null;
  empresa_id: string | null;
}

export interface PaginaMeta {
  id: string;
  nome: string;
  instagram: { id: string; username: string } | null;
  dono: 'lume' | 'profissional';
  /** Empresa (portfólio) dona da Página: casa com a conta de anúncios da mesma dona. */
  empresa_id: string | null;
}

export interface StatusRobo {
  robo: { id: string; nome: string };
  permissoes: string[];
  empresa: { id: string; nome: string; verificada: boolean };
}

type ContaApi = {
  id: string; name: string; account_status: number; currency: string; amount_spent?: string;
  funding_source?: string; funding_source_details?: { display_string?: string }; business?: { id?: string; name?: string };
};
type PaginaApi = { id: string; name: string; instagram_business_account?: { id: string; username?: string }; business?: { id?: string } };

const CAMPOS_CONTA = 'name,account_status,currency,amount_spent,funding_source,funding_source_details,business{id,name}';

function conta(c: ContaApi, dono: ContaAnuncio['dono']): ContaAnuncio {
  return {
    id: c.id,
    nome: c.name,
    ativa: c.account_status === 1 || c.account_status === 201,
    status: STATUS_CONTA[c.account_status] ?? `status ${c.account_status}`,
    moeda: c.currency,
    gasto_cents: Number(c.amount_spent || 0),
    pagamento: c.funding_source ? (c.funding_source_details?.display_string || 'cadastrada') : null,
    dono,
    empresa: c.business?.name ?? null,
    empresa_id: c.business?.id ?? null,
  };
}

const pagina = (p: PaginaApi, dono: PaginaMeta['dono']): PaginaMeta => ({
  id: p.id,
  nome: p.name,
  instagram: p.instagram_business_account ? { id: p.instagram_business_account.id, username: p.instagram_business_account.username || '' } : null,
  dono,
  empresa_id: p.business?.id ?? null,
});

export async function statusRobo(): Promise<StatusRobo> {
  const id = BUSINESS_ID();
  const [eu, perms, empresa] = await Promise.all([
    graph<{ id: string; name: string }>('me', { params: { fields: 'id,name' } }),
    graph<{ data: { permission: string; status: string }[] }>('me/permissions'),
    graph<{ id: string; name: string; verification_status?: string }>(id, { params: { fields: 'name,verification_status' } }),
  ]);
  return {
    robo: { id: eu.id, nome: eu.name },
    permissoes: perms.data.filter(p => p.status === 'granted').map(p => p.permission),
    empresa: { id: empresa.id, nome: empresa.name, verificada: empresa.verification_status === 'verified' },
  };
}

/** Contas de anúncios e Páginas que o Gerenciador da Lume acessa (dela e das profissionais). */
export async function listarAtivos(): Promise<{ contas: ContaAnuncio[]; paginas: PaginaMeta[] }> {
  const id = BUSINESS_ID();
  const camposPagina = 'name,instagram_business_account{id,username},business{id}';
  const [proprias, clientes, paginasProprias, paginasClientes] = await Promise.all([
    todas<ContaApi>(`${id}/owned_ad_accounts`, { fields: CAMPOS_CONTA }),
    todas<ContaApi>(`${id}/client_ad_accounts`, { fields: CAMPOS_CONTA }),
    todas<PaginaApi>(`${id}/owned_pages`, { fields: camposPagina }),
    todas<PaginaApi>(`${id}/client_pages`, { fields: camposPagina }),
  ]);
  return {
    contas: [...clientes.map(c => conta(c, 'profissional')), ...proprias.map(c => conta(c, 'lume'))],
    paginas: [...paginasClientes.map(p => pagina(p, 'profissional')), ...paginasProprias.map(p => pagina(p, 'lume'))],
  };
}

/**
 * Dá ao robô acesso ao ativo que a profissional compartilhou com a Lume.
 * Compartilhar com o Gerenciador não basta: cada usuário do sistema precisa
 * ser atribuído ao ativo. Repetir não faz mal (a Meta mantém a atribuição).
 */
export async function atribuirAoRobo(ativoId: string): Promise<void> {
  const eu = await graph<{ id: string }>('me', { params: { fields: 'id' } });
  // Anunciar e ver resultados: o mínimo para criar e otimizar campanhas.
  await graph(`${ativoId}/assigned_users`, {
    metodo: 'POST',
    params: { user: eu.id, business: BUSINESS_ID(), tasks: ['ADVERTISE', 'ANALYZE'] },
  });
}

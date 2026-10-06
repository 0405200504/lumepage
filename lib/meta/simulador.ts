/**
 * Meta de mentira para demonstração e teste local (META_SIMULAR=1).
 *
 * Responde como a Graph API responderia se a profissional já tivesse
 * compartilhado conta de anúncios, Página e Instagram com a Lume — sem rede e
 * sem gastar nada. Cada chamada vai para o log com o prefixo [meta-simulada],
 * para dar para ver exatamente o que o robô mandaria.
 *
 * NUNCA liga na Vercel: lá a variável é ignorada (ver `simulando`).
 */

const B = () => process.env.META_BUSINESS_ID || process.env.LUME_META_BUSINESS_ID || 'sim_lume';

/** Os ativos que "ela" compartilhou (ajustáveis por env para outras demos). */
const DELA = () => ({
  nome: process.env.META_SIMULAR_NOME || 'Júlia Roberta Beauty',
  instagram: process.env.META_SIMULAR_INSTAGRAM || 'juliarobertabeauty',
});

export const simulando = () => process.env.META_SIMULAR === '1' && process.env.VERCEL !== '1';

let contador = 0;
const novoId = (tipo: string) => `sim_${tipo}_${Date.now().toString(36)}${(++contador).toString(36)}`;

function resumo(params: Record<string, unknown>): string {
  const p = { ...params };
  delete p.access_token;
  delete p.appsecret_proof;
  if (typeof p.bytes === 'string') p.bytes = `(imagem de ${Math.round((p.bytes as string).length * 0.75 / 1024)} KB)`;
  return JSON.stringify(p);
}

export function respostaSimulada(caminho: string, metodo: string, params: Record<string, unknown>): unknown {
  const c = caminho.replace(/^\/+/, '');
  const dela = DELA();
  console.log(`[meta-simulada] ${metodo} ${c} ${metodo === 'GET' ? '' : resumo(params)}`.trim());

  if (metodo === 'GET') {
    if (c === 'me') return { id: 'sim_robo', name: 'Lume Robo' };
    if (c === 'me/permissions') return { data: ['ads_management', 'ads_read', 'business_management', 'pages_show_list', 'pages_read_engagement', 'pages_manage_ads'].map(permission => ({ permission, status: 'granted' })) };
    if (c === B()) return { id: B(), name: 'Lume', verification_status: 'verified' };
    if (c === `${B()}/owned_ad_accounts` || c === `${B()}/owned_pages`) return { data: [] };
    if (c === `${B()}/client_ad_accounts`) {
      return { data: [{ id: 'act_sim_dela', name: dela.nome, account_status: 1, currency: 'BRL', amount_spent: '0', funding_source: 'sim_cartao', funding_source_details: { display_string: 'Visa •••• 4242' }, business: { id: 'sim_empresa_dela', name: dela.nome } }] };
    }
    if (c === `${B()}/client_pages`) {
      return { data: [{ id: 'sim_pagina_dela', name: dela.nome, instagram_business_account: { id: 'sim_ig_dela', username: dela.instagram }, business: { id: 'sim_empresa_dela' } }] };
    }
    if (c.startsWith('act_')) return { id: c, account_status: 1, funding_source: 'sim_cartao' };
    return { data: [] };
  }

  if (metodo === 'DELETE') return { success: true };
  if (c.endsWith('/assigned_users')) return { success: true };
  if (c.endsWith('/adimages')) return { images: { [String(params.name ?? 'imagem.jpg')]: { hash: novoId('hash') } } };
  const tipo = c.split('/').pop();
  if (tipo === 'campaigns' || tipo === 'adsets' || tipo === 'adcreatives' || tipo === 'ads') return { id: novoId(tipo) };
  return { success: true };
}

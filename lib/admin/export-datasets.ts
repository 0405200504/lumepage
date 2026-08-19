import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { CsvColumn, csvCents } from '@/lib/csv';
import { TableParams } from '@/lib/query-params';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';
import { formatDateBR, formatDateTimeBR } from '@/lib/format';
import { listAccessRows, AccessRow, METHOD_LABEL } from '@/lib/admin/access';

/**
 * CONJUNTOS EXPORTÁVEIS DO /ADMIN
 * -------------------------------
 * Cada dataset diz como buscar as linhas (em lotes, aplicando os MESMOS filtros da
 * tela) e quais colunas vão para o CSV. O botão de exportar é um só: passa o dataset
 * e repassa a query string da tela.
 *
 * As telas de lista ganham suas próprias queries paginadas nas FASES 1 e 2; aqui o
 * recorte já é feito no banco para que exportar não signifique carregar tudo.
 */

const BATCH = 1000;
const db = () => getSupabaseAdmin() || supabase;

export type DatasetKey = 'professionals' | 'appointments' | 'clients' | 'access';

interface Dataset<T> {
  filename: string;
  columns: CsvColumn<T>[];
  batches: (params: TableParams) => AsyncIterable<T[]>;
}

/** Percorre uma query paginada devolvendo lotes até acabar. */
async function* paginate<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): AsyncIterable<T[]> {
  if (!isSupabaseConfigured) return;
  let offset = 0;
  for (;;) {
    const { data, error } = await build(offset, offset + BATCH - 1);
    if (error) throw new Error(error.message);
    const rows = data || [];
    if (rows.length === 0) return;
    yield rows;
    if (rows.length < BATCH) return;
    offset += BATCH;
  }
}

// ————————————————————————————— Profissionais —————————————————————————————

interface ProfRow {
  id: string; name: string; brand_name: string; slug: string; email: string; whatsapp: string;
  city: string | null; state: string | null; status: string;
  subscription_plan: string | null; subscription_status: string | null;
  trial_ends_at: string | null; subscription_ends_at: string | null; created_at: string;
}

const professionals: Dataset<ProfRow> = {
  filename: 'profissionais',
  columns: [
    { header: 'Nome', value: r => r.name },
    { header: 'Marca', value: r => r.brand_name },
    { header: 'Slug', value: r => r.slug },
    { header: 'E-mail', value: r => r.email },
    { header: 'WhatsApp', value: r => r.whatsapp },
    { header: 'Cidade', value: r => r.city ?? '' },
    { header: 'UF', value: r => r.state ?? '' },
    { header: 'Status da conta', value: r => r.status },
    { header: 'Plano', value: r => r.subscription_plan ?? 'Legada' },
    { header: 'Status da assinatura', value: r => r.subscription_status ?? '' },
    { header: 'Trial termina em', value: r => formatDateBR(r.trial_ends_at) },
    { header: 'Acesso vence em', value: r => formatDateBR(r.subscription_ends_at) },
    { header: 'Cadastrada em', value: r => formatDateBR(r.created_at) },
  ],
  batches: (params) => paginate<ProfRow>((from, to) => {
    let q = db().from('professionals').select('*').neq('id', DEMO_PROFESSIONAL_ID).order('name').range(from, to);
    if (params.filters.status) q = q.eq('status', params.filters.status);
    if (params.filters.plan) q = q.eq('subscription_plan', params.filters.plan);
    if (params.q) q = q.or(`name.ilike.%${params.q}%,brand_name.ilike.%${params.q}%,email.ilike.%${params.q}%,slug.ilike.%${params.q}%`);
    if (params.from) q = q.gte('created_at', params.from);
    if (params.to) q = q.lte('created_at', `${params.to}T23:59:59`);
    return q;
  }),
};

// ————————————————————————————— Agendamentos —————————————————————————————

interface ApptRow {
  id: string; professional_id: string; client_name: string; client_whatsapp: string;
  date: string; start_time: string; end_time: string; status: string;
  notes: string | null; created_at: string;
  service: { name: string; price_cents: number } | null;
}

const appointments: Dataset<ApptRow> = {
  filename: 'agendamentos',
  columns: [
    { header: 'Data', value: r => formatDateBR(r.date) },
    { header: 'Início', value: r => (r.start_time || '').slice(0, 5) },
    { header: 'Fim', value: r => (r.end_time || '').slice(0, 5) },
    { header: 'Cliente', value: r => r.client_name },
    { header: 'WhatsApp', value: r => r.client_whatsapp },
    { header: 'Serviço', value: r => r.service?.name ?? '' },
    { header: 'Valor', value: r => csvCents(r.service?.price_cents) },
    { header: 'Status', value: r => r.status },
    { header: 'Profissional (id)', value: r => r.professional_id },
    { header: 'Observações', value: r => r.notes ?? '' },
    { header: 'Criado em', value: r => formatDateTimeBR(r.created_at) },
  ],
  batches: (params) => paginate<ApptRow>((from, to) => {
    let q = db().from('appointments')
      .select('*, service:services(name, price_cents)')
      .is('deleted_at', null)
      .neq('professional_id', DEMO_PROFESSIONAL_ID)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })
      .range(from, to);
    if (params.filters.status) q = q.eq('status', params.filters.status);
    if (params.filters.prof) q = q.eq('professional_id', params.filters.prof);
    if (params.q) q = q.or(`client_name.ilike.%${params.q}%,client_whatsapp.ilike.%${params.q}%`);
    if (params.from) q = q.gte('date', params.from);
    if (params.to) q = q.lte('date', params.to);
    return q;
  }),
};

// ————————————————————————————— Clientes —————————————————————————————

interface ClientRow {
  id: string; professional_id: string; name: string; whatsapp: string; email: string | null;
  total_appointments: number | null; last_appointment_at: string | null; created_at: string;
}

const clients: Dataset<ClientRow> = {
  filename: 'clientes',
  columns: [
    { header: 'Nome', value: r => r.name },
    { header: 'WhatsApp', value: r => r.whatsapp },
    { header: 'E-mail', value: r => r.email ?? '' },
    { header: 'Atendimentos', value: r => r.total_appointments ?? 0 },
    { header: 'Última visita', value: r => formatDateBR(r.last_appointment_at) },
    { header: 'Profissional (id)', value: r => r.professional_id },
    { header: 'Cadastrada em', value: r => formatDateBR(r.created_at) },
  ],
  batches: (params) => paginate<ClientRow>((from, to) => {
    let q = db().from('clients').select('*')
      .is('deleted_at', null)
      .neq('professional_id', DEMO_PROFESSIONAL_ID)
      .order('name')
      .range(from, to);
    if (params.filters.prof) q = q.eq('professional_id', params.filters.prof);
    if (params.q) q = q.or(`name.ilike.%${params.q}%,whatsapp.ilike.%${params.q}%,email.ilike.%${params.q}%`);
    if (params.from) q = q.gte('created_at', params.from);
    if (params.to) q = q.lte('created_at', `${params.to}T23:59:59`);
    return q;
  }),
};

// ————————————————————————————— Acessos —————————————————————————————
// A "lista de logins" que o suporte precisa: quem entra por qual caminho, quando
// entrou pela última vez e quantas sessões estão abertas. Nenhuma senha, nunca —
// a coluna útil é justamente a que mostra quem NÃO consegue entrar.

const access: Dataset<AccessRow> = {
  filename: 'acessos',
  columns: [
    { header: 'Marca', value: r => r.brandName },
    { header: 'Profissional', value: r => r.name },
    { header: 'E-mail de login', value: r => r.loginEmail },
    { header: 'E-mail comercial', value: r => r.businessEmail },
    { header: 'Método', value: r => METHOD_LABEL[r.method] },
    { header: 'Último acesso', value: r => formatDateTimeBR(r.lastSignInAt) },
    { header: 'Sessões ativas', value: r => (r.activeSessions < 0 ? '' : r.activeSessions) },
    { header: 'Senha definida em', value: r => formatDateBR(r.passwordSetAt) },
    { header: 'Troca de senha pendente', value: r => (r.mustChangePassword ? 'sim' : 'não') },
    { header: 'Consegue entrar', value: r => (r.hasAuthUser && r.method !== 'none' ? 'sim' : 'NÃO') },
    { header: 'Status da conta', value: r => r.status },
  ],
  // Uma "página" só: a composição vem do GoTrue, não de uma query paginável.
  batches: async function* () {
    const { rows } = await listAccessRows();
    if (rows.length) yield rows;
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DATASETS: Record<DatasetKey, Dataset<any>> = { professionals, appointments, clients, access };

export const isDatasetKey = (v: string): v is DatasetKey => v in DATASETS;

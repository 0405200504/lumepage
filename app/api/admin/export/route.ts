import { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/auth/require-admin';
import { logAdminAction } from '@/lib/audit';
import { csvFilename, csvStreamResponse } from '@/lib/csv';
import { DATASETS, isDatasetKey } from '@/lib/admin/export-datasets';
import { RawSearchParams, parseTableParams } from '@/lib/query-params';

export const dynamic = 'force-dynamic';

/**
 * Export CSV das listas do /admin.
 *
 *   GET /api/admin/export?dataset=professionals&status=paused&range=30d
 *
 * Recebe a MESMA query string da tela, então o arquivo é exatamente o que está à
 * vista — filtro, busca e período inclusos. Responde em streaming: nada é montado
 * inteiro em memória, nem no servidor nem no navegador.
 */
export async function GET(request: NextRequest) {
  // Sem RLS, esta rota é acesso direto ao banco: autorização primeiro, sempre.
  const session = await getAdminSession();
  if (!session) {
    return new Response('Não autorizado.', { status: 403 });
  }

  const url = new URL(request.url);
  const datasetKey = url.searchParams.get('dataset') ?? '';
  if (!isDatasetKey(datasetKey)) {
    return new Response(`Conjunto inválido. Use: ${Object.keys(DATASETS).join(', ')}.`, { status: 400 });
  }

  const raw: RawSearchParams = Object.fromEntries(url.searchParams.entries());
  const params = parseTableParams(raw, { filterKeys: ['status', 'plan', 'prof', 'bot'] });

  const dataset = DATASETS[datasetKey];

  await logAdminAction({
    action: 'export.csv',
    entityType: 'export',
    entityId: datasetKey,
    after: { q: params.q || null, from: params.from, to: params.to, filters: params.filters },
  });

  return csvStreamResponse(csvFilename(dataset.filename), dataset.columns, dataset.batches(params));
}

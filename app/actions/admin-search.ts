'use server';

import { assertAdmin, adminActionError } from '@/lib/auth/require-admin';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';
import { formatDateBR } from '@/lib/format';

/**
 * Busca global do painel (⌘K). Procura profissional, cliente e agendamento em uma
 * consulta só e devolve o link direto de cada resultado.
 */

export interface SearchHit {
  kind: 'professional' | 'client' | 'appointment';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

const db = () => getSupabaseAdmin() || supabase;
const LIMIT = 5;

/** Escapa % e _ para que a busca não vire curinga acidental. */
const like = (q: string) => `%${q.replace(/[%_\\]/g, m => `\\${m}`)}%`;

export async function adminGlobalSearchAction(query: string): Promise<{ success: boolean; hits?: SearchHit[]; error?: string }> {
  try {
    await assertAdmin();

    const q = query.trim();
    if (q.length < 2) return { success: true, hits: [] };
    if (!isSupabaseConfigured) return { success: true, hits: [] };

    const term = like(q);
    const digits = q.replace(/\D/g, '');

    const [profs, clients, appts] = await Promise.all([
      db().from('professionals')
        .select('id, name, brand_name, slug, status')
        .neq('id', DEMO_PROFESSIONAL_ID)
        .is('deleted_at', null)
        .or(`name.ilike.${term},brand_name.ilike.${term},email.ilike.${term},slug.ilike.${term}`)
        .limit(LIMIT),

      db().from('clients')
        .select('id, name, whatsapp, professional_id')
        .neq('professional_id', DEMO_PROFESSIONAL_ID)
        .is('deleted_at', null)
        .or(digits.length >= 4 ? `name.ilike.${term},whatsapp.ilike.%${digits}%` : `name.ilike.${term}`)
        .limit(LIMIT),

      db().from('appointments')
        .select('id, client_name, date, start_time, status, professional_id')
        .neq('professional_id', DEMO_PROFESSIONAL_ID)
        .is('deleted_at', null)
        .ilike('client_name', term)
        .order('date', { ascending: false })
        .limit(LIMIT),
    ]);

    const hits: SearchHit[] = [];

    for (const p of profs.data || []) {
      hits.push({
        kind: 'professional',
        id: p.id,
        title: p.brand_name || p.name,
        subtitle: `${p.name} · /${p.slug}${p.status !== 'active' ? ` · ${p.status}` : ''}`,
        href: `/admin/professionals/${p.id}`,
      });
    }

    for (const c of clients.data || []) {
      hits.push({
        kind: 'client',
        id: c.id,
        title: c.name,
        subtitle: c.whatsapp || 'sem telefone',
        href: `/admin/clients?q=${encodeURIComponent(c.name)}`,
      });
    }

    for (const a of appts.data || []) {
      hits.push({
        kind: 'appointment',
        id: a.id,
        title: a.client_name,
        subtitle: `${formatDateBR(a.date)} às ${(a.start_time || '').slice(0, 5)} · ${a.status}`,
        href: `/admin/appointments?q=${encodeURIComponent(a.client_name)}`,
      });
    }

    return { success: true, hits };
  } catch (e) {
    return adminActionError(e, 'Erro ao buscar.');
  }
}

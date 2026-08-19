import { headers } from 'next/headers';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { getAdminSession } from '@/lib/auth/require-admin';

/**
 * TRILHA DE AUDITORIA DO /ADMIN
 * -----------------------------
 * Toda action mutante do painel administrativo grava aqui: quem, o quê, sobre qual
 * registro, o antes e o depois. Sem RLS e com service-role, esta tabela é o único
 * lugar onde "quem pausou a conta da Julia?" tem resposta.
 *
 * Best-effort por decisão: uma falha de log NUNCA derruba a mutação (a operação de
 * negócio já aconteceu; perder o log é ruim, desfazer a operação é pior). Se a
 * migration v32 ainda não foi aplicada, avisa no console e segue — mesmo padrão dos
 * outros módulos que dependem de migration.
 */

export interface AdminAuditEntry {
  /** Verbo no formato `entidade.ação`, ex.: 'professional.status.update'. */
  action: string;
  entityType?: string;
  entityId?: string | null;
  /** Estado anterior — só os campos tocados, não a linha inteira. */
  before?: unknown;
  /** Estado novo. */
  after?: unknown;
}

let missingTableWarned = false;

/** IP e user-agent da requisição atual (best-effort — fora de request, vazio). */
async function requestContext(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const forwarded = h.get('x-forwarded-for') || '';
    return {
      ip: forwarded.split(',')[0].trim() || h.get('x-real-ip') || null,
      userAgent: h.get('user-agent'),
    };
  } catch {
    return { ip: null, userAgent: null };
  }
}

/** Corta payloads gigantes antes de gravar (config de site inteira, por exemplo). */
function trim(value: unknown): unknown {
  if (value === undefined) return null;
  try {
    const json = JSON.stringify(value);
    if (json && json.length > 20_000) return { _truncated: true, size: json.length };
    return value;
  } catch {
    return null;
  }
}

/**
 * Registra uma ação do admin. Nunca lança.
 * Chame DEPOIS da mutação dar certo — o log é o que aconteceu, não o que se tentou.
 */
export async function logAdminAction(entry: AdminAuditEntry): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const [session, ctx] = await Promise.all([getAdminSession(), requestContext()]);

    const { error } = await (getSupabaseAdmin() || supabase).from('admin_audit_log').insert({
      admin_id: session?.profile_id ?? null,
      admin_email: session?.email ?? null,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      before: trim(entry.before),
      after: trim(entry.after),
      ip: ctx.ip,
      user_agent: ctx.userAgent,
    });

    if (error) {
      const missing = error.code === '42P01'
        || error.code === 'PGRST205'
        || /does not exist|could not find the table|schema cache/i.test(error.message || '');
      if (missing) {
        if (!missingTableWarned) {
          missingTableWarned = true;
          console.warn('[admin_audit_log] Tabela ausente — rode supabase/migration_v32_admin_audit.sql para ativar a auditoria.');
        }
        return;
      }
      console.error('[admin_audit_log] Falha ao registrar ação:', error.message);
    }
  } catch (e) {
    console.error('[admin_audit_log] Falha ao registrar ação:', e);
  }
}

export interface AdminAuditRow {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditQuery {
  adminId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

/** Lê a trilha (usado pela aba Logs do detalhe da conta e, na FASE 4, por /admin/logs). */
export async function readAuditLog(query: AuditQuery = {}): Promise<{ rows: AdminAuditRow[]; total: number }> {
  if (!isSupabaseConfigured) return { rows: [], total: 0 };

  const limit = Math.min(query.limit ?? 50, 200);
  const offset = query.offset ?? 0;

  try {
    let q = (getSupabaseAdmin() || supabase)
      .from('admin_audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (query.adminId) q = q.eq('admin_id', query.adminId);
    if (query.entityType) q = q.eq('entity_type', query.entityType);
    if (query.entityId) q = q.eq('entity_id', query.entityId);
    if (query.action) q = q.eq('action', query.action);
    if (query.from) q = q.gte('created_at', query.from);
    if (query.to) q = q.lte('created_at', query.to);

    const { data, error, count } = await q;
    if (error) return { rows: [], total: 0 };
    return { rows: (data || []) as AdminAuditRow[], total: count || 0 };
  } catch {
    return { rows: [], total: 0 };
  }
}

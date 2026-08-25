import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { sendMail } from '@/lib/mail';
import {
  subscriptionActivatedEmail,
  paymentFailedEmail,
  subscriptionEndedEmail,
} from '@/lib/mail-templates';
import { resolvePlan } from '@/lib/subscription/entitlements';
import {
  parseHublaEvent,
  matchPlan,
  intentOf,
  accessEndsAt,
  digits,
  type HublaEvent,
} from '@/lib/subscription/hubla';

/**
 * Webhook da Hubla — libera/corta o acesso conforme a compra.
 *
 * Contrato: payload versão 2.0.0 (lib/subscription/hubla.ts documenta o formato).
 *
 * Como a Hubla trata a resposta: 2xx = entregue. Qualquer outra coisa vira
 * retentativa (5 tentativas) e, depois de dias falhando, ela DESATIVA a regra.
 * Por isso só devolvemos erro quando o erro é nosso e vale retentar (falha de
 * banco). Evento que não reconhecemos, e-mail que não achamos: 200 com o motivo
 * registrado — retentar não mudaria nada.
 *
 * Requer: HUBLA_WEBHOOK_TOKEN (fail-closed, como SESSION_SECRET e CRON_SECRET).
 * Recomendado: migration_v37_hubla_webhook.sql (log + deduplicação). Sem ela o
 * webhook funciona, só perde o histórico e a proteção contra evento repetido.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Cliente service-role. O schema não é gerado, então os nomes vão como string. */
type Db = SupabaseClient;

type Prof = {
  id: string;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  brand_name: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  subscription_ends_at: string | null;
  hubla_subscription_id: string | null;
};

export async function POST(req: NextRequest) {
  // ---------- 1. autenticidade ----------
  const expected = process.env.HUBLA_WEBHOOK_TOKEN || '';
  if (!expected) {
    console.error('[hubla] HUBLA_WEBHOOK_TOKEN não configurado — webhook recusado (fail-closed).');
    return NextResponse.json({ error: 'webhook não configurado' }, { status: 503 });
  }
  if (!safeEqual(req.headers.get('x-hubla-token'), expected)) {
    console.warn('[hubla] x-hubla-token inválido — requisição recusada.');
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const raw = await req.text();
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'payload inválido' }, { status: 400 });
  }

  const event = parseHublaEvent(payload);
  const idempotencyKey = req.headers.get('x-hubla-idempotency');
  const sandbox = (req.headers.get('x-hubla-sandbox') || '').toLowerCase() === 'true';

  console.log(
    `[hubla] ${event.type}${sandbox ? ' (sandbox)' : ''} · email=${event.email ?? '—'} · ofertas=${event.offerIds.join(',') || '—'}`,
  );

  const db = getSupabaseAdmin();

  // ---------- 2. sandbox ----------
  // "Testar configuração" no painel manda dados fictícios (john.doe@hub.la).
  // Não encosta em conta nenhuma, mas FICA REGISTRADO: sem esse rastro, um teste
  // que chegou e um que nunca saiu da Hubla são indistinguíveis do nosso lado.
  if (sandbox) {
    if (db) await openLog(db, { idempotencyKey, event, payload, result: 'sandbox' });
    return NextResponse.json({ received: true, sandbox: true, type: event.type });
  }

  const intent = intentOf(event.type);
  if (intent === 'ignore') {
    return NextResponse.json({ received: true, ignored: true, reason: `evento não tratado: ${event.type}` });
  }

  if (!db) {
    console.error('[hubla] Supabase admin indisponível.');
    return NextResponse.json({ error: 'banco indisponível' }, { status: 500 });
  }

  // ---------- 3. deduplicação ----------
  // A Hubla reenvia o mesmo aviso em retentativa e no reprocessamento manual.
  const logId = await openLog(db, { idempotencyKey, event, payload });
  if (logId === 'duplicate') {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // ---------- 4. de quem é essa compra ----------
  const prof = await findProfessional(db, event);
  if (!prof) {
    // Pagou, mas não achamos a conta (comprou com outro e-mail, ou ainda nem
    // se cadastrou). Fica registrado como órfão pra conciliação manual no admin.
    console.warn(`[hubla] Sem conta correspondente para ${event.email ?? 'e-mail ausente'} (${event.type}).`);
    await closeLog(db, logId, { result: 'unmatched', professionalId: null });
    return NextResponse.json({ received: true, matched: false, reason: 'conta não encontrada' });
  }

  const match = matchPlan(event.offerIds);

  try {
    // ---------- 5. aplicar ----------
    if (intent === 'activate') {
      // Ciclo real da assinatura tem prioridade sobre o do link (cobre upgrade,
      // cupom e mudança de oferta feitas direto no painel da Hubla).
      const months = event.billingCycleMonths || match?.months || 1;
      // Sem de-para, NÃO inventamos plano: liberamos o acesso mantendo o que a
      // conta já tinha (ou Start). Dar Premium por engano é pior que dar pouco.
      const plan = (match?.plan ?? prof.subscription_plan ?? 'start') as string;

      const patch: Record<string, unknown> = {
        subscription_status: 'active',
        subscription_plan: plan,
        subscription_ends_at: accessEndsAt(months),
      };
      if (event.subscriptionId) patch.hubla_subscription_id = event.subscriptionId;

      // Os três eventos de liberação (pagamento, assinatura ativada, acesso
      // concedido) chegam pela MESMA compra. Sem esta checagem, a mesma venda
      // renderia três e-mails de parabéns.
      const jaEstavaAtiva =
        prof.subscription_status === 'active' &&
        prof.subscription_plan === plan &&
        prof.hubla_subscription_id === event.subscriptionId;

      const { error } = await db.from('professionals').update(patch).eq('id', prof.id);
      if (error) throw error;

      if (!jaEstavaAtiva) {
        await notify(prof, subscriptionActivatedEmail({
          name: prof.name,
          plan: resolvePlan(plan),
          endsAt: patch.subscription_ends_at as string,
          months,
        }));
      }

      await history(db, prof.id, {
        plan,
        status: 'active',
        endsAt: patch.subscription_ends_at as string,
        note: `Hubla · ${event.type}${match ? ` · checkout ${match.checkoutId}` : ' · oferta não mapeada'} · ${months}m`,
      });
      await closeLog(db, logId, { result: match ? 'activated' : 'activated_unmapped', professionalId: prof.id });

      console.log(`[hubla] Acesso liberado: ${prof.email} → ${plan} (${months}m).`);
      return NextResponse.json({ received: true, matched: true, action: 'activated', plan, months });
    }

    if (intent === 'revoke') {
      // Numa troca de plano a assinatura ANTIGA é desativada depois de a nova
      // já ter ativado. Cortar aqui derrubaria quem acabou de fazer upgrade.
      if (
        event.subscriptionId &&
        prof.hubla_subscription_id &&
        event.subscriptionId !== prof.hubla_subscription_id
      ) {
        await closeLog(db, logId, { result: 'revoke_ignored_old_subscription', professionalId: prof.id });
        return NextResponse.json({ received: true, matched: true, action: 'ignored', reason: 'assinatura antiga' });
      }

      const jaEstavaCancelada = prof.subscription_status === 'canceled';

      const { error } = await db
        .from('professionals')
        .update({ subscription_status: 'canceled', subscription_ends_at: new Date().toISOString() })
        .eq('id', prof.id);
      if (error) throw error;

      if (!jaEstavaCancelada) await notify(prof, subscriptionEndedEmail({ name: prof.name }));

      await history(db, prof.id, {
        plan: prof.subscription_plan,
        status: 'canceled',
        endsAt: new Date().toISOString(),
        note: `Hubla · ${event.type}`,
      });
      await closeLog(db, logId, { result: 'revoked', professionalId: prof.id });

      console.log(`[hubla] Acesso encerrado: ${prof.email} (${event.type}).`);
      return NextResponse.json({ received: true, matched: true, action: 'revoked' });
    }

    // past_due — cobrança falhou. Não cortamos nada: o acesso segue até o
    // vencimento já gravado, e a Hubla ainda vai retentar o cartão.
    const jaEstavaAtrasada = prof.subscription_status === 'past_due';

    const { error } = await db
      .from('professionals')
      .update({ subscription_status: 'past_due' })
      .eq('id', prof.id);
    if (error) throw error;

    if (!jaEstavaAtrasada) {
      await notify(prof, paymentFailedEmail({ name: prof.name, endsAt: prof.subscription_ends_at }));
    }

    await history(db, prof.id, {
      plan: prof.subscription_plan,
      status: 'past_due',
      endsAt: null,
      note: `Hubla · ${event.type}`,
    });
    await closeLog(db, logId, { result: 'past_due', professionalId: prof.id });

    console.log(`[hubla] Pagamento falhou: ${prof.email}.`);
    return NextResponse.json({ received: true, matched: true, action: 'past_due' });
  } catch (err: unknown) {
    // Erro nosso → 500 de propósito: a Hubla retenta e a venda não se perde.
    const motivo = err instanceof Error ? err.message : String(err);
    console.error('[hubla] Falha ao aplicar o evento:', motivo);
    await closeLog(db, logId, { result: `error: ${motivo}`, professionalId: prof.id });
    return NextResponse.json({ error: 'falha ao processar' }, { status: 500 });
  }
}

/**
 * Avisa a profissional por e-mail. Best-effort de propósito: o e-mail vai para
 * o endereço da CONTA (não o do pagador, que pode ser outro), e uma falha de
 * envio nunca pode virar erro para a Hubla — o acesso já foi liberado, e um 500
 * aqui faria ela reenviar o evento inteiro.
 */
async function notify(prof: Prof, email: { subject: string; text: string; html: string }) {
  if (!prof.email) return;
  try {
    const r = await sendMail({ to: prof.email, ...email });
    if (r.sent) console.log(`[hubla] E-mail enviado para ${prof.email}: ${email.subject}`);
    else if (!r.skipped) console.warn(`[hubla] E-mail não enviado para ${prof.email}: ${r.error}`);
  } catch (e) {
    console.warn('[hubla] Falha ao enviar e-mail:', e instanceof Error ? e.message : e);
  }
}

/** Comparação em tempo constante (o token tem tamanho variável). */
function safeEqual(received: string | null, expected: string): boolean {
  if (!received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Acha a conta do Lume, do vínculo mais forte para o mais frouxo:
 *   1. `sck` — o id da profissional que nós mesmos carimbamos no link (paywall)
 *   2. assinatura já vinculada — renovação e cancelamento
 *   3. e-mail da compra
 *   4. telefone — pra quem comprou com outro e-mail
 */
async function findProfessional(db: Db, event: HublaEvent): Promise<Prof | null> {
  const COLS =
    'id, name, email, whatsapp, brand_name, subscription_plan, subscription_status, subscription_ends_at, hubla_subscription_id';
  const isUuid = (v: string | null) =>
    !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  if (isUuid(event.sck)) {
    const { data } = await db.from('professionals').select(COLS).eq('id', event.sck).maybeSingle();
    if (data) return data as Prof;
  }

  if (event.subscriptionId) {
    const { data } = await db
      .from('professionals')
      .select(COLS)
      .eq('hubla_subscription_id', event.subscriptionId)
      .maybeSingle();
    if (data) return data as Prof;
  }

  if (event.email) {
    // ilike: e-mail digitado no checkout costuma vir com outra caixa.
    const { data } = await db.from('professionals').select(COLS).ilike('email', event.email).limit(1);
    if (data?.length) return data[0] as Prof;
  }

  const phone = digits(event.phone);
  if (phone.length >= 10) {
    // O telefone é salvo em formatos variados ((15) 99750-7988, 5515997507988…),
    // e o PostgREST não normaliza. A base cabe em memória com folga; comparamos
    // os 8 últimos dígitos, que é o que sobrevive a DDI e ao nono dígito.
    const tail = phone.slice(-8);
    const { data } = await db.from('professionals').select(COLS).is('deleted_at', null).limit(5000);
    const hit = ((data || []) as Prof[]).find((p) => digits(p.whatsapp).endsWith(tail));
    if (hit) return hit;
  }

  return null;
}

/**
 * Abre o registro do evento e, de quebra, deduplica: a chave de idempotência é
 * PRIMARY KEY, então o segundo insert do mesmo aviso falha e nós paramos ali.
 * Sem a migration v37 a tabela não existe — seguimos sem log (e sem dedup).
 */
async function openLog(
  db: Db,
  {
    idempotencyKey,
    event,
    payload,
    result = 'processing',
  }: { idempotencyKey: string | null; event: HublaEvent; payload: unknown; result?: string },
): Promise<string | null | 'duplicate'> {
  const id = idempotencyKey || `${event.type}:${event.invoiceId ?? event.subscriptionId ?? Date.now()}`;
  const { error } = await db.from('hubla_webhook_events').insert({
    idempotency_key: id,
    event_type: event.type,
    email: event.email,
    subscription_id: event.subscriptionId,
    invoice_id: event.invoiceId,
    payload,
    result,
    // Sandbox já nasce concluído: não há nada pra processar depois.
    processed_at: result === 'processing' ? null : new Date().toISOString(),
  });
  if (!error) return id;
  if (error.code === '23505') return 'duplicate';
  if (error.code === '42P01') return null; // migration v37 não rodou
  console.warn('[hubla] Não foi possível registrar o evento:', error.message);
  return null;
}

async function closeLog(
  db: Db,
  logId: string | null | 'duplicate',
  { result, professionalId }: { result: string; professionalId: string | null },
) {
  if (!logId || logId === 'duplicate') return;
  await db
    .from('hubla_webhook_events')
    .update({ result, professional_id: professionalId, processed_at: new Date().toISOString() })
    .eq('idempotency_key', logId)
    .then(undefined, () => {});
}

/** Histórico que o admin já lê (migration v33). Best-effort. */
async function history(
  db: Db,
  professionalId: string,
  { plan, status, endsAt, note }: { plan: string | null; status: string; endsAt: string | null; note: string },
) {
  const { error } = await db.from('subscription_events').insert({
    professional_id: professionalId,
    plan_key: plan,
    status,
    current_period_end: endsAt,
    note,
    changed_by: 'hubla-webhook',
  });
  if (error && error.code !== '42P01') {
    console.warn('[hubla] Histórico não registrado:', error.message);
  }
}

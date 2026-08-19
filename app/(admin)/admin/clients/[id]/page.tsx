import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { StatCard } from '@/components/admin/primitives';
import { AppointmentStatusBadge, Badge } from '@/components/admin/badges';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { normalizePhone } from '@/lib/admin/queries';
import { brl, formatDateBR, formatTimeBR } from '@/lib/format';
import { buildWhatsappLink } from '@/lib/whatsapp';
import { Appointment, Client } from '@/types/database';

export const metadata = { title: 'Cliente | Lume Admin' };

const db = () => getSupabaseAdmin() || supabase;
const REVENUE = ['completed', 'confirmed'];

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id } = await params;
  if (!isSupabaseConfigured) notFound();

  const { data: clientData } = await db().from('clients').select('*').eq('id', id).maybeSingle();
  if (!clientData) notFound();
  const client = clientData as Client;

  const [{ data: profData }, { data: apptData }, { data: anamnesis }] = await Promise.all([
    db().from('professionals').select('id, name, brand_name').eq('id', client.professional_id).maybeSingle(),
    db().from('appointments').select('*, service:services(name, price_cents)')
      .eq('professional_id', client.professional_id)
      .eq('client_whatsapp', client.whatsapp)
      .is('deleted_at', null).order('date', { ascending: false }).limit(200),
    db().from('anamnesis_responses').select('id, created_at, status').eq('client_id', id).limit(5),
  ]);

  type A = Appointment & { service: { name?: string; price_cents?: number } | null };
  const appts = (apptData || []) as unknown as A[];
  const paid = appts.filter(a => REVENUE.includes(a.status));
  const spent = paid.reduce((s, a) => s + (a.service?.price_cents || 0), 0);
  const noShows = appts.filter(a => a.status === 'no_show').length;
  const first = appts.length ? appts[appts.length - 1].date : null;
  const last = appts.length ? appts[0].date : null;
  const prof = profData as { id: string; name: string; brand_name: string } | null;

  const kpi = (label: string, value: string) => <StatCard key={label} label={label} value={value} />;

  return (
    <LayoutAdmin
      session={session}
      title={client.name}
      subtitle={`${client.whatsapp}${client.email ? ` · ${client.email}` : ''} · cliente de ${prof?.brand_name || '—'}`}
      actions={
        <>
          <a href={buildWhatsappLink(client.whatsapp, '')} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-line bg-surface text-xs font-bold text-[#226045] hover:bg-surface-2">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
          <Link href="/admin/clients" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-line bg-surface text-xs font-bold text-ink hover:bg-surface-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpi('Total gasto', brl(spent))}
          {kpi('Ticket médio', brl(paid.length ? Math.round(spent / paid.length) : 0))}
          {kpi('Atendimentos', String(appts.filter(a => a.status !== 'cancelled').length))}
          {kpi('Faltas', String(noShows))}
          {kpi('Primeira visita', formatDateBR(first, '—'))}
          {kpi('Última visita', formatDateBR(last, '—'))}
          {kpi('Telefone padronizado', normalizePhone(client.whatsapp) || '—')}
          {kpi('Fichas de anamnese', String((anamnesis || []).length))}
        </div>

        {client.notes && (
          <section className="card p-4">
            <h2 className="text-sm font-bold text-ink mb-1.5">Observações da profissional</h2>
            <p className="text-xs text-muted whitespace-pre-wrap">{client.notes}</p>
          </section>
        )}

        <section className="card overflow-hidden">
          <h2 className="px-4 py-3 text-sm font-bold text-ink border-b border-line">Histórico de agendamentos</h2>
          <ul className="divide-y divide-line">
            {appts.map(a => (
              <li key={a.id} className="px-4 py-2.5 flex flex-wrap items-center gap-3 text-xs">
                <span className="tabular-nums font-semibold text-ink w-24">{formatDateBR(a.date)}</span>
                <span className="tabular-nums text-muted w-12">{formatTimeBR(a.start_time)}</span>
                <span className="text-ink flex-1 min-w-[8rem] truncate">{a.service?.name}</span>
                <span className="tabular-nums text-ink">{brl(a.service?.price_cents || 0)}</span>
                <AppointmentStatusBadge status={a.status} />
              </li>
            ))}
            {appts.length === 0 && <li className="px-4 py-8 text-center text-xs text-muted">Nenhum agendamento.</li>}
          </ul>
        </section>

        {(anamnesis || []).length > 0 && (
          <section className="card p-4">
            <h2 className="text-sm font-bold text-ink mb-2">Fichas de anamnese</h2>
            <ul className="flex flex-wrap gap-2">
              {(anamnesis as { id: string; created_at: string; status: string }[]).map(f => (
                <li key={f.id}><Badge tone="neutral">{formatDateBR(f.created_at)} · {f.status}</Badge></li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </LayoutAdmin>
  );
}

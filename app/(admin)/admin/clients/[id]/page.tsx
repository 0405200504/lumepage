import React from 'react';
import { notFound } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { StatStrip, Panel, KeyValue, EmptyState } from '@/components/admin/primitives';
import { AppointmentStatusBadge, Badge } from '@/components/admin/badges';
import { button } from '@/components/admin/ui';
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
  const forms = (anamnesis || []) as { id: string; created_at: string; status: string }[];

  return (
    <LayoutAdmin
      session={session}
      title={client.name}
      subtitle={`Cliente de ${prof?.brand_name || '—'}`}
      backHref="/admin/clients"
      backLabel="Clientes"
      actions={
        <a href={buildWhatsappLink(client.whatsapp, '')} target="_blank" rel="noopener noreferrer" className={button('secondary', 'md')}>
          <MessageCircle className="h-4 w-4" /> Abrir no WhatsApp
        </a>
      }
    >
      <div className="space-y-4">
        <StatStrip items={[
          { label: 'Total gasto', value: brl(spent), tone: 'accent' },
          { label: 'Ticket médio', value: brl(paid.length ? Math.round(spent / paid.length) : 0) },
          { label: 'Atendimentos', value: String(appts.filter(a => a.status !== 'cancelled').length) },
          { label: 'Faltas', value: String(noShows), tone: noShows ? 'bad' : 'default' },
        ]} />

        <div className="grid gap-4 lg:grid-cols-12">
          <Panel flush title="Histórico de agendamentos" note={`${appts.length} registro(s)`} className="lg:col-span-8">
            <ul className="divide-y divide-line border-t border-line">
              {appts.map(a => (
                <li key={a.id} className="px-5 py-3 flex flex-wrap items-center gap-3 text-body-sm">
                  <span className="num font-semibold text-heading w-24">{formatDateBR(a.date)}</span>
                  <span className="num text-n-500 w-12">{formatTimeBR(a.start_time)}</span>
                  <span className="text-ink flex-1 min-w-[8rem] truncate">{a.service?.name}</span>
                  <span className="num text-heading">{brl(a.service?.price_cents || 0)}</span>
                  <AppointmentStatusBadge status={a.status} />
                </li>
              ))}
              {appts.length === 0 && <li><EmptyState title="Nenhum agendamento" className="py-8" /></li>}
            </ul>
          </Panel>

          <div className="lg:col-span-4 space-y-4">
            <Panel title="Ficha">
              <dl>
                <KeyValue label="WhatsApp">{client.whatsapp}</KeyValue>
                <KeyValue label="Padronizado">{normalizePhone(client.whatsapp) || '—'}</KeyValue>
                {client.email && <KeyValue label="E-mail">{client.email}</KeyValue>}
                <KeyValue label="Primeira visita">{formatDateBR(first, '—')}</KeyValue>
                <KeyValue label="Última visita">{formatDateBR(last, '—')}</KeyValue>
                <KeyValue label="Fichas de anamnese">{forms.length}</KeyValue>
              </dl>
              {forms.length > 0 && (
                <ul className="flex flex-wrap gap-1.5 mt-3">
                  {forms.map(f => <li key={f.id}><Badge tone="neutral">{formatDateBR(f.created_at)} · {f.status}</Badge></li>)}
                </ul>
              )}
            </Panel>

            {client.notes && (
              <Panel title="Observações da profissional">
                <p className="text-body-sm text-n-600 whitespace-pre-wrap">{client.notes}</p>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </LayoutAdmin>
  );
}

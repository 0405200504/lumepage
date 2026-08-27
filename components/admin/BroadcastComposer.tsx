'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { createNoticeAction, setNoticeActiveAction, NoticeInput, NoticeRow } from '@/app/actions/admin-system';
import { formatDateTimeBR } from '@/lib/format';
import { Badge } from './badges';

const AUDIENCES: { value: NoticeInput['audience']; label: string }[] = [
  { value: 'all', label: 'Todas as profissionais' },
  { value: 'active', label: 'Só contas ativas' },
  { value: 'trialing', label: 'Só quem está em teste' },
  { value: 'no_bot', label: 'Só quem não configurou o bot' },
];

/** Escreve o aviso, vê o preview e publica. */
export function BroadcastComposer({ notices, available }: { notices: NoticeRow[]; available: boolean }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [form, setForm] = useState<NoticeInput>({ title: '', body: '', level: 'info', audience: 'all', endsAt: null });
  const [busy, setBusy] = useState(false);

  const publish = async () => {
    setBusy(true);
    const res = await createNoticeAction(form);
    setBusy(false);
    if (res.success) {
      success('Aviso publicado', 'Aparece no painel das profissionais do público escolhido.');
      setForm({ title: '', body: '', level: 'info', audience: 'all', endsAt: null });
      router.refresh();
    } else error('Não deu', res.error ?? 'Tente de novo.');
  };

  const toggle = async (id: string, active: boolean) => {
    const res = await setNoticeActiveAction(id, active);
    if (res.success) router.refresh();
    else error('Não deu', res.error ?? 'Tente de novo.');
  };

  const field = 'w-full h-9 px-3 rounded-xl border border-line bg-surface text-label text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600';
  const label = 'block text-caption font-bold uppercase tracking-[0.1em] text-muted mb-1';
  const tone = { info: 'accent', warn: 'warn', success: 'ok' } as const;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card p-4 space-y-3">
        <h2 className="text-label font-bold text-ink">Novo aviso</h2>

        <label className="block">
          <span className={label}>Título</span>
          <input className={field} value={form.title} maxLength={120}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="ex.: Manutenção no sábado" />
        </label>

        <label className="block">
          <span className={label}>Mensagem</span>
          <textarea rows={4} maxLength={600} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-line bg-surface text-label text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
            placeholder="O que a profissional precisa saber." />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={label}>Público</span>
            <select className={field} value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value as NoticeInput['audience'] }))}>
              {AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={label}>Tom</span>
            <select className={field} value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value as NoticeInput['level'] }))}>
              <option value="info">Informativo</option>
              <option value="warn">Atenção</option>
              <option value="success">Novidade</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className={label}>Some depois de (opcional)</span>
          <input type="date" className={field} value={form.endsAt?.slice(0, 10) ?? ''}
            onChange={e => setForm(f => ({ ...f, endsAt: e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : null }))} />
        </label>

        <div>
          <span className={label}>Preview</span>
          <div className={`rounded-xl px-3 py-2.5 text-caption ring-1 ${
            form.level === 'warn' ? 'bg-warning-bg ring-warning-border text-warning'
              : form.level === 'success' ? 'bg-success-bg ring-success-border text-success'
              : 'bg-accent-soft ring-accent-soft-border text-accent-link'
          }`}>
            <p className="font-bold">{form.title || 'Título do aviso'}</p>
            <p className="mt-0.5 opacity-90 whitespace-pre-wrap">{form.body || 'A mensagem aparece assim no painel da profissional.'}</p>
          </div>
        </div>

        <button type="button" disabled={busy || !form.title.trim() || !form.body.trim()} onClick={publish}
          className="w-full h-9 rounded-xl bg-wine-700 hover:bg-wine-800 text-white text-caption font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-40 transition-colors">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Publicar aviso
        </button>

        {!available && (
          <p className="text-caption text-warning">
            Rode <code className="font-mono">supabase/migration_v34_admin_system.sql</code> para habilitar os avisos.
          </p>
        )}
      </section>

      <section className="card overflow-hidden">
        <h2 className="px-4 py-3 text-label font-bold text-ink border-b border-line">Avisos publicados</h2>
        <ul className="divide-y divide-line max-h-[32rem] overflow-y-auto">
          {notices.map(n => (
            <li key={n.id} className="px-4 py-3 flex items-start gap-3">
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-caption font-bold text-ink truncate">{n.title}</span>
                  <Badge tone={tone[n.level]}>{n.audience}</Badge>
                  {!n.active && <Badge tone="neutral">oculto</Badge>}
                </span>
                <span className="block text-caption text-muted mt-0.5 line-clamp-2">{n.body}</span>
                <span className="block text-caption text-faint mt-1 num">
                  {formatDateTimeBR(n.created_at)} · {n.created_by}
                </span>
              </span>
              <button type="button" onClick={() => toggle(n.id, !n.active)}
                aria-label={n.active ? 'Ocultar aviso' : 'Reexibir aviso'}
                className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface-2 shrink-0">
                {n.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </li>
          ))}
          {notices.length === 0 && <li className="px-4 py-10 text-center text-caption text-muted">Nenhum aviso publicado ainda.</li>}
        </ul>
      </section>
    </div>
  );
}

'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Copy, Check, KeyRound, Link2, Mail, LogIn, ShieldOff, AlertTriangle, X, Loader2, Eye, Pencil,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/admin/badges';
import { formatDateBR, formatDateTimeBR, formatRelativeBR } from '@/lib/format';
import {
  sendPasswordResetAction, createMagicLinkAction, setTemporaryPasswordAction,
  changeLoginEmailAction, revokeSessionsAction,
} from '@/app/actions/admin-access';
import { impersonateAction, SupportMode } from '@/app/actions/admin-professionals';

/**
 * ABA "ACESSO" — o que o suporte precisa saber e poder fazer sobre o login de uma conta.
 *
 * O que esta tela deliberadamente NÃO tem: a senha. Ela não aparece aqui porque não
 * existe de forma legível em lugar nenhum — o GoTrue guarda só o hash bcrypt. As
 * quatro ações abaixo resolvem 100% dos casos de suporte sem que ninguém precise
 * saber a senha de ninguém, e cada uma delas fica registrada na auditoria.
 */

export interface AccessPanelData {
  professionalId: string;
  brandName: string;
  loginEmail: string;
  businessEmail: string;
  loginEmailMatchesBusiness: boolean;
  methodLabel: string;
  method: 'password' | 'google' | 'both' | 'none';
  hasAuthUser: boolean;
  passwordSetAt: string | null;
  mustChangePassword: boolean;
  lastSignInAt: string | null;
  lastIp: string | null;
  lastDevice: string | null;
  signIns30d: number;
  activeSessions: number;
  emailConfirmedAt: string | null;
  available: boolean;
  reason?: string;
  history: {
    id: string; method: string; success: boolean; ip: string | null;
    userAgent: string | null; impersonatedBy: string | null; createdAt: string;
  }[];
  supportActions: { id: string; action: string; adminEmail: string | null; createdAt: string }[];
}

const METHOD_TONE: Record<AccessPanelData['method'], 'ok' | 'warn' | 'bad' | 'neutral'> = {
  password: 'ok', both: 'ok', google: 'warn', none: 'bad',
};

const EVENT_LABEL: Record<string, string> = {
  password: 'Senha', google: 'Google', magic: 'Link mágico',
  impersonation: 'Suporte (entrar como)', temp_password: 'Senha temporária',
};

/** "Chrome no Android" a partir do user-agent — sem biblioteca, só o que dá para afirmar. */
function deviceOf(ua: string | null): string {
  if (!ua) return '—';
  const os = /iPhone|iPad/i.test(ua) ? 'iPhone/iPad'
    : /Android/i.test(ua) ? 'Android'
    : /Macintosh/i.test(ua) ? 'Mac'
    : /Windows/i.test(ua) ? 'Windows'
    : /Linux/i.test(ua) ? 'Linux' : 'desconhecido';
  const browser = /Edg\//i.test(ua) ? 'Edge'
    : /OPR\//i.test(ua) ? 'Opera'
    : /Chrome\//i.test(ua) ? 'Chrome'
    : /Firefox\//i.test(ua) ? 'Firefox'
    : /Safari\//i.test(ua) ? 'Safari' : 'navegador';
  return `${browser} no ${os}`;
}

export function AccessPanel({ data }: { data: AccessPanelData }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ title: string; value: string; note: string } | null>(null);
  const [emailDialog, setEmailDialog] = useState(false);

  const copy = async (value: string, tag: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(tag);
      setTimeout(() => setCopied(c => (c === tag ? null : c)), 1600);
    } catch {
      error('Não deu para copiar', 'Selecione e copie na mão.');
    }
  };

  const run = (fn: () => Promise<{ success: boolean; error?: string }>, okMsg: string) =>
    start(async () => {
      const res = await fn();
      if (res.success) { success('Pronto', okMsg); router.refresh(); }
      else error('Não deu', res.error ?? 'Tente de novo.');
    });

  /** Abre a conta em OUTRA aba: o admin não perde o lugar onde estava. */
  const enter = (mode: SupportMode) =>
    start(async () => {
      const res = await impersonateAction(data.professionalId, mode);
      if (!res.success) { error('Não deu', res.error ?? 'Tente de novo.'); return; }
      window.open(res.url ?? '/dashboard', '_blank', 'noopener');
      success('Sessão de suporte aberta', `${data.brandName} · ${mode === 'read' ? 'somente leitura' : 'pode editar'} · 30 min`);
    });

  const cantLogIn = !data.hasAuthUser || data.method === 'none';

  return (
    <div className="space-y-4">
      {!data.available && (
        <p className="card px-4 py-3 text-caption text-warning font-semibold flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-px" aria-hidden />
          {data.reason ?? 'Dados de acesso indisponíveis.'}
        </p>
      )}

      {cantLogIn && (
        <p className="card px-4 py-3 text-caption text-danger font-semibold flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-px" aria-hidden />
          {data.hasAuthUser
            ? 'Esta conta não tem senha nem Google: hoje ela não consegue entrar por caminho nenhum. Defina uma senha temporária.'
            : 'Esta conta não tem usuário de autenticação. Ela não consegue entrar — só o "Entrar como" funciona.'}
        </p>
      )}

      {/* ————— Credenciais ————— */}
      <section className="card overflow-hidden">
        <h2 className="px-4 py-3 text-label font-bold text-ink border-b border-line">Credenciais</h2>
        <dl className="divide-y divide-line text-caption">
          <Row label="E-mail de login" hint="é este que ela digita para entrar">
            <span className="font-semibold text-ink break-all">{data.loginEmail}</span>
            <button type="button" onClick={() => copy(data.loginEmail, 'email')} aria-label="Copiar e-mail de login"
              className="p-1 rounded-lg text-muted hover:text-ink hover:bg-surface-2">
              {copied === 'email' ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button type="button" onClick={() => setEmailDialog(true)} disabled={!data.hasAuthUser}
              className="text-caption font-bold text-accent-link hover:underline disabled:opacity-40 disabled:no-underline">
              Alterar
            </button>
          </Row>

          {!data.loginEmailMatchesBusiness && (
            <Row label="E-mail comercial" hint="o que aparece no cadastro — não serve para entrar">
              <span className="text-muted break-all">{data.businessEmail}</span>
              <Badge tone="warn">diferente do login</Badge>
            </Row>
          )}

          <Row label="Método de autenticação">
            <Badge tone={METHOD_TONE[data.method]}>{data.methodLabel}</Badge>
            {data.method === 'google' && <span className="text-muted">sem senha de reserva</span>}
          </Row>

          <Row label="Senha" hint="o valor não existe em lugar nenhum de forma legível">
            {data.method === 'google' || data.method === 'none' ? (
              <span className="text-muted">Nunca definida{data.method === 'google' ? ' — só entra pelo Google' : ''}</span>
            ) : (
              <span className="text-ink font-semibold">
                {data.passwordSetAt ? `Definida em ${formatDateBR(data.passwordSetAt)}` : 'Definida (data anterior ao registro)'}
              </span>
            )}
            {data.mustChangePassword && <Badge tone="warn">troca obrigatória pendente</Badge>}
          </Row>

          <Row label="Último acesso">
            <span className="text-ink font-semibold num">{formatDateTimeBR(data.lastSignInAt, 'nunca acessou')}</span>
            {data.lastSignInAt && <span className="text-muted">{formatRelativeBR(data.lastSignInAt)}</span>}
          </Row>

          <Row label="De onde" hint="do último acesso registrado por nós">
            <span className="text-muted num">{data.lastIp ?? '—'}</span>
            <span className="text-muted">{deviceOf(data.lastDevice)}</span>
          </Row>

          <Row label="Acessos nos últimos 30 dias">
            <span className="text-ink font-semibold num">{data.signIns30d}</span>
          </Row>

          <Row label="Sessões ativas" hint="mais de uma pode ser conta compartilhada">
            <span className="text-ink font-semibold num">
              {data.activeSessions < 0 ? '—' : data.activeSessions}
            </span>
            <button
              type="button" disabled={pending || data.activeSessions <= 0}
              onClick={() => { if (confirm(`Encerrar todas as sessões de ${data.brandName}? Ela vai precisar entrar de novo.`)) run(() => revokeSessionsAction(data.professionalId), 'Sessões encerradas.'); }}
              className="inline-flex items-center gap-1.5 text-caption font-bold text-accent-link hover:underline disabled:opacity-40 disabled:no-underline"
            >
              <ShieldOff className="h-3.5 w-3.5" aria-hidden /> Encerrar todas
            </button>
          </Row>

          <Row label="E-mail confirmado">
            {data.emailConfirmedAt
              ? <span className="text-muted num">{formatDateBR(data.emailConfirmedAt)}</span>
              : <Badge tone="warn">nunca confirmado</Badge>}
          </Row>
        </dl>
      </section>

      {/* ————— Ações de acesso ————— */}
      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-line">
          <h2 className="text-label font-bold text-ink">Ações de acesso</h2>
          <p className="text-caption text-muted mt-0.5">
            Estas quatro resolvem o suporte inteiro. Nenhuma delas exibe, envia ou grava senha —
            o que aparece na tela aparece uma vez e depois só existe como hash.
          </p>
        </div>
        <div className="p-4 grid gap-2.5 sm:grid-cols-2">
          <Action
            icon={<Mail className="h-4 w-4" />} title="Enviar link de redefinição"
            desc="Vai para o e-mail dela. Uso único, expira em 1 hora." disabled={pending || !data.hasAuthUser}
            onClick={() => start(async () => {
              const res = await sendPasswordResetAction(data.professionalId);
              if (!res.success) { error('Não deu', res.error ?? 'Tente de novo.'); return; }
              if (res.url) setSecret({ title: 'Link de redefinição', value: res.url, note: res.error ?? 'Vale 1 hora e só funciona uma vez.' });
              else success('Enviado', `Link de redefinição a caminho de ${data.loginEmail}.`);
              router.refresh();
            })}
          />
          <Action
            icon={<Link2 className="h-4 w-4" />} title="Gerar link mágico de acesso"
            desc="Loga ela direto. Uso único, expira em 15 minutos." disabled={pending}
            onClick={() => start(async () => {
              const res = await createMagicLinkAction(data.professionalId);
              if (!res.success || !res.url) { error('Não deu', res.error ?? 'Tente de novo.'); return; }
              setSecret({ title: 'Link mágico de acesso', value: res.url, note: 'Vale 15 minutos, só funciona uma vez e não aparece de novo. Mande no WhatsApp dela agora.' });
              router.refresh();
            })}
          />
          <Action
            icon={<KeyRound className="h-4 w-4" />} title="Definir senha temporária"
            desc="Ela é obrigada a trocar no próximo login." disabled={pending || !data.hasAuthUser}
            onClick={() => start(async () => {
              if (!confirm(`Definir uma senha temporária para ${data.brandName}? A senha atual dela deixa de valer.`)) return;
              const res = await setTemporaryPasswordAction(data.professionalId);
              if (!res.success || !res.password) { error('Não deu', res.error ?? 'Tente de novo.'); return; }
              setSecret({ title: 'Senha temporária', value: res.password, note: 'Anote e mande agora: ela não aparece de novo, nem para você. No próximo login o sistema obriga a troca.' });
              router.refresh();
            })}
          />
          <div className="rounded-2xl border border-line p-3">
            <p className="flex items-center gap-2 text-caption font-bold text-ink"><LogIn className="h-4 w-4 text-muted" aria-hidden /> Entrar como</p>
            <p className="text-caption text-muted mt-0.5">Sessão de suporte de 30 minutos, em nova aba.</p>
            <div className="flex gap-2 mt-2.5">
              <button type="button" disabled={pending} onClick={() => enter('read')}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-wine-700 hover:bg-wine-800 text-white text-caption font-bold disabled:opacity-50">
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />} Só olhar
              </button>
              <button type="button" disabled={pending} onClick={() => { if (confirm(`Entrar na conta de ${data.brandName} PODENDO EDITAR? Toda alteração fica registrada no nome de quem entrou.`)) enter('edit'); }}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-line bg-surface text-ink text-caption font-bold hover:bg-surface-2 disabled:opacity-50">
                <Pencil className="h-3.5 w-3.5" /> Pode editar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ————— Histórico ————— */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <h2 className="px-4 py-3 text-label font-bold text-ink border-b border-line">Últimas entradas</h2>
          {data.history.length === 0 ? (
            <p className="px-4 py-8 text-center text-caption text-muted">
              Nada registrado ainda. O histórico começa na primeira entrada depois da migration v36.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {data.history.map(h => (
                <li key={h.id} className="px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption">
                  <span className="num text-muted w-32 shrink-0">{formatDateTimeBR(h.createdAt)}</span>
                  <Badge tone={h.success ? 'neutral' : 'bad'}>{EVENT_LABEL[h.method] ?? h.method}</Badge>
                  {!h.success && <span className="text-danger font-semibold">falhou</span>}
                  {h.impersonatedBy && <span className="text-muted truncate">por {h.impersonatedBy}</span>}
                  <span className="ml-auto text-muted num" title={h.userAgent ?? undefined}>{h.ip ?? '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card overflow-hidden">
          <h2 className="px-4 py-3 text-label font-bold text-ink border-b border-line">Ações de suporte nesta conta</h2>
          {data.supportActions.length === 0 ? (
            <p className="px-4 py-8 text-center text-caption text-muted">Nenhuma ação de acesso executada aqui.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.supportActions.map(a => (
                <li key={a.id} className="px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption">
                  <span className="num text-muted w-32 shrink-0">{formatDateTimeBR(a.createdAt)}</span>
                  <Badge tone="neutral">{a.action}</Badge>
                  <span className="ml-auto text-muted truncate">{a.adminEmail ?? '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {secret && <SecretDialog {...secret} onClose={() => setSecret(null)} onCopy={v => copy(v, 'secret')} copied={copied === 'secret'} />}
      {emailDialog && (
        <ChangeEmailDialog
          current={data.loginEmail} brandName={data.brandName}
          onClose={() => setEmailDialog(false)}
          onSave={async next => {
            const res = await changeLoginEmailAction(data.professionalId, next);
            if (res.success) { success('E-mail trocado', `Agora ela entra com ${next}.`); setEmailDialog(false); router.refresh(); }
            else error('Não deu', res.error ?? 'Tente de novo.');
          }}
        />
      )}
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
      <dt className="w-44 shrink-0">
        <span className="block text-caption font-bold uppercase tracking-[0.08em] text-muted">{label}</span>
        {hint && <span className="block text-caption text-faint leading-tight">{hint}</span>}
      </dt>
      <dd className="flex flex-wrap items-center gap-2 min-w-0 flex-1">{children}</dd>
    </div>
  );
}

function Action({ icon, title, desc, onClick, disabled }: {
  icon: React.ReactNode; title: string; desc: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="text-left rounded-2xl border border-line p-3 hover:bg-surface-2 transition-colors disabled:opacity-40 disabled:hover:bg-transparent">
      <span className="flex items-center gap-2 text-caption font-bold text-ink"><span className="text-muted">{icon}</span>{title}</span>
      <span className="block text-caption text-muted mt-0.5">{desc}</span>
    </button>
  );
}

/** Mostra UMA vez o valor gerado. Fechou, acabou — nem nós conseguimos recuperar. */
function SecretDialog({ title, value, note, onClose, onCopy, copied }: {
  title: string; value: string; note: string; onClose: () => void; onCopy: (v: string) => void; copied: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-wine-950/45" onClick={onClose} />
      <div className="relative w-full max-w-lg card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-label font-bold text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-1.5 rounded-lg text-muted hover:bg-surface-2"><X className="h-4 w-4" /></button>
        </div>

        <p className="rounded-xl bg-surface-2 border border-line px-3 py-2.5 font-mono text-caption text-ink break-all select-all">{value}</p>

        <p className="text-caption text-warning font-semibold flex items-start gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" aria-hidden /> {note}
        </p>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onCopy(value)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-wine-700 hover:bg-wine-800 text-white text-caption font-bold">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button type="button" onClick={onClose} className="h-9 px-3 rounded-xl text-caption font-bold text-muted hover:bg-surface-2">Já anotei</button>
        </div>
      </div>
    </div>
  );
}

function ChangeEmailDialog({ current, brandName, onClose, onSave }: {
  current: string; brandName: string; onClose: () => void; onSave: (next: string) => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Alterar e-mail de login">
      <div className="absolute inset-0 bg-wine-950/45" onClick={onClose} />
      <div className="relative w-full max-w-md card p-5 space-y-4">
        <div>
          <h2 className="text-label font-bold text-ink">Alterar o e-mail de login</h2>
          <p className="text-caption text-muted mt-0.5">{brandName} entra hoje com <strong className="text-ink">{current}</strong>.</p>
        </div>

        <label className="block">
          <span className="block text-caption font-bold uppercase tracking-[0.08em] text-muted mb-1">Novo e-mail de login</span>
          <input type="email" value={value} onChange={e => setValue(e.target.value)} placeholder="novo@email.com"
            className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-label text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700" />
        </label>

        <p className="text-caption text-muted">
          Os dois endereços — o antigo e o novo — recebem um aviso da mudança. É assim que ela
          descobre se alguém trocou o acesso dela sem avisar.
        </p>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 px-3 rounded-xl text-caption font-bold text-muted hover:bg-surface-2">Cancelar</button>
          <button type="button" disabled={saving || !value.includes('@')}
            onClick={async () => { setSaving(true); await onSave(value.trim().toLowerCase()); setSaving(false); }}
            className="h-9 px-4 rounded-xl bg-wine-700 hover:bg-wine-800 text-white text-caption font-bold disabled:opacity-50">
            {saving ? 'Salvando…' : 'Alterar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AccessPanel;

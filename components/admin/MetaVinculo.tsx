'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Unlink, Rocket, Play, Pause, Trash2, ExternalLink, Bot } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { vincularMetaAction, desvincularMetaAction, campanhaMetaAction, retomarRoboAction } from '@/app/actions/mais-clientes';
import { button, fieldSm } from './ui';
import type { EstadoRobo, GrowthMeta } from '@/types/mais-clientes';

export type OpcaoMeta = { id: string; nome: string; detalhe?: string };

/**
 * Liga a conta à conta de anúncios e à Página que ela compartilhou com a Lume.
 * Mostra primeiro os ativos de profissionais ainda sem dona no Lume.
 */
const ETAPA: Record<EstadoRobo['etapa'], { texto: string; cor: string }> = {
  aguardando_envio: { texto: 'esperando ela enviar', cor: 'bg-n-300' },
  aguardando_acesso: { texto: 'esperando o acesso dela', cor: 'bg-warning' },
  vinculo_manual: { texto: 'escolha a conta abaixo', cor: 'bg-warning' },
  aguardando_pagamento: { texto: 'falta cartão ou Pix', cor: 'bg-warning' },
  no_ar: { texto: 'no ar', cor: 'bg-success' },
  erro: { texto: 'erro', cor: 'bg-danger' },
};

/** Onde o robô está com a conta, e o botão para devolver o controle a ele. */
function SituacaoRobo({ id, robo }: { id: string; robo: EstadoRobo | null }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [pendente, start] = useTransition();
  if (!robo) return null;
  const e = ETAPA[robo.etapa];
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-caption">
      <Bot className="h-3.5 w-3.5 text-n-500" />
      <span className={`h-2 w-2 rounded-full ${robo.pausado ? 'bg-n-300' : e.cor}`} />
      <span className="font-semibold text-heading" title={robo.mensagem}>Robô: {robo.pausado ? 'pausado por você' : e.texto}</span>
      {robo.mensagem && <span className="text-n-500 basis-full">{robo.mensagem}</span>}
      {robo.pausado && (
        <button type="button" disabled={pendente} className={button('ghost', 'sm')} onClick={() => start(async () => {
          const r = await retomarRoboAction(id);
          if (!r.success) { error('Não deu', r.error ?? 'Tente de novo.'); return; }
          success('Robô retomado', 'Ele segue de onde parou.');
          router.refresh();
        })}>Retomar robô</button>
      )}
    </div>
  );
}

export function MetaVinculo({ id, meta, contas, paginas, criativos = 0, enviado = false, robo = null }: {
  id: string;
  meta: GrowthMeta | null;
  robo?: EstadoRobo | null;
  contas: OpcaoMeta[];
  paginas: OpcaoMeta[];
  /** Criativos salvos no envio (o robô sobe estes). */
  criativos?: number;
  /** Ela já mandou a estruturação para a equipe. */
  enviado?: boolean;
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [pendente, start] = useTransition();
  const [conta, setConta] = useState(meta?.ad_account_id ?? '');
  const [pagina, setPagina] = useState(meta?.page_id ?? '');
  const [editando, setEditando] = useState(!meta);

  if (meta && !editando) {
    return (
      <div className="space-y-2 min-w-[14rem]">
        <SituacaoRobo id={id} robo={robo} />
        <div className="flex items-start justify-between gap-2">
          <div className="text-caption leading-snug">
            <p className="font-semibold text-heading">{meta.ad_account_nome}</p>
            <p className="text-n-500">{meta.page_nome}{meta.ig_username ? ` · @${meta.ig_username}` : ''}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <button type="button" className={button('ghost', 'sm')} onClick={() => setEditando(true)}>Trocar</button>
            <button type="button" aria-label="Desvincular" title="Desvincular" disabled={pendente} className={button('ghost', 'sm')}
              onClick={() => start(async () => {
                const r = await desvincularMetaAction(id);
                if (!r.success) { error('Não deu', r.error ?? 'Tente de novo.'); return; }
                success('Desvinculada', 'O robô para de usar essa conta.');
                router.refresh();
              })}>
              <Unlink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <Campanhas id={id} meta={meta} criativos={criativos} enviado={enviado} />
      </div>
    );
  }

  if (!contas.length || !paginas.length) {
    return (
      <div className="space-y-1.5 min-w-[14rem]">
        <SituacaoRobo id={id} robo={robo} />
        <p className="text-caption text-n-500">Nada compartilhado com a Lume ainda. Ela faz o passo &quot;Acesso da Lume&quot; da aba.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 min-w-[14rem]">
      <SituacaoRobo id={id} robo={robo} />
      <div className="flex flex-wrap items-center gap-1.5">
        <select aria-label="Conta de anúncios" className={`${fieldSm} max-w-[12rem]`} value={conta} onChange={e => setConta(e.target.value)}>
          <option value="">Conta de anúncios…</option>
          {contas.map(c => <option key={c.id} value={c.id}>{c.nome}{c.detalhe ? ` (${c.detalhe})` : ''}</option>)}
        </select>
        <select aria-label="Página" className={`${fieldSm} max-w-[12rem]`} value={pagina} onChange={e => setPagina(e.target.value)}>
          <option value="">Página…</option>
          {paginas.map(p => <option key={p.id} value={p.id}>{p.nome}{p.detalhe ? ` (${p.detalhe})` : ''}</option>)}
        </select>
        <button type="button" disabled={pendente || !conta || !pagina} className={button('primary', 'sm')}
          onClick={() => start(async () => {
            const r = await vincularMetaAction(id, conta, pagina);
            if (!r.success) { error('Não deu', r.error ?? 'Tente de novo.'); return; }
            success('Vinculada', 'O robô já pode anunciar com essa conta e essa Página.');
            setEditando(false);
            router.refresh();
          })}>
          <Link2 className="h-3.5 w-3.5" /> Vincular
        </button>
        {meta && <button type="button" className={button('ghost', 'sm')} onClick={() => setEditando(false)}>Cancelar</button>}
      </div>
    </div>
  );
}

const ROTULO = { montar: 'Campanha montada (pausada)', ativar: 'No ar', pausar: 'Pausada', apagar: 'Campanha apagada' } as const;

/** Montar (sempre pausada) → conferir no Gerenciador → ativar. Pausar e apagar a qualquer momento. */
function Campanhas({ id, meta, criativos, enviado }: { id: string; meta: GrowthMeta; criativos: number; enviado: boolean }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [pendente, start] = useTransition();
  const campanhas = meta.campanhas ?? [];
  const ativa = campanhas.some(c => c.status === 'ativa');
  const rodar = (op: keyof typeof ROTULO, confirmar?: string) => {
    if (confirmar && !window.confirm(confirmar)) return;
    start(async () => {
      const r = await campanhaMetaAction(id, op);
      if (!r.success) { error('Não deu', r.error ?? 'Tente de novo.'); return; }
      success(ROTULO[op], op === 'montar' ? 'Confira no Gerenciador de Anúncios antes de ativar.' : 'Feito.');
      router.refresh();
    });
  };

  if (!campanhas.length) {
    if (!enviado) return <p className="text-caption text-n-500">Campanha: espera ela enviar a estruturação.</p>;
    return (
      <button type="button" disabled={pendente || !criativos} className={button('secondary', 'sm')} onClick={() => rodar('montar')}
        title={criativos ? `${criativos} criativo(s) salvos` : 'Ela precisa enviar para a equipe de novo (sem criativos salvos)'}>
        <Rocket className="h-3.5 w-3.5" /> {pendente ? 'Montando…' : 'Montar campanha (pausada)'}
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      {campanhas.map(c => (
        <p key={c.campaign_id} className="text-caption text-n-600 flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${c.status === 'ativa' ? 'bg-success' : 'bg-n-300'}`} />
          {c.funil === 'x1' ? 'WhatsApp' : 'Página'} · R$ {(c.verba_diaria_cents / 100).toFixed(2).replace('.', ',')}/dia · {c.ad_ids.length} anúncio(s) · {c.status}
          <a className="text-accent-link hover:underline inline-flex items-center gap-0.5" target="_blank" rel="noopener noreferrer"
            href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${meta.ad_account_id.replace(/^act_/, '')}&selected_campaign_ids=${c.campaign_id}`}>
            ver <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      ))}
      <div className="flex flex-wrap gap-1">
        {ativa
          ? <button type="button" disabled={pendente} className={button('secondary', 'sm')} onClick={() => rodar('pausar')}><Pause className="h-3.5 w-3.5" /> Pausar</button>
          : <button type="button" disabled={pendente} className={button('primary', 'sm')} onClick={() => rodar('ativar', 'Colocar no ar? A Meta começa a cobrar da conta de anúncios dela.')}><Play className="h-3.5 w-3.5" /> Ativar</button>}
        {!ativa && (
          <button type="button" disabled={pendente} aria-label="Apagar campanha" title="Apagar campanha" className={button('dangerGhost', 'sm')}
            onClick={() => rodar('apagar', 'Apagar as campanhas do robô na conta dela?')}><Trash2 className="h-3.5 w-3.5" /></button>
        )}
      </div>
    </div>
  );
}

export default MetaVinculo;

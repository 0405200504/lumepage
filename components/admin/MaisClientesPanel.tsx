import React from 'react';
import { Rocket, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Panel, Notice, KeyValue } from './primitives';
import { Badge } from './badges';
import { MaisClientesToggle } from './MaisClientesToggle';
import { ETAPAS, etapasConcluidas, brl } from '@/lib/mais-clientes/regras';
import { MIGRACAO } from '@/lib/mais-clientes/store';
import type { GrowthProgram } from '@/types/mais-clientes';

const CONDICAO: Record<string, string> = {
  combo: 'Combo', brinde: 'Brinde', avaliacao_gratis: 'Avaliação grátis', parcelamento: 'Parcelamento', desconto_primeira: 'Desconto 1ª visita',
};
const dataHora = (iso?: string | null) => iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

/** Aba "Mais clientes" no detalhe da conta: libera depois do pagamento e acompanha a jornada. */
export function MaisClientesPanel({ id, programa, disponivel, servicos }: {
  id: string;
  programa: GrowthProgram;
  disponivel: boolean;
  servicos: { id: string; name: string }[];
}) {
  if (!disponivel) {
    return <Notice tone="warn" icon={<AlertTriangle />}>Rode <code className="font-mono">{MIGRACAO}</code> no Supabase para ativar o &quot;Quero mais clientes&quot;.</Notice>;
  }
  const liberado = programa.status === 'liberado';
  const feitas = etapasConcluidas(programa);
  const nome = (sid: string) => servicos.find(s => s.id === sid)?.name ?? 'serviço removido';
  const i = programa.intake;
  const d = programa.diagnosis;
  const plano = programa.plan;

  return (
    <div className="space-y-4">
      <Panel
        title={<span className="flex items-center gap-2"><Rocket className="h-4 w-4 text-wine-700" /> Quero mais clientes</span>}
        note={liberado ? `Liberado em ${dataHora(programa.unlocked_at)} por ${programa.unlocked_by ?? '—'}` : 'Bloqueado: a profissional vê a vitrine e o botão de agendar a call.'}
        action={<MaisClientesToggle id={id} liberado={liberado} />}
      >
        <div className="px-5 pb-5 grid gap-2 sm:grid-cols-4">
          {ETAPAS.map((e, k) => (
            <div key={e.id} className={`rounded-chip p-3 ${feitas[e.id] ? 'bg-success-bg' : 'bg-surface-2'}`}>
              <p className="text-caption text-n-500">Etapa {k + 1}</p>
              <p className="text-body-sm font-semibold text-heading flex items-center gap-1.5">{feitas[e.id] && <CheckCircle2 className="h-4 w-4 text-success" />}{e.titulo}</p>
            </div>
          ))}
        </div>
      </Panel>

      {liberado && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Seu negócio" note={i.concluido_em ? `Concluído em ${dataHora(i.concluido_em)}` : 'Ainda não concluiu'}>
            <dl className="px-5 pb-4">
              <KeyValue label="Serviços em foco">{(i.servicos_foco ?? []).map(nome).join(', ') || '—'}</KeyValue>
              <KeyValue label="Prioridade">{i.servico_prioritario ? nome(i.servico_prioritario) : '—'}</KeyValue>
              <KeyValue label="Instagram">{i.instagram || '—'}</KeyValue>
              <KeyValue label="Cidade">{[i.cidade, i.uf].filter(Boolean).join(' - ') || '—'}</KeyValue>
              <KeyValue label="Aceita oferecer">{(i.condicoes ?? []).map(c => CONDICAO[c] ?? c).join(', ') || 'nada marcado'}{i.brinde ? ` (brinde: ${i.brinde})` : ''}</KeyValue>
              <KeyValue label="Diferenciais">{i.diferenciais || '—'}</KeyValue>
              <KeyValue label="Cliente ideal">{i.cliente_ideal || '—'}</KeyValue>
            </dl>
          </Panel>

          <Panel title="Fotos, diagnóstico e acesso">
            <dl className="px-5 pb-4">
              <KeyValue label="Fotos enviadas">{programa.assets.filter(a => a.slot !== 'video').length} fotos · {programa.assets.filter(a => a.slot === 'video').length} vídeos</KeyValue>
              <KeyValue label="Instagram">{d?.instagram ? `${d.instagram.nota.toLocaleString('pt-BR')}/10 · ${d.instagram.itens.filter(x => x.feito).length} ajustes feitos` : 'sem diagnóstico'}</KeyValue>
              <KeyValue label="Google">{d?.google ? `${d.google.nota.toLocaleString('pt-BR')}/10 · ${d.google.itens.filter(x => x.feito).length} ajustes feitos` : 'sem diagnóstico'}</KeyValue>
              <KeyValue label="Parceira na Meta">{d?.conexoes?.meta_parceira ? <Badge tone="ok">ela confirmou</Badge> : <Badge tone="warn">pendente</Badge>}</KeyValue>
              <KeyValue label="Gerente no Google">{d?.conexoes?.google_gerente ? <Badge tone="ok">ela confirmou</Badge> : <Badge tone="warn">pendente</Badge>}</KeyValue>
            </dl>
            {programa.assets.some(a => a.url && a.slot !== 'video') && (
              <div className="px-5 pb-5 flex gap-2 overflow-x-auto">
                {programa.assets.filter(a => a.url && a.slot !== 'video').map(a => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={a.id} src={a.url} alt={a.slot} title={`${a.slot}${a.service_id ? ` · ${nome(a.service_id)}` : ''}`} className="h-20 w-16 object-cover rounded-md shrink-0" />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Canal de clientes" note={plano?.enviado_em ? `Enviado para a equipe em ${dataHora(plano.enviado_em)}` : 'Ainda não enviou para a equipe'} className="lg:col-span-2">
            <div className="px-5 pb-5 grid gap-4 lg:grid-cols-[2fr_1fr]">
              <ul className="space-y-2">
                {(plano?.ofertas ?? []).map(o => (
                  <li key={o.service_id} className="rounded-chip bg-surface-2 p-3 text-body-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-heading">{o.titulo}</span>
                      {o.aprovada ? <Badge tone="ok">aprovada</Badge> : <Badge tone="neutral">sugerida</Badge>}
                    </div>
                    <p className="text-caption text-n-600 mt-0.5">{o.detalhe} · preço de hoje {brl(o.preco_atual_cents)}</p>
                  </li>
                ))}
                {!plano?.ofertas?.length && <li className="text-body-sm text-n-500">Nenhuma oferta montada ainda.</li>}
              </ul>
              <dl>
                <KeyValue label="Verba">{plano ? `${brl(plano.verba_semanal * 100)}/semana` : '—'}</KeyValue>
                <KeyValue label="Pode subir até">{plano ? `${brl(plano.teto_automatico * 100)}/semana` : '—'}</KeyValue>
                <KeyValue label="Raio">{plano ? `${plano.raio_km} km` : '—'}</KeyValue>
                <KeyValue label="Funil">{plano ? (plano.funil === 'x1' ? 'Só WhatsApp' : 'WhatsApp + página') : '—'}</KeyValue>
                <KeyValue label="Bot do X1">{plano?.x1_aplicado_em ? `aplicado ${dataHora(plano.x1_aplicado_em)}` : 'não aplicado'}</KeyValue>
              </dl>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

export default MaisClientesPanel;

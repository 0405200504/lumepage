'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { BadgePercent, Check, MessageCircle, Megaphone, Send, Sparkles, Wand2, Pencil, Undo2, CheckCircle2, Bot } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import {
  gerarOfertasAction, salvarOfertaAction, salvarVerbaAction, aplicarX1Action, enviarParaEquipeAction,
} from '@/app/actions/mais-clientes';
import { brl, raioPadrao, VERBA_MINIMA, VERBA_FUNIL_DUPLO, funilPara, normalizarVerba } from '@/lib/mais-clientes/regras';
import { montarRoteiroX1 } from '@/lib/mais-clientes/x1';
import type { GrowthPlan, OfertaPlano } from '@/types/mais-clientes';
import type { PropsEtapa } from './Jornada';
import { Criativo, fotosDoServico, moldesPossiveis } from './Criativos';

const dataBR = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

function CartaoOferta({ oferta, onSalvar }: { oferta: OfertaPlano; onSalvar: (e: { titulo: string; detalhe: string; preco_oferta_cents: number | null; aprovada: boolean }) => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(oferta.titulo);
  const [detalhe, setDetalhe] = useState(oferta.detalhe);
  const [preco, setPreco] = useState(oferta.preco_oferta_cents != null ? String(oferta.preco_oferta_cents / 100) : '');
  const [pendente, start] = useTransition();
  const salvar = (aprovada: boolean) => start(async () => {
    await onSalvar({ titulo, detalhe, preco_oferta_cents: preco.trim() ? Math.round(Number(preco.replace(',', '.')) * 100) : null, aprovada });
    setEditando(false);
  });

  return (
    <article className={`rounded-card ring-1 ring-inset p-5 ${oferta.aprovada ? 'ring-success-border bg-success-bg/40' : 'ring-line'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption font-semibold text-n-500">{oferta.servico} · hoje {brl(oferta.preco_atual_cents)}</p>
        {oferta.aprovada && <span className="text-caption font-semibold text-success flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Aprovada</span>}
      </div>
      {editando ? (
        <div className="mt-3 space-y-3">
          <Field label="Oferta" inputProps={{ value: titulo, onChange: e => setTitulo(e.target.value), maxLength: 120 }} />
          <Field label="Detalhe" inputProps={{ value: detalhe, onChange: e => setDetalhe(e.target.value), maxLength: 200 }} />
          <Field label="Preço no anúncio (R$)" hint="Deixe vazio para usar o seu preço de sempre." inputProps={{ value: preco, onChange: e => setPreco(e.target.value), inputMode: 'decimal' }} />
        </div>
      ) : (
        <>
          <h3 className="mt-2 text-h3 text-heading">{oferta.titulo}</h3>
          <p className="mt-1 text-body-sm text-n-700">{oferta.detalhe}</p>
        </>
      )}
      <p className="mt-3 text-caption text-n-500">{oferta.justificativa}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {editando ? (
          <>
            <Button size="sm" onClick={() => salvar(true)} loading={pendente} leadingIcon={<Check className="h-4 w-4" />}>Salvar e aprovar</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditando(false)}>Cancelar</Button>
          </>
        ) : oferta.aprovada ? (
          <>
            <Button size="sm" variant="secondary" onClick={() => setEditando(true)} leadingIcon={<Pencil className="h-4 w-4" />}>Editar</Button>
            <Button size="sm" variant="ghost" onClick={() => salvar(false)} loading={pendente} leadingIcon={<Undo2 className="h-4 w-4" />}>Desaprovar</Button>
          </>
        ) : (
          <>
            <Button size="sm" onClick={() => salvar(true)} loading={pendente} leadingIcon={<Check className="h-4 w-4" />}>Aprovar</Button>
            <Button size="sm" variant="secondary" onClick={() => setEditando(true)} leadingIcon={<Pencil className="h-4 w-4" />}>Ajustar</Button>
          </>
        )}
      </div>
    </article>
  );
}

export function EtapaEstrutura({ professionalId, programa, setPrograma, negocio }: PropsEtapa) {
  const { success, error } = useToast();
  const [pendente, start] = useTransition();
  const plano = programa.plan;
  const setPlano = (plan: GrowthPlan) => setPrograma(p => ({ ...p, plan }));
  const ofertas = useMemo(() => plano?.ofertas ?? [], [plano]);
  const aprovadas = ofertas.filter(o => o.aprovada);

  const raioInicial = programa.intake.raio_km ?? raioPadrao(programa.intake.cidade || negocio.cidade);
  const [verba, setVerba] = useState(String(plano?.verba_semanal ?? 100));
  const [teto, setTeto] = useState(String(plano?.teto_automatico ?? 200));
  const [raio, setRaio] = useState(String(plano?.raio_km ?? raioInicial));
  const verbaNum = normalizarVerba(verba);
  const funil = funilPara(verbaNum);

  const roteiro = useMemo(() => montarRoteiroX1({ nome: negocio.nome, linkAgendamento: negocio.linkAgendamento, ofertas }), [negocio, ofertas]);

  const rodar = (fn: () => Promise<{ success: true; plan: GrowthPlan } | { success: false; error: string }>, ok?: string) => start(async () => {
    const r = await fn();
    if (!r.success) { error('Não deu', r.error); return; }
    setPlano(r.plan);
    if (ok) success(ok, 'Tudo salvo.');
  });

  const cidade = programa.intake.cidade || negocio.cidade;
  const uf = programa.intake.uf || negocio.uf;
  const instagram = programa.intake.instagram || negocio.instagram;

  return (
    <div className="space-y-6">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-h3 text-heading flex items-center gap-2"><BadgePercent className="h-5 w-5 text-wine-700" /> Ofertas para os seus serviços</h2>
            <p className="mt-1 text-body-sm text-n-600 max-w-2xl">Montadas com o que você aceitou oferecer e comparadas com o preço que o mercado anuncia. Nada vai ao ar sem você aprovar.</p>
          </div>
          <Button variant={ofertas.length ? 'secondary' : 'primary'} loading={pendente} onClick={() => rodar(() => gerarOfertasAction(professionalId), 'Ofertas prontas')} leadingIcon={<Wand2 className="h-4 w-4" />}>
            {ofertas.length ? 'Sugerir de novo' : 'Montar minhas ofertas'}
          </Button>
        </div>
        {ofertas.length > 0 && (
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {ofertas.map(o => (
              <CartaoOferta key={`${o.service_id}-${o.titulo}-${o.aprovada}`} oferta={o}
                onSalvar={async e => { const r = await salvarOfertaAction(professionalId, o.service_id, e); if (!r.success) error('Não deu', r.error); else setPlano(r.plan); }} />
            ))}
          </div>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="text-h3 text-heading flex items-center gap-2"><Sparkles className="h-5 w-5 text-wine-700" /> Seus criativos</h2>
        <p className="mt-1 text-body-sm text-n-600 max-w-3xl">Montados nos formatos que estão há meses no ar no seu nicho, com as suas fotos reais e a oferta que você aprovou.</p>
        {!aprovadas.length ? (
          <p className="mt-4 text-body-sm text-n-500">Aprove pelo menos uma oferta para ver os criativos.</p>
        ) : (
          <div className="mt-5 space-y-8">
            {aprovadas.map(o => {
              const dados = { oferta: o, cidade, uf, instagram, fotos: fotosDoServico(programa.assets, o.service_id) };
              const moldes = moldesPossiveis(dados);
              return (
                <div key={o.service_id}>
                  <p className="text-body-sm font-semibold text-heading">{o.servico}</p>
                  {moldes.length ? (
                    <div className="mt-3 flex gap-5 overflow-x-auto pb-2">
                      {moldes.map(m => <Criativo key={m.id} molde={m} dados={dados} />)}
                    </div>
                  ) : (
                    <p className="mt-2 text-body-sm text-n-500">Faltam fotos desse serviço (antes e depois ou um close do resultado) para montar os criativos.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-h3 text-heading flex items-center gap-2"><MessageCircle className="h-5 w-5 text-wine-700" /> Seu funil no WhatsApp</h2>
            <p className="mt-1 text-body-sm text-n-600 max-w-2xl">A cliente toca no anúncio, cai no seu WhatsApp com a mensagem pronta e o atendimento do Lume conduz até o horário marcado.</p>
          </div>
          <Button variant={plano?.x1_aplicado_em ? 'secondary' : 'primary'} disabled={!aprovadas.length} loading={pendente}
            onClick={() => rodar(() => aplicarX1Action(professionalId), 'Regras aplicadas no seu atendimento')} leadingIcon={<Bot className="h-4 w-4" />}>
            {plano?.x1_aplicado_em ? 'Aplicar de novo' : 'Aplicar no meu atendimento'}
          </Button>
        </div>
        {plano?.x1_aplicado_em && <p className="mt-3 text-caption text-success flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Aplicado em {dataBR(plano.x1_aplicado_em)}</p>}
        <ol className="mt-5 grid gap-3 md:grid-cols-5">
          {roteiro.passos.map((p, i) => (
            <li key={p.titulo} className="rounded-card bg-n-50 p-4">
              <span className="text-caption font-semibold text-wine-700">{i + 1}</span>
              <p className="mt-1 text-body-sm font-semibold text-heading">{p.titulo}</p>
              <p className="mt-1 text-caption text-n-600 leading-snug">{p.texto}</p>
            </li>
          ))}
        </ol>
        {roteiro.mensagens.length > 0 && (
          <div className="mt-4">
            <p className="text-caption font-semibold text-n-500">Mensagem que já vem escrita quando ela toca no anúncio</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {roteiro.mensagens.map(m => <li key={m.servico} className="rounded-2xl rounded-bl-sm bg-[#dcf8c6] text-[#111] px-3.5 py-2 text-body-sm">{m.texto}</li>)}
            </ul>
          </div>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="text-h3 text-heading flex items-center gap-2"><Megaphone className="h-5 w-5 text-wine-700" /> Verba e alcance</h2>
        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <Field label="Quanto quer investir em anúncios por semana? (R$)" hint={`Mínimo R$ ${VERBA_MINIMA}, sem máximo. A verba é paga à parte da assessoria.`}>
              <div className="flex items-center gap-3">
                <input type="range" min={VERBA_MINIMA} max={1000} step={10} value={Math.min(1000, verbaNum)} onChange={e => setVerba(e.target.value)} className="flex-1 accent-[var(--color-wine-700)]" />
                <input className="field-input w-28" inputMode="numeric" value={verba} onChange={e => setVerba(e.target.value.replace(/\D/g, ''))} />
              </div>
            </Field>
            <Field label="Até quanto a verba pode subir sozinha? (R$ por semana)" hint="Quando os agendamentos vão saindo e a agenda tem espaço, o orçamento sobe até aqui sem te perguntar. Acima disso, você aprova.">
              <input className="field-input" inputMode="numeric" value={teto} onChange={e => setTeto(e.target.value.replace(/\D/g, ''))} />
            </Field>
            <Field label="Raio dos anúncios (km)" hint={`Sugestão para ${cidade || 'sua cidade'}: ${raioPadrao(cidade)} km.`}>
              <input className="field-input" inputMode="numeric" value={raio} onChange={e => setRaio(e.target.value.replace(/\D/g, ''))} />
            </Field>
            <Button variant="secondary" loading={pendente} onClick={() => rodar(() => salvarVerbaAction(professionalId, { verba_semanal: verbaNum, teto_automatico: Number(teto), raio_km: Number(raio) }), 'Verba salva')}>Salvar verba</Button>
          </div>
          <div className="rounded-card bg-n-50 p-5 text-body-sm text-n-700 space-y-3">
            <p className="text-heading font-semibold">Com {brl(verbaNum * 100)} por semana</p>
            <p>
              {funil === 'x1'
                ? `Começamos só pelo WhatsApp: com menos de R$ ${VERBA_FUNIL_DUPLO} por semana, dividir a verba deixa cada anúncio sem dado para aprender.`
                : 'Dá para testar os dois caminhos ao mesmo tempo: o WhatsApp e a sua página de agendamento. A verba vai para o que trouxer cliente mais barato.'}
            </p>
            <p>Conforme os agendamentos vão saindo, o orçamento sobe até o teto que você definiu. Semana cheia, o anúncio desacelera: quem manda é a sua agenda ({negocio.agendaVaga.total} horários livres nos próximos 7 dias).</p>
            <p>Os anúncios aparecem para quem está a até {Number(raio) || raioInicial} km de você.</p>
          </div>
        </div>
      </section>

      <section className="surface-wine rounded-hero text-white p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
        {plano?.enviado_em ? (
          <p className="text-body font-semibold flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Recebemos tudo em {dataBR(plano.enviado_em)}. A equipe Lume coloca no ar e te avisa por aqui.</p>
        ) : (
          <>
            <div>
              <p className="text-body font-semibold">Tudo certo? Mande para a equipe colocar no ar.</p>
              <p className="text-body-sm text-white/80">{aprovadas.length} oferta(s) aprovada(s) · {plano?.x1_aplicado_em ? 'WhatsApp pronto' : 'WhatsApp ainda não aplicado'} · {brl(verbaNum * 100)} por semana</p>
            </div>
            <button type="button" disabled={pendente || !aprovadas.length || !plano?.verba_semanal}
              onClick={() => rodar(() => enviarParaEquipeAction(professionalId), 'Enviado para a equipe')}
              className="inline-flex items-center gap-2 rounded-pill bg-white text-wine-800 font-semibold px-6 py-3 disabled:opacity-60 hover:bg-wine-50 transition-ui">
              <Send className="h-4 w-4" /> Enviar para a equipe
            </button>
          </>
        )}
      </section>
    </div>
  );
}

export default EtapaEstrutura;

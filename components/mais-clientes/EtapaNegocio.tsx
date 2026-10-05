'use client';

import React, { useState, useTransition } from 'react';
import { CalendarClock, MapPin, Link2, Smartphone } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { salvarNegocioAction } from '@/app/actions/mais-clientes';
import { brl, raioPadrao, RAIO_CIDADE_GRANDE, RAIO_INTERIOR } from '@/lib/mais-clientes/regras';
import type { CondicaoOferta, GrowthIntake } from '@/types/mais-clientes';
import type { PropsEtapa } from './Jornada';

const CONDICOES: { id: CondicaoOferta; titulo: string; texto: string }[] = [
  { id: 'combo', titulo: 'Combo', texto: 'Juntar dois serviços com um preço especial' },
  { id: 'brinde', titulo: 'Brinde', texto: 'Um mimo de custo baixo na primeira visita' },
  { id: 'avaliacao_gratis', titulo: 'Avaliação gratuita', texto: 'Para procedimentos em que a cliente quer conhecer antes' },
  { id: 'parcelamento', titulo: 'Parcelamento', texto: 'Para serviços de valor mais alto' },
  { id: 'desconto_primeira', titulo: 'Desconto na 1ª visita', texto: 'Só para cliente nova, sem mexer no preço de quem já é sua cliente' },
];

const diaCurto = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }).replace('.', '');

export function EtapaNegocio({ professionalId, programa, setPrograma, negocio, avancar }: PropsEtapa) {
  const { success, error } = useToast();
  const [pendente, start] = useTransition();
  const i = programa.intake;
  const [f, setF] = useState<Partial<GrowthIntake>>(() => ({
    servicos_foco: i.servicos_foco?.length ? i.servicos_foco : negocio.top3,
    servico_prioritario: i.servico_prioritario ?? negocio.top3[0] ?? null,
    instagram: i.instagram ?? negocio.instagram ?? '',
    google_link: i.google_link ?? '',
    whatsapp: i.whatsapp ?? negocio.whatsapp ?? '',
    cidade: i.cidade ?? negocio.cidade ?? '',
    uf: i.uf ?? negocio.uf ?? '',
    raio_km: i.raio_km ?? null,
    domicilio: i.domicilio ?? false,
    diferenciais: i.diferenciais ?? '',
    cliente_ideal: i.cliente_ideal ?? '',
    condicoes: i.condicoes ?? ['combo', 'brinde'],
    brinde: i.brinde ?? '',
    observacoes: i.observacoes ?? '',
  }));
  const set = <K extends keyof GrowthIntake>(k: K, v: GrowthIntake[K]) => setF(x => ({ ...x, [k]: v }));
  const foco = f.servicos_foco ?? [];
  const raioAuto = raioPadrao(f.cidade);

  const alternarServico = (id: string) => {
    const novo = foco.includes(id) ? foco.filter(x => x !== id) : foco.length < 3 ? [...foco, id] : foco;
    setF(x => ({ ...x, servicos_foco: novo, servico_prioritario: novo.includes(x.servico_prioritario ?? '') ? x.servico_prioritario : novo[0] ?? null }));
  };
  const alternarCondicao = (c: CondicaoOferta) => {
    const atual = f.condicoes ?? [];
    set('condicoes', atual.includes(c) ? atual.filter(x => x !== c) : [...atual, c]);
  };

  const salvar = (concluir: boolean) => start(async () => {
    const res = await salvarNegocioAction(professionalId, f, concluir);
    if (!res.success) { error('Não deu', res.error); return; }
    setPrograma(p => ({ ...p, intake: res.intake }));
    success(concluir ? 'Pronto, etapa concluída' : 'Salvo', concluir ? 'Agora as fotos.' : 'Você pode continuar depois.');
    if (concluir) avancar();
  });

  const maxLivres = Math.max(1, ...negocio.agendaVaga.dias.map(d => d.livres));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem] items-start">
      <div className="space-y-6">
        <section className="card p-5 sm:p-6">
          <h2 className="text-h3 text-heading">Em quais serviços vamos trabalhar?</h2>
          <p className="mt-1 text-body-sm text-n-600">Já marcamos os 3 que mais faturaram nos últimos 90 dias. Troque se quiser (até 3).</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {negocio.servicos.map(s => {
              const marcado = foco.includes(s.id);
              return (
                <label key={s.id} className={`flex items-start gap-3 rounded-card p-3.5 cursor-pointer transition-ui ring-1 ring-inset ${marcado ? 'bg-wine-50 ring-wine-200' : 'ring-line hover:bg-n-50'}`}>
                  <input type="checkbox" className="mt-1 accent-[var(--color-wine-700)]" checked={marcado} onChange={() => alternarServico(s.id)} disabled={!marcado && foco.length >= 3} />
                  <span className="min-w-0">
                    <span className="block text-body-sm font-semibold text-heading">{s.name}</span>
                    <span className="block text-caption text-n-500">
                      {brl(s.price_cents)} · {s.faturamento_cents ? `${brl(s.faturamento_cents)} em 90 dias` : 'sem atendimentos em 90 dias'}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {foco.length > 1 && (
            <Field label="Qual você mais quer encher?" className="mt-5">
              <select className="field-input" value={f.servico_prioritario ?? ''} onChange={e => set('servico_prioritario', e.target.value)}>
                {foco.map(id => <option key={id} value={id}>{negocio.servicos.find(s => s.id === id)?.name}</option>)}
              </select>
            </Field>
          )}
        </section>

        <section className="card p-5 sm:p-6 space-y-4">
          <h2 className="text-h3 text-heading">Seus canais</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Instagram" hint="O @ do perfil do seu trabalho" inputProps={{ value: f.instagram ?? '', onChange: e => set('instagram', e.target.value), placeholder: '@seuperfil' }} />
            <Field label="WhatsApp de atendimento" inputProps={{ value: f.whatsapp ?? '', onChange: e => set('whatsapp', e.target.value), inputMode: 'tel' }} />
            <Field label="Link do seu Perfil da Empresa no Google" hint="Se não souber, deixe em branco: o diagnóstico usa o print." className="sm:col-span-2" inputProps={{ value: f.google_link ?? '', onChange: e => set('google_link', e.target.value), placeholder: 'https://maps.app.goo.gl/...' }} />
            <Field label="Cidade" inputProps={{ value: f.cidade ?? '', onChange: e => set('cidade', e.target.value) }} />
            <div className="grid grid-cols-[5rem_1fr] gap-3">
              <Field label="UF" inputProps={{ value: f.uf ?? '', onChange: e => set('uf', e.target.value.toUpperCase().slice(0, 2)) }} />
              <Field label="Raio dos anúncios" hint={`Automático: ${raioAuto} km (${raioAuto === RAIO_CIDADE_GRANDE ? 'cidade grande' : 'interior'})`}>
                <select className="field-input" value={f.raio_km ?? ''} onChange={e => set('raio_km', e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Automático ({raioAuto} km)</option>
                  {[5, 10, RAIO_INTERIOR, 20, RAIO_CIDADE_GRANDE, 30, 40].filter((v, k, a) => a.indexOf(v) === k).map(k => <option key={k} value={k}>{k} km</option>)}
                </select>
              </Field>
            </div>
          </div>
          <label className="flex items-center gap-3 text-body-sm text-heading">
            <input type="checkbox" className="accent-[var(--color-wine-700)]" checked={!!f.domicilio} onChange={e => set('domicilio', e.target.checked)} />
            Também atendo a domicílio
          </label>
        </section>

        <section className="card p-5 sm:p-6 space-y-4">
          <h2 className="text-h3 text-heading">O que te faz diferente</h2>
          <Field label="Seus diferenciais" hint="Ex.: técnica que você domina, anos de experiência, número de atendimentos, nota no Google, brinde, conforto do espaço.">
            <textarea className="field-input min-h-24" value={f.diferenciais ?? ''} onChange={e => set('diferenciais', e.target.value)} maxLength={500} />
          </Field>
          <Field label="Quem é a sua cliente ideal?" hint="Idade, rotina, o que ela busca. Ex.: mulheres de 25 a 45 que trabalham fora e querem praticidade.">
            <textarea className="field-input min-h-20" value={f.cliente_ideal ?? ''} onChange={e => set('cliente_ideal', e.target.value)} maxLength={300} />
          </Field>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="text-h3 text-heading">O que você aceita oferecer para cliente nova?</h2>
          <p className="mt-1 text-body-sm text-n-600">A gente monta a oferta só com o que você marcar aqui, e nada vai ao ar sem você aprovar.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {CONDICOES.map(c => {
              const marcado = (f.condicoes ?? []).includes(c.id);
              return (
                <label key={c.id} className={`flex items-start gap-3 rounded-card p-3.5 cursor-pointer transition-ui ring-1 ring-inset ${marcado ? 'bg-wine-50 ring-wine-200' : 'ring-line hover:bg-n-50'}`}>
                  <input type="checkbox" className="mt-1 accent-[var(--color-wine-700)]" checked={marcado} onChange={() => alternarCondicao(c.id)} />
                  <span><span className="block text-body-sm font-semibold text-heading">{c.titulo}</span><span className="block text-caption text-n-500">{c.texto}</span></span>
                </label>
              );
            })}
          </div>
          {(f.condicoes ?? []).includes('brinde') && (
            <Field label="Qual brinde?" className="mt-4" hint="Algo de custo baixo para você. Ex.: hidratação labial, esmaltação simples, spa dos pés."
              inputProps={{ value: f.brinde ?? '', onChange: e => set('brinde', e.target.value), maxLength: 80 }} />
          )}
          <Field label="Quer contar mais alguma coisa?" className="mt-4">
            <textarea className="field-input min-h-20" value={f.observacoes ?? ''} onChange={e => set('observacoes', e.target.value)} maxLength={800} />
          </Field>
        </section>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => salvar(false)} loading={pendente}>Salvar e continuar depois</Button>
          <Button onClick={() => salvar(true)} loading={pendente}>Concluir esta etapa</Button>
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-6">
        <section className="card p-5">
          <h3 className="text-body-sm font-semibold text-heading flex items-center gap-2"><CalendarClock className="h-4 w-4 text-wine-700" /> Sua agenda vaga</h3>
          <p className="mt-1 text-caption text-n-500">Vem direto da sua agenda no Lume, considerando atendimentos de {negocio.agendaVaga.duracaoBase} min.</p>
          <p className="mt-3 text-h2 text-heading">{negocio.agendaVaga.total} <span className="text-body-sm font-medium text-n-600">horários livres nos próximos 7 dias</span></p>
          <div className="mt-4 flex items-end gap-1.5 h-20" aria-hidden>
            {negocio.agendaVaga.dias.map(d => (
              <div key={d.data} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-md bg-wine-200" style={{ height: `${Math.max(4, (d.livres / maxLivres) * 64)}px` }} title={`${d.livres} livres`} />
                <span className="text-micro text-n-500">{diaCurto(d.data)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-caption text-n-600">Os anúncios desaceleram quando a semana enche.</p>
        </section>
        <section className="card p-5 space-y-3 text-body-sm">
          <h3 className="font-semibold text-heading">O Lume já sabe</h3>
          <p className="flex items-center gap-2 text-n-700"><MapPin className="h-4 w-4 text-n-400" /> {negocio.cidade || 'Cidade não cadastrada'}{negocio.uf ? ` - ${negocio.uf}` : ''}</p>
          <p className="flex items-center gap-2 text-n-700"><Smartphone className="h-4 w-4 text-n-400" /> {negocio.whatsapp || 'WhatsApp não cadastrado'}</p>
          <p className="flex items-center gap-2 text-n-700 break-all"><Link2 className="h-4 w-4 shrink-0 text-n-400" /> {negocio.linkAgendamento || 'Sem link de agendamento'}</p>
          <p className="text-caption text-n-500">Serviços e preços também vêm do seu cadastro. Mudou algo? Ajuste na aba Serviços.</p>
        </section>
      </aside>
    </div>
  );
}

export default EtapaNegocio;

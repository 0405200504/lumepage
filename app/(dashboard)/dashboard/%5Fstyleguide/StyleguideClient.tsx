'use client';

import React, { useState } from 'react';
import { Pencil, Trash2, Plus, Search, Calendar, Send, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/StatusPill';
import { StatusDot, StatusLabel } from '@/components/ui/StatusDot';
import { MonoLabel, MonoValue, MonoTrail } from '@/components/ui/Mono';
import { Segmented } from '@/components/ui/Segmented';
import { Field, Toggle, SettingsSection } from '@/components/ui/Field';
import { TechTable } from '@/components/ui/TechTable';
import { IndexGrid } from '@/components/ui/IndexGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { TechChart } from '@/components/ui/charts/TechChart';
import { PageHeader } from '@/components/ui/PageHeader';
import { TimeRuler } from '@/components/ui/TimeRuler';
import { Bubble, DateDivider, Composer, Thread } from '@/components/ui/Conversation';

/* ─────────────────────────────────────────────────────────
   A numeração é uma sequência única de 01 a 13, na ordem em
   que a página apresenta: primeiro as cinco alavancas da
   linguagem (01–05), depois o botão (06), depois os SEIS
   arquétipos em ordem (07–12) e por fim os estados (13).
   ───────────────────────────────────────────────────────── */
const Section: React.FC<{ n: string; title: string; note?: string; children: React.ReactNode }> = ({
  n, title, note, children,
}) => (
  <section className="scroll-mt-24">
    <div className="flex items-baseline gap-3 border-b border-line pb-3 mb-6">
      <span className="mono-micro text-wine-700">{n}</span>
      <h2 className="text-h3 text-heading">{title}</h2>
    </div>
    {note && <p className="text-body-sm text-n-600 max-w-2xl mb-5">{note}</p>}
    {children}
  </section>
);

const Swatch: React.FC<{ name: string; v: string; ratio?: string }> = ({ name, v, ratio }) => (
  <div className="min-w-0">
    <div className="h-12 rounded-badge border border-line" style={{ background: `var(${v})` }} />
    <p className="mono-micro mt-1.5 truncate text-n-600">{name}</p>
    {ratio && <p className="mono-micro text-n-400 truncate">{ratio}</p>}
  </div>
);

type Row = { id: string; nome: string; dur: number; valor: number; visivel: boolean; status: 'ativo' | 'inativo' | 'rascunho' };
const ROWS: Row[] = [
  { id: '1', nome: 'Limpeza de pele profunda', dur: 90, valor: 220, visivel: true, status: 'ativo' },
  { id: '2', nome: 'Design de sobrancelha', dur: 30, valor: 70, visivel: true, status: 'ativo' },
  { id: '3', nome: 'Peeling de diamante', dur: 60, valor: 180, visivel: false, status: 'rascunho' },
  { id: '4', nome: 'Massagem modeladora', dur: 50, valor: 150, visivel: true, status: 'inativo' },
];
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Estado :hover congelado, só para a grade de demonstração desta página.
 *  Vai em `style` porque classe utilitária não vence a da variante — o
 *  Tailwind resolve por ordem no CSS, não por ordem no atributo class. */
const HOVER_STYLE: Record<string, React.CSSProperties> = {
  primary:     { background: 'var(--color-wine-800)' },
  secondary:   { background: 'var(--color-n-50)', borderColor: 'var(--color-line-strong)' },
  ghost:       { background: 'var(--color-n-100)', color: 'var(--color-heading)' },
  destructive: { background: 'var(--color-danger)', color: '#fff', borderColor: 'var(--color-danger)' },
};

export function StyleguideClient() {
  const [seg, setSeg] = useState<'dia' | 'semana' | 'mes' | 'ano'>('semana');
  const [tog, setTog] = useState(true);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-12">
      <PageHeader
        trail={['Styleguide', 'Rodada 4', 'SaaS claro e macio']}
        title="Linguagem visual"
        description="Todos os primitivos lado a lado. Isto é o que se valida antes de multiplicar por 16 rotas."
        actions={<Button size="sm" leadingIcon={<Plus className="h-4 w-4" />}>Ação primária</Button>}
      />

      {/* ── 01 · COR ─────────────────────────────────────── */}
      <Section
        n="01"
        title="Cor"
        note="Neutros em cinza QUENTE — o grafite azulado da rodada anterior puxava a interface para painel de servidor. O vinho da marca não mudou. --signal deixou de ser um coral próprio e passou a ser wine-500: uma segunda cor quente competindo com a marca se lia como erro."
      >
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 mb-6">
          {['n-0', 'n-25', 'n-100', 'n-150', 'n-200', 'n-300', 'n-400',
            'n-500', 'n-600', 'n-700', 'n-800', 'n-900', 'n-950'].map((k) => (
            <Swatch key={k} name={k} v={`--color-${k}`} />
          ))}
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 mb-6">
          <Swatch name="wine-50" v="--color-wine-50" />
          <Swatch name="wine-200" v="--color-wine-200" />
          <Swatch name="wine-600" v="--color-wine-600" ratio="link · 8.7:1" />
          <Swatch name="wine-700" v="--color-wine-700" ratio="MARCA · 11.9:1" />
          <Swatch name="signal" v="--color-signal" ratio="wine-500 · 5.6:1" />
          <Swatch name="signal-bg" v="--color-signal-bg" />
          <Swatch name="signal-ink" v="--color-signal-ink" ratio="texto · 8.7:1" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          <Swatch name="success" v="--color-success" ratio="5.2:1" />
          <Swatch name="warning" v="--color-warning" ratio="5.4:1" />
          <Swatch name="danger" v="--color-danger" ratio="5.1:1" />
          <Swatch name="info" v="--color-info" ratio="6.9:1" />
        </div>
        <Card className="mt-5 flex flex-wrap items-center gap-8">
          <div>
            <MonoLabel as="p">Onde --signal pode entrar</MonoLabel>
            <div className="flex items-center gap-4 mt-2">
              <span className="inline-flex items-center gap-1.5">
                <StatusDot tone="signal" /> <span className="text-caption text-n-600">ponto ao vivo</span>
              </span>
              <span className="text-h1 num text-[color:var(--color-signal)] leading-none">12</span>
              <span className="text-caption text-n-500">← número em foco</span>
            </div>
          </div>
          <div className="w-40">
            <MonoLabel as="p">Linha do agora</MonoLabel>
            <div className="mt-4 now-line" />
          </div>
          <div>
            <MonoLabel as="p">Anel de foco</MonoLabel>
            <p className="text-caption text-n-500 mt-1 max-w-xs">
              Sempre <code className="mono text-wine-700">--wine-700</code>, offset 2px, em
              qualquer elemento — inclusive no destrutivo e no campo com erro. Vermelho
              está reservado a significado, não a “onde estou”.
            </p>
          </div>
        </Card>
      </Section>

      {/* ── 02 · TIPOGRAFIA ──────────────────────────────── */}
      <Section
        n="02"
        title="Tipografia"
        note="UMA família: Plus Jakarta Sans, do micro-rótulo ao display. Eram três (Manrope, Instrument Sans e JetBrains Mono) e o resultado era uma tela em que o nome da cliente, o horário e o valor tinham esqueletos de letra diferentes. Hierarquia se faz com peso, tamanho e cor — nunca trocando de família. Número usa tabular-nums, que era a única coisa que a monoespaçada entregava de útil."
      >
        <Card className="divide-y divide-line">
          {[
            ['h1 · 30-36', <span key="a" className="text-h1 text-heading">Faturamento do mês</span>],
            ['h2 · 22', <span key="b" className="text-h2 text-heading">Serviços cadastrados</span>],
            ['h3 · 18', <span key="c" className="text-h3 text-heading">Limpeza de pele</span>],
            ['corpo · 15', <span key="d" className="text-body text-ink">A cliente confirmou o horário pelo WhatsApp.</span>],
            ['denso · 14', <span key="e" className="text-body-sm text-ink">Linha de tabela e rótulo de controle.</span>],
            ['caption · 12', <span key="f" className="text-caption text-n-600">Texto de apoio abaixo do campo.</span>],
            ['micro · 11', <span key="g" className="mono-micro text-n-500">Agenda · qui, 27 ago · 5 agendamentos</span>],
            ['overline · 11', <span key="i" className="overline text-n-500">Cabeçalho de seção</span>],
            ['dado tabular', <span key="h" className="mono text-ink">14:30 · 90min · #A7F2 · +12,4%</span>],
            ['dinheiro (sans + tabular)', <span key="i" className="num text-h2 font-semibold text-heading">R$ 12.480,00</span>],
          ].map(([label, el], i) => (
            <div key={i} className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-3 first:pt-0 last:pb-0">
              <MonoLabel className="w-52 shrink-0">{label as string}</MonoLabel>
              {el as React.ReactNode}
            </div>
          ))}
        </Card>
      </Section>

      {/* ── 03 · RAIOS E CHANFRO ─────────────────────────── */}
      <Section
        n="03"
        title="Raios e elevação"
        note="Geometria macia: 8 no selo, 12 no controle, 20 no card, 28 no hero, pílula no que é filtro ou ação. O chanfro a 45° foi aposentado junto com a direção que o criou. A sombra voltou — larga, rasa e quase incolor: é ela que faz o branco descolar do cinza sem precisar de traço."
      >
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[['badge', '8px'], ['chip', '12px'], ['surface', '20px'], ['hero', '28px'], ['pill', 'controle']].map(([n, v]) => (
            <div key={n} className="text-center">
              <div
                className="h-16 bg-wine-50"
                style={{ borderRadius: `var(--radius-${n})` }}
              />
              <p className="mono-micro text-n-600 mt-1.5">{n}</p>
              <p className="mono-micro text-n-400">{v}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3 items-start">
          {[
            ['xs / sm', 'var(--shadow-sm)', 'Card em repouso. Quase só um assentamento.'],
            ['md', 'var(--shadow-md)', 'Card sob o cursor, dropdown, tooltip.'],
            ['lg', 'var(--shadow-lg)', 'O que flutua de verdade: modal, sheet, rail aberto.'],
          ].map(([n, v, d]) => (
            <div key={n} className="bg-surface rounded-surface p-4" style={{ boxShadow: v }}>
              <MonoLabel>{n}</MonoLabel>
              <p className="text-body-sm text-ink mt-1">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 04 · LINHAS ──────────────────────────────────── */}
      <Section
        n="04"
        title="Superfícies e divisórias"
        note="A hierarquia é de LUZ, não de traço: fundo cinza, card branco, poço cinza-claro dentro do card, tinta quase preta no que ancora. Os cantos em L e os ticks de régua saíram — delimitavam sem estruturar e eram enfeite fingindo rigor. A linha sobrou para dividir DENTRO do card."
      >
        <div className="grid gap-4 sm:grid-cols-2 items-start">
          <div className="card p-5">
            <MonoLabel as="p">Três superfícies</MonoLabel>
            <div className="mt-4 space-y-2">
              <div className="h-10 rounded-chip bg-bg flex items-center px-3 text-caption text-n-600">--bg · fundo da aplicação</div>
              <div className="h-10 rounded-chip bg-surface shadow-[var(--shadow-sm)] flex items-center px-3 text-caption text-n-600">--surface · card</div>
              <div className="h-10 rounded-chip well flex items-center px-3 text-caption text-n-600">--surface-2 · poço (input, trilho)</div>
              <div className="h-10 rounded-chip surface-ink flex items-center px-3 text-caption">--ink-surface · o que ancora</div>
            </div>
          </div>

          <div className="card p-5 self-start">
            <MonoLabel as="p">Tracejado = previsto</MonoLabel>
            <p className="text-caption text-n-500 mt-1">
              É o único uso que sobrou do tracejado: receita prevista, slot livre.
              Ele saiu da moldura de estado vazio, que agora é superfície.
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-16 h-[2px] rounded-full bg-wine-700" />
                <span className="text-caption text-n-600">Receita realizada</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-16 border-t-2 border-dashed border-line-strong" />
                <span className="text-caption text-n-600">Receita prevista</span>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <MonoLabel as="p">Divisória de ponta a ponta</MonoLabel>
            <div className="mt-3 -mx-5">
              {['Confirmado', 'Aguardando', 'Cancelado'].map((t) => (
                <div key={t} className="px-5 py-3 border-b border-line last:border-b-0 text-body-sm text-ink">
                  {t}
                </div>
              ))}
            </div>
            <p className="text-caption text-n-500 mt-3">
              Dentro do card a linha atravessa inteiro (−mx do padding). Fora dele,
              o que separa é espaço.
            </p>
          </div>
        </div>
      </Section>

      {/* ── 05 · ÍCONES E STATUS ─────────────────────────── */}
      <Section
        n="05"
        title="Ícones e status"
        note="Traço 1.75 com ponta e junta ARREDONDADAS. A rodada anterior forçou 1.25 com ponta reta atrás de um ar de desenho de engenharia: em tela retina o traço sumia e o ângulo agudo virava farpa. O container é um disco de 36px em cinza-claro. Tamanhos 14 / 18 / 22."
      >
        <Card className="flex flex-wrap items-center gap-8">
          <div>
            <MonoLabel as="p" className="mb-3">Tamanhos</MonoLabel>
            <div className="flex items-end gap-4 text-n-700">
              <Calendar className="h-3.5 w-3.5" /><Calendar className="h-[18px] w-[18px]" /><Calendar className="h-[22px] w-[22px]" />
            </div>
            <p className="mono-micro text-n-400 mt-2">14 · 18 · 22</p>
          </div>
          <div>
            <MonoLabel as="p" className="mb-3">Container</MonoLabel>
            <div className="flex items-center gap-3">
              <span className="icon-chip"><Search className="h-4 w-4" /></span>
              <span className="icon-chip" data-accent="true"><Search className="h-4 w-4" /></span>
            </div>
            <p className="mono-micro text-n-400 mt-2">neutro · ativo · tinta</p>
          </div>
          <div>
            <MonoLabel as="p" className="mb-3">Os quatro estados</MonoLabel>
            <div className="flex flex-wrap items-center gap-4">
              <StatusLabel tone="success">Confirmado</StatusLabel>
              <StatusLabel tone="warning">Aguardando</StatusLabel>
              <StatusLabel tone="danger">Cancelado</StatusLabel>
              <StatusLabel tone="neutral">Rascunho</StatusLabel>
              <StatusLabel tone="signal" live>Ao vivo</StatusLabel>
            </div>
            <p className="mono-micro text-n-400 mt-2.5">pílula suave: ponto de 6px + rótulo, 26px de altura</p>
          </div>
          <div>
            <MonoLabel as="p" className="mb-3">Badge</MonoLabel>
            <div className="flex items-center gap-2">
              <Badge>12</Badge>
              <Badge tone="accent">Ativo</Badge>
              <Badge tone="danger">Atrasado</Badge>
            </div>
          </div>
        </Card>
      </Section>

      {/* ── 06 · BOTÕES ──────────────────────────────────── */}
      <Section n="06" title="Botões · 4 variantes × 5 estados">
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                <th />
                {['repouso', 'hover', 'foco', 'carregando', 'desabilitado'].map((s) => (
                  <th key={s} className="mono-micro text-n-500 text-left pb-3">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(['primary', 'secondary', 'ghost', 'destructive'] as const).map((v) => (
                <tr key={v} className="border-t border-line">
                  <td className="mono-micro text-n-500 pr-4 py-3">{v}</td>
                  <td className="py-3 pr-3"><Button variant={v} size="sm">Salvar</Button></td>
                  <td className="py-3 pr-3"><Button variant={v} size="sm" style={HOVER_STYLE[v]}>Salvar</Button></td>
                  {/* O anel do foco é wine-700 nas QUATRO variantes — inclusive
                      na destrutiva, que já carrega vermelho na borda. */}
                  <td className="py-3 pr-3"><Button variant={v} size="sm" className="outline-2 outline-offset-2 outline-wine-700">Salvar</Button></td>
                  <td className="py-3 pr-3"><Button variant={v} size="sm" loading>Salvar</Button></td>
                  <td className="py-3"><Button variant={v} size="sm" disabled>Salvar</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-caption text-n-500 mt-4">
            Todos em pílula, com o `active:scale-[0.97]` como resposta de toque. `destructive` usa
            --danger (laranja-avermelhado), nunca a escala wine — senão “Cancelar
            atendimento” fica indistinguível de “Confirmar”. O <strong>anel de foco é
            sempre wine-700</strong>, mesmo no destrutivo: vermelho ali faria o teclado
            parecer que a ação já disparou.
          </p>
        </Card>
      </Section>

      {/* ── 07 · ARQUÉTIPO 1 ─────────────────────────────── */}
      <Section
        n="07"
        title="Arquétipo 1 · Régua temporal"
        note="O status vira uma barra à esquerda do bloco, em vez de colorir o bloco inteiro e transformar o dia num mosaico. Os ticks de régua saíram: a hora é marcada pelo rótulo e pelo espaço. O tracejado ficou só no slot livre — é o único lugar do produto onde ele ainda significa alguma coisa."
      >
        <Card className="overflow-hidden">
          <div className="flex items-baseline justify-between mb-4">
            <MonoLabel>Qui · 27 ago · 4 agendamentos</MonoLabel>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-px bg-[color:var(--color-signal)]" />
                <span className="mono-micro text-n-500">agora</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 border-t border-dashed border-line-strong" />
                <span className="mono-micro text-n-500">livre</span>
              </span>
            </div>
          </div>
          <TimeRuler
            startHour={8}
            endHour={20}
            now="14:20"
            events={[
              { id: 'a', start: '09:00', end: '10:30', title: 'Limpeza de pele', meta: 'Marina R.', tone: 'success' },
              { id: 'b', start: '11:00', end: '11:30', title: 'Design de sobrancelha', meta: 'Júlia P.', tone: 'success' },
              { id: 'c', start: '15:00', end: '16:00', title: 'Peeling de diamante', meta: 'Ana L.', tone: 'warning' },
              { id: 'd', start: '17:00', end: '18:00', title: 'Massagem modeladora', meta: 'Carla S.', tone: 'danger' },
            ]}
            slots={[
              { id: 's1', start: '13:00', end: '14:00' },
              { id: 's2', start: '18:30', end: '19:30' },
            ]}
          />
        </Card>
      </Section>

      {/* ── 08 · ARQUÉTIPO 2 ─────────────────────────────── */}
      <Section
        n="08"
        title="Arquétipo 2 · Tabela densa"
        note="Linha de 56px, cabeçalho sticky em 12px cinza, sem zebra e sem borda externa (ela vive dentro de um card), numérico à direita com dígito de largura fixa, ações reveladas no hover da linha. É isto que substitui os 17 cartazes empilhados de /dashboard/services."
      >
        <Card pad="p-0" className="overflow-hidden">
          <TechTable
            rows={ROWS}
            rowKey={(r) => r.id}
            initialSort={{ key: 'nome', dir: 'asc' }}
            columns={[
              { key: 'nome', header: 'Serviço', cell: (r) => <span className="text-ink">{r.nome}</span>, sortValue: (r) => r.nome },
              { key: 'dur', header: 'Duração', num: true, cell: (r) => `${r.dur}min`, sortValue: (r) => r.dur },
              { key: 'valor', header: 'Valor', num: true, cell: (r) => <span className="num font-semibold">{brl(r.valor)}</span>, sortValue: (r) => r.valor },
              { key: 'vis', header: 'Visível', hideOnMobile: true, cell: (r) => <StatusLabel tone={r.visivel ? 'success' : 'neutral'}>{r.visivel ? 'Sim' : 'Não'}</StatusLabel> },
              {
                key: 'status', header: 'Status', cell: (r) => (
                  <StatusLabel tone={r.status === 'ativo' ? 'success' : r.status === 'inativo' ? 'neutral' : 'warning'}>
                    {r.status}
                  </StatusLabel>
                ),
              },
            ]}
            actions={() => (
              <>
                <Button variant="ghost" size="sm" iconOnly aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" iconOnly aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
              </>
            )}
          />
        </Card>
      </Section>

      {/* ── 09 · ARQUÉTIPO 3 ─────────────────────────────── */}
      <Section
        n="09"
        title="Arquétipo 3 · Painel de índices"
        note="Os oito cards de KPI, cada um com seu iconezinho num quadradinho cinza, viram UMA superfície dividida por hairline. Sem ícone: o rótulo “Ticket médio” já diz o que o cifrãozinho diria."
      >
        <IndexGrid
          items={[
            { label: 'Faturamento', value: 'R$ 12.480', delta: { pct: 12.4 } },
            { label: 'Atendimentos', value: '86', format: 'mono', delta: { pct: 4.1 } },
            { label: 'Ticket médio', value: 'R$ 145', delta: { pct: -2.3 } },
            { label: 'Ocupação', value: '78%', format: 'mono', delta: { pct: 0 } },
            { label: 'Novas clientes', value: '14', format: 'mono', hint: 'no período' },
            { label: 'Recorrência', value: '62%', format: 'mono', delta: { pct: 3.8 } },
            { label: 'Cancelamentos', value: '5', format: 'mono', delta: { pct: 20, good: false } },
            { label: 'A receber', value: 'R$ 2.310', accent: true, hint: '4 em aberto' },
          ]}
        />

        <Card className="mt-4">
          <div className="flex items-baseline justify-between mb-4">
            <MonoLabel>Receita · últimos 7 dias</MonoLabel>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-px bg-wine-700" /><span className="mono-micro text-n-500">realizado</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 border-t border-dashed border-line-strong" /><span className="mono-micro text-n-500">previsto</span>
              </span>
            </div>
          </div>
          <TechChart
            labels={['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']}
            unit="R$"
            format={(v) => Math.round(v / 100) / 10 + 'k'}
            series={[
              { name: 'Realizado', values: [1200, 1850, 1400, 2200, 2600, 3100, 900] },
              { name: 'Previsto', style: 'dashed', color: 'var(--color-n-400)', values: [1400, 1700, 1600, 2000, 2400, 2900, 1200] },
            ]}
          />
        </Card>
      </Section>

      {/* ── 10 · ARQUÉTIPO 4 ─────────────────────────────── */}
      <Section n="10" title="Arquétipo 4 · Formulário e controles">
        <div className="grid gap-4 lg:grid-cols-2 items-start">
          <Card>
            <MonoLabel as="p" className="mb-4">Segmented control</MonoLabel>
            <Segmented
              ariaLabel="Período"
              items={[
                { key: 'dia', label: 'Dia' },
                { key: 'semana', label: 'Semana' },
                { key: 'mes', label: 'Mês' },
                { key: 'ano', label: 'Ano' },
              ]}
              value={seg}
              onChange={setSeg}
            />
            <p className="text-caption text-n-500 mt-3">
              Trilho cinza em pílula, opções em pílula, ativo em vinho chapado. É o
              controle mais visível das referências e o que mais rápido diz “2026”.
            </p>
            <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
              <div>
                <p className="text-body-sm text-ink">Aceitar agendamento online</p>
                <p className="text-caption text-n-500">Trilho em pílula, botão redondo, 28×48.</p>
              </div>
              <Toggle checked={tog} onChange={setTog} label="Aceitar agendamento online" />
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <Field label="Nome do serviço" inputProps={{ placeholder: 'Limpeza de pele profunda', defaultValue: '' }} />
              <Field label="Duração" hint="Em minutos. Usada para calcular o encaixe na agenda." inputProps={{ placeholder: '90' }} />
              <Field label="Valor" error="Informe um valor maior que zero." inputProps={{ placeholder: 'R$ 0,00', defaultValue: '0' }} />
            </div>
            <p className="text-caption text-n-500 mt-4">
              O campo com erro mantém a borda em --danger, mas o anel de foco continua
              wine-700 como em qualquer outro: a borda comunica o erro, o anel comunica
              a posição do teclado.
            </p>
          </Card>
        </div>
      </Section>

      {/* ── 11 · ARQUÉTIPO 5 ─────────────────────────────── */}
      <Section
        n="11"
        title="Arquétipo 5 · Conversa"
        note="O canto reto é o que carrega a linguagem aqui: raio macio em três cantos e 90° do lado do autor. Um único canto diferente dá direção e autoria sem setinha, sem cor extra e sem repetir avatar em cada linha."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr] items-start">
          {/* lista à esquerda — pilha no mobile */}
          <Card pad="p-0" className="overflow-hidden">
            <div className="px-4 py-2.5 border-b border-line">
              <MonoLabel>Conversas · 3 abertas</MonoLabel>
            </div>
            {[
              { n: 'Marina Rodrigues', m: 'Perfeito, confirmo às 14h', t: '14:02', tone: 'signal' as const, live: true },
              { n: 'Júlia Prado', m: 'Consegue encaixar quinta?', t: '11:48', tone: 'warning' as const },
              { n: 'Ana Lima', m: 'Obrigada!', t: 'ONTEM', tone: 'neutral' as const },
            ].map((c, i) => (
              <button
                key={c.n}
                className={`w-full text-left px-4 py-3 border-b border-line last:border-b-0 transition-ui hover:bg-n-50 ${
                  i === 0 ? 'bg-wine-50' : ''
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-body-sm text-heading font-semibold truncate">{c.n}</span>
                  <MonoValue className="text-micro text-n-400 shrink-0">{c.t}</MonoValue>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-caption text-n-500 truncate">{c.m}</span>
                  <StatusDot tone={c.tone} live={c.live} />
                </div>
              </button>
            ))}
          </Card>

          {/* conversa à direita */}
          <Card className="flex flex-col">
            <div className="flex items-center justify-between border-b border-line -mx-4 sm:-mx-5 px-4 sm:px-5 pb-3">
              <div>
                <p className="text-body-sm text-heading font-semibold">Marina Rodrigues</p>
                <StatusLabel tone="signal" live>Digitando</StatusLabel>
              </div>
              <span className="icon-chip"><Search className="h-4 w-4" /></span>
            </div>

            <Thread className="py-5">
              <DateDivider>QUI · 27 AGO</DateDivider>
              <Bubble time="13:52">
                Oi! Consigo remarcar minha limpeza de pele para as 14h?
              </Bubble>
              <Bubble mine time="13:58" status="✓✓">
                Oi Marina! Consigo sim — acabou de abrir esse horário.
              </Bubble>
              <Bubble time="14:02">Perfeito, confirmo às 14h 🙌</Bubble>
              <Bubble mine time="14:03" status="✓">
                Remarcado. Te mando o lembrete uma hora antes.
              </Bubble>
            </Thread>

            <Composer
              leading={
                <Button variant="ghost" size="md" iconOnly aria-label="Anexar">
                  <Paperclip className="h-[18px] w-[18px]" />
                </Button>
              }
              action={
                <Button size="md" iconOnly aria-label="Enviar">
                  <Send className="h-[18px] w-[18px]" />
                </Button>
              }
            />
          </Card>
        </div>
      </Section>

      {/* ── 12 · ARQUÉTIPO 6 ─────────────────────────────── */}
      <Section
        n="12"
        title="Arquétipo 6 · Configuração"
        note="Seções separadas por divisória de ponta a ponta, título em 18px, controle alinhado à direita. Sem card dentro de card — a moldura aninhada é o que faz a tela de ajustes parecer uma pilha de caixas."
      >
        <Card>
          <SettingsSection title="Identidade" description="Como sua marca aparece na página pública.">
            <Field label="Nome da marca" inputProps={{ defaultValue: 'Studio Lume' }} />
          </SettingsSection>
          <SettingsSection title="Agendamento" description="Regras de encaixe e antecedência.">
            <div className="flex items-center justify-between">
              <p className="text-body-sm text-ink">Exigir sinal de 30%</p>
              <Toggle checked={false} onChange={() => {}} label="Exigir sinal" />
            </div>
          </SettingsSection>
        </Card>
      </Section>

      {/* ── 13 · ESTADOS ─────────────────────────────────── */}
      <Section n="13" title="Estado vazio e esqueleto">
        <div className="grid gap-4 lg:grid-cols-2 items-start">
          <Card pad="p-4">
            <EmptyState
              title="Nenhum serviço cadastrado"
              description="Cadastre o primeiro procedimento para que ele apareça na sua página de agendamento."
              actionText="Novo serviço"
              onAction={() => {}}
            />
          </Card>
          <div className="space-y-4">
            <TableSkeleton rows={4} />
            <Card>
              <MonoLabel as="p" className="mb-3">Revelação de dados</MonoLabel>
              <div className="space-y-2">
                <div className="h-px bg-line draw-line" />
                <div className="h-px bg-line draw-line" style={{ animationDelay: '60ms' }} />
                <div className="h-px bg-line draw-line" style={{ animationDelay: '120ms' }} />
              </div>
              <p className="text-caption text-n-500 mt-3">
                A hairline desenha de 0 a 100% em 220ms, uma vez só, no primeiro render.
                Dentro do bloco de prefers-reduced-motion, que zera a duração.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-3 flex-1" />
              </div>
            </Card>
          </div>
        </div>
      </Section>

      <footer className="border-t border-line pt-5">
        <MonoTrail items={['Lume', 'Styleguide', 'Rodada 4', new Date().getFullYear()]} />
      </footer>
    </div>
  );
}

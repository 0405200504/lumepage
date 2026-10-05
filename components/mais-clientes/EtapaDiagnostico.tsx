'use client';

import React, { useRef, useState } from 'react';
import { Instagram, MapPin, ScanSearch, Loader2, Copy, ChevronDown, CheckCircle2, Trophy, TriangleAlert, KeyRound, RotateCcw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { diagnosticarAction, marcarItemAction, marcarConexaoAction } from '@/app/actions/mais-clientes';
import { itensDe } from '@/lib/mais-clientes/tutoriais';
import { notaDosItens } from '@/lib/mais-clientes/regras';
import type { DiagItem, DiagPlataforma, GrowthDiagnosis, ItemStatus, TipoConexao } from '@/types/mais-clientes';
import type { PropsEtapa } from './Jornada';
import { prepararFoto } from './imagem';

const STATUS: Record<ItemStatus, { rotulo: string; classe: string }> = {
  ok: { rotulo: 'Está ótimo', classe: 'bg-success-bg text-success' },
  dica: { rotulo: 'Está ótimo · dica', classe: 'bg-success-bg text-success' },
  ajustar: { rotulo: 'Ajustar', classe: 'bg-warning-bg text-warning' },
  falta: { rotulo: 'Falta', classe: 'bg-danger-bg text-danger' },
  nao_visto: { rotulo: 'Não deu para ver', classe: 'bg-n-100 text-n-600' },
};

const COMO_TIRAR_PRINT = {
  instagram: ['Abra o Instagram e vá no seu perfil (sua foto, no canto de baixo).', 'Tire um print da tela mostrando foto, nome, bio, botões e destaques.', 'Role um pouco e tire outro print do começo do seu feed.'],
  google: ['Abra o Google Maps e pesquise o nome do seu negócio.', 'Toque no seu perfil e tire um print da parte de cima (nome, nota, fotos, horário).', 'Role e tire mais um print mostrando serviços, avaliações e atualizações.'],
};

function ItemDiag({ item, plataforma, onMarcar }: { item: DiagItem; plataforma: 'instagram' | 'google'; onMarcar: (feito: boolean) => void }) {
  const { success } = useToast();
  const precisa = item.status === 'ajustar' || item.status === 'falta';
  const [aberto, setAberto] = useState(precisa && !item.feito);
  const tut = itensDe(plataforma).find(i => i.id === item.id);
  const st = STATUS[item.status];
  return (
    <li className={`rounded-card ring-1 ring-inset p-4 ${item.feito ? 'ring-success-border bg-success-bg/40' : 'ring-line'}`}>
      <button type="button" onClick={() => setAberto(a => !a)} className="w-full flex items-center gap-3 text-left" aria-expanded={aberto}>
        <span className={`shrink-0 rounded-pill px-2.5 py-1 text-caption font-semibold ${st.classe}`}>{item.feito ? 'Feito' : st.rotulo}</span>
        <span className="flex-1 min-w-0 text-body-sm font-semibold text-heading">{item.titulo}</span>
        <ChevronDown className={`h-4 w-4 text-n-400 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>
      {aberto && (
        <div className="mt-3 space-y-3 text-body-sm">
          <p className="text-n-700"><span className="font-semibold text-heading">O que vimos: </span>{item.o_que_vimos}</p>
          {tut && <p className="text-n-600">{tut.porque}</p>}
          {item.sugestao && (
            <div className="rounded-chip bg-n-50 p-3">
              <p className="text-caption font-semibold text-n-500">{item.status === 'dica' ? 'Dica (opcional, não tira nota)' : 'Sugestão'}</p>
              <p className="mt-1 text-heading whitespace-pre-line">{item.sugestao}</p>
              <button type="button" className="mt-2 inline-flex items-center gap-1.5 text-caption font-semibold text-wine-700 hover:underline"
                onClick={() => { navigator.clipboard?.writeText(item.sugestao); success('Copiado', 'Agora é só colar no app.'); }}>
                <Copy className="h-3.5 w-3.5" /> Copiar texto
              </button>
            </div>
          )}
          {tut && (precisa || item.status === 'dica') && (
            <div>
              <p className="text-caption font-semibold text-n-500">Como fazer</p>
              <ol className="mt-1.5 space-y-1.5 list-decimal pl-5 text-n-700">{tut.passos.map(p => <li key={p}>{p}</li>)}</ol>
            </div>
          )}
          {precisa && (
            <label className="flex items-center gap-2 text-body-sm text-heading">
              <input type="checkbox" className="accent-[var(--color-wine-700)]" checked={item.feito} onChange={e => onMarcar(e.target.checked)} /> Já ajustei
            </label>
          )}
        </div>
      )}
    </li>
  );
}

function Painel({ professionalId, plataforma, dados, onDiagnosis }: {
  professionalId: string;
  plataforma: 'instagram' | 'google';
  dados?: DiagPlataforma;
  onDiagnosis: (d: GrowthDiagnosis) => void;
}) {
  const { error } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [analisando, setAnalisando] = useState(false);
  const Icone = plataforma === 'instagram' ? Instagram : MapPin;
  const nome = plataforma === 'instagram' ? 'Instagram' : 'Google';

  const analisar = async (files: FileList | null) => {
    if (!files?.length) return;
    setAnalisando(true);
    try {
      const fd = new FormData();
      for (const f of Array.from(files).slice(0, 3)) {
        const { blob } = await prepararFoto(f);
        fd.append('prints', new File([blob], 'print.jpg', { type: 'image/jpeg' }));
      }
      const r = await diagnosticarAction(professionalId, plataforma, fd);
      if (!r.success) error('Não deu', r.error); else onDiagnosis(r.diagnosis);
    } catch (e) {
      error('Não deu', e instanceof Error ? e.message : 'Tente de novo.');
    } finally {
      setAnalisando(false);
      if (input.current) input.current.value = '';
    }
  };

  const marcar = async (itemId: string, feito: boolean) => {
    const r = await marcarItemAction(professionalId, plataforma, itemId, feito);
    if (r.success) onDiagnosis(r.diagnosis); else error('Não deu', r.error);
  };

  const resumo = dados ? notaDosItens(dados.itens) : null;
  const pendentes = dados ? dados.itens.filter(i => (i.status === 'ajustar' || i.status === 'falta') && !i.feito).length : 0;
  const naoVistos = dados ? dados.itens.filter(i => i.status === 'nao_visto') : [];

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h3 text-heading flex items-center gap-2"><Icone className="h-5 w-5 text-wine-700" /> {nome}</h2>
        {dados && <Button size="sm" variant="ghost" leadingIcon={<RotateCcw className="h-4 w-4" />} loading={analisando} onClick={() => input.current?.click()}>Analisar de novo</Button>}
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={e => analisar(e.target.files)} />

      {!dados && (
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] items-center">
          <ol className="list-decimal pl-5 space-y-1.5 text-body-sm text-n-700">{COMO_TIRAR_PRINT[plataforma].map(p => <li key={p}>{p}</li>)}</ol>
          <Button onClick={() => input.current?.click()} loading={analisando} leadingIcon={<ScanSearch className="h-4 w-4" />}>
            {analisando ? 'Analisando…' : 'Enviar prints e analisar'}
          </Button>
        </div>
      )}
      {analisando && !dados && <p className="mt-3 text-caption text-n-500 flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> A análise leva uns 20 segundos.</p>}

      {dados && !dados.perfil_valido && (
        <p className="mt-4 rounded-chip bg-warning-bg text-warning p-3 text-body-sm flex gap-2"><TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" /> Os prints não parecem ser do seu perfil no {nome}. Tire os prints de novo seguindo os passos e analise outra vez.</p>
      )}

      {dados && dados.perfil_valido && (
        <>
          <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
            <p className="text-display text-heading leading-none">{dados.nota.toLocaleString('pt-BR')}<span className="text-h3 text-n-400">/10</span></p>
            <p className="text-body-sm text-n-700 max-w-xl">{dados.resumo}</p>
          </div>
          {resumo?.dezDeDez ? (
            <p className="mt-4 rounded-chip bg-success-bg text-success p-3 text-body-sm font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 shrink-0" /> 10/10: seu {nome} já está alinhado. Pode seguir para a próxima fase.</p>
          ) : pendentes === 0 ? (
            <p className="mt-4 rounded-chip bg-success-bg text-success p-3 text-body-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" /> Você marcou todos os ajustes como feitos. Quando quiser, analise de novo para confirmar.</p>
          ) : null}
          {naoVistos.length > 0 && (
            <p className="mt-3 text-caption text-n-500">
              {naoVistos.length === 1 ? 'Um item não apareceu' : `${naoVistos.length} itens não apareceram`} nos prints e ficou fora da nota ({naoVistos.map(i => i.titulo.toLowerCase()).join(', ')}). Se quiser conferir, mande também um print dessa parte e analise de novo.
            </p>
          )}
          <ul className="mt-5 space-y-2.5">
            {dados.itens.map(i => <ItemDiag key={i.id} item={i} plataforma={plataforma} onMarcar={f => marcar(i.id, f)} />)}
          </ul>
        </>
      )}
    </section>
  );
}

function PassoAcesso({ titulo, feito, onFeito, rotuloFeito = 'Já dei o acesso', valor, rotuloValor, zapSuporte, links, passos }: {
  titulo: string; feito: boolean; onFeito: (f: boolean) => void; rotuloFeito?: string;
  /** O que ela cola (ID ou e-mail da Lume). Ausente = passo sem valor para copiar. */
  valor?: string; rotuloValor?: string; zapSuporte: string;
  links: { href: string; texto: string }[]; passos: string[];
}) {
  const { success } = useToast();
  return (
    <div className={`rounded-card ring-1 ring-inset p-4 sm:p-5 flex flex-col gap-3 ${feito ? 'ring-success-border bg-success-bg/40' : 'ring-line'}`}>
      <p className="text-body-sm font-semibold text-heading">{titulo}</p>
      <ol className="list-decimal pl-5 space-y-1.5 text-body-sm text-n-700">{passos.map(p => <li key={p}>{p}</li>)}</ol>
      {rotuloValor === undefined ? null : valor ? (
        <div className="rounded-chip bg-n-50 px-3.5 py-3 flex flex-wrap items-center justify-between gap-2">
          <span className="min-w-0">
            <span className="block text-caption text-n-500">{rotuloValor}</span>
            <span className="block text-body font-semibold text-heading font-mono break-all">{valor}</span>
          </span>
          <button type="button" className="inline-flex items-center gap-1.5 rounded-pill bg-surface ring-1 ring-inset ring-line-strong/70 px-3.5 py-2 text-caption font-semibold text-heading hover:bg-n-25"
            onClick={() => { navigator.clipboard?.writeText(valor); success('Copiado', `${rotuloValor} copiado. Agora é só colar.`); }}>
            <Copy className="h-3.5 w-3.5" /> Copiar
          </button>
        </div>
      ) : (
        <p className="rounded-chip bg-warning-bg text-warning px-3.5 py-3 text-body-sm">
          O {rotuloValor.toLowerCase()} ainda não foi cadastrado pela equipe.{' '}
          {zapSuporte ? <a href={zapSuporte} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Peça pelo WhatsApp</a> : 'Peça para a equipe Lume.'}
        </p>
      )}
      {links.map((l, i) => (
        <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer"
          className={`inline-flex items-center justify-center gap-2 rounded-pill px-4 py-2.5 text-body-sm font-semibold transition-ui ${i === 0
            ? 'bg-wine-700 text-white hover:bg-wine-800'
            : 'bg-surface text-heading ring-1 ring-inset ring-line-strong/70 hover:bg-n-25'}`}>
          <ExternalLink className="h-4 w-4" /> {l.texto}
        </a>
      ))}
      <label className="flex items-center gap-2 text-body-sm text-heading">
        <input type="checkbox" className="accent-[var(--color-wine-700)]" checked={feito} onChange={e => onFeito(e.target.checked)} /> {rotuloFeito}
      </label>
    </div>
  );
}

export function EtapaDiagnostico({ professionalId, programa, setPrograma, avancar, acesso }: PropsEtapa) {
  const { error } = useToast();
  const d = programa.diagnosis;
  const onDiagnosis = (diagnosis: GrowthDiagnosis) => setPrograma(p => ({ ...p, diagnosis }));
  const conexao = async (tipo: TipoConexao, feito: boolean) => {
    const r = await marcarConexaoAction(professionalId, tipo, feito);
    if (r.success) onDiagnosis(r.diagnosis); else error('Não deu', r.error);
  };
  const prontos = !!d?.instagram?.perfil_valido && !!d?.google?.perfil_valido;

  return (
    <div className="space-y-6">
      <Painel professionalId={professionalId} plataforma="instagram" dados={d?.instagram} onDiagnosis={onDiagnosis} />
      <Painel professionalId={professionalId} plataforma="google" dados={d?.google} onDiagnosis={onDiagnosis} />

      <section className="card p-5 sm:p-6">
        <h2 className="text-h3 text-heading flex items-center gap-2"><KeyRound className="h-5 w-5 text-wine-700" /> Dar acesso à equipe Lume</h2>
        <p className="mt-1 text-body-sm text-n-600 max-w-3xl">
          Os anúncios rodam na sua própria conta de anúncios: a verba vai direto de você para a Meta, no seu cartão ou por Pix,
          e a Lume cobra só a assessoria. Com o acesso, a equipe coloca os anúncios no ar e ajusta o seu Google. Você não passa
          senha nenhuma, continua dona das contas e pode tirar a Lume quando quiser, no mesmo lugar onde deu o acesso.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <PassoAcesso
            titulo="1. Sua conta de anúncios (Meta)"
            feito={!!d?.conexoes?.conta_anuncios}
            onFeito={f => conexao('conta_anuncios', f)}
            rotuloFeito="Tenho conta de anúncios com forma de pagamento"
            zapSuporte={acesso.zapSuporte}
            links={[
              { href: 'https://business.facebook.com/settings/ad-accounts', texto: 'Abrir minhas contas de anúncios' },
              { href: 'https://business.facebook.com/billing_hub/payment_settings', texto: 'Abrir Cobrança e pagamentos' },
            ]}
            passos={[
              'Toque no primeiro botão abaixo (no computador fica mais fácil). Se aparecer mais de uma empresa, escolha a sua.',
              'Já tem conta de anúncios? Pule para o passo 4. Se não tiver, clique em "Adicionar" e em "Criar uma nova conta de anúncios".',
              'Dê o nome do seu negócio, escolha o fuso horário de São Paulo e a moeda Real brasileiro, e conclua.',
              'No segundo botão, em "Cobrança e pagamentos", coloque o seu cartão ou adicione saldo por Pix. A cobrança sai no seu nome.',
            ]}
          />
          <PassoAcesso
            titulo="2. Acesso da Lume no Instagram e no Facebook"
            feito={!!d?.conexoes?.meta_parceira}
            onFeito={f => conexao('meta_parceira', f)}
            valor={acesso.metaBusinessId}
            rotuloValor="ID da Lume"
            zapSuporte={acesso.zapSuporte}
            links={[{ href: 'https://business.facebook.com/settings/partners', texto: 'Abrir Parceiros no Meta Business Suite' }]}
            passos={[
              'Toque no botão abaixo para abrir a tela de Parceiros (no computador fica mais fácil). Se aparecer mais de uma empresa, escolha a sua.',
              'Clique em "Adicionar" e escolha "Conceder acesso aos seus ativos a um parceiro".',
              'Cole o ID da Lume que está aqui embaixo e clique em "Avançar".',
              'Marque a sua Página do Facebook e o seu Instagram com acesso total, e a sua conta de anúncios com acesso para gerenciar campanhas e ver o desempenho. Confirme.',
            ]}
          />
          <PassoAcesso
            titulo="3. Acesso da Lume no Google"
            feito={!!d?.conexoes?.google_gerente}
            onFeito={f => conexao('google_gerente', f)}
            valor={acesso.googleEmail}
            rotuloValor="E-mail da Lume"
            zapSuporte={acesso.zapSuporte}
            links={[{ href: 'https://business.google.com/', texto: 'Abrir meu Perfil da Empresa' }]}
            passos={[
              'Toque no botão abaixo, entrando com a conta do Google que cuida do seu perfil. No celular, também dá pelo Google Maps: sua foto → "Seu Perfil da Empresa".',
              'Toque nos três pontinhos (⋮) e em "Configurações do perfil" → "Pessoas e acesso".',
              'Toque em "Adicionar" e cole o e-mail da Lume que está aqui embaixo.',
              'Escolha "Gerente" e toque em "Convidar". A equipe aceita o convite e te avisa.',
            ]}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button disabled={!prontos} onClick={avancar}>{prontos ? 'Seguir para o canal de clientes' : 'Analise o Instagram e o Google para seguir'}</Button>
      </div>
    </div>
  );
}

export default EtapaDiagnostico;
